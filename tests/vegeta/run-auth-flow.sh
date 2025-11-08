#!/bin/bash
# Vegeta Authentication Flow Test
# Tests login, authenticated requests, and logout

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Running Vegeta Authentication Flow Test..."
echo "Base URL: $BASE_URL"
echo ""

# Step 1: Login and get token
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "ERROR: Failed to get authentication token"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "Successfully logged in. Token acquired."
echo ""

# Step 2: Test authenticated endpoints
echo "Step 2: Testing authenticated endpoints..."

# Create targets file with authentication
cat > /tmp/vegeta-auth-targets.txt <<EOF
GET ${BASE_URL}/api/auth/verify
@Authorization: Bearer ${TOKEN}

GET ${BASE_URL}/api/users
@Authorization: Bearer ${TOKEN}

GET ${BASE_URL}/api/products
@Authorization: Bearer ${TOKEN}
EOF

# Run authenticated requests
vegeta attack \
  -targets=/tmp/vegeta-auth-targets.txt \
  -rate=10 \
  -duration=30s \
  -timeout=5s \
  | tee results.bin \
  | vegeta report

echo ""
echo "=== Authenticated Requests Report ==="
vegeta report -type=json results.bin | jq '{
  total_requests: .requests,
  success_ratio: .success_ratio,
  latency_mean: .latencies.mean,
  latency_p95: .latencies."95th"
}'

# Step 3: Logout
echo ""
echo "Step 3: Logging out..."
LOGOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/logout" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Logout response: $LOGOUT_RESPONSE"
echo ""

# Step 4: Verify token is invalidated
echo "Step 4: Verifying token invalidation..."
VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/auth/verify" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "401" ]; then
    echo "✓ Token successfully invalidated (HTTP 401)"
else
    echo "✗ Token still valid (HTTP $HTTP_STATUS)"
fi

# Cleanup
rm -f /tmp/vegeta-auth-targets.txt results.bin

echo ""
echo "Authentication flow test completed!"
