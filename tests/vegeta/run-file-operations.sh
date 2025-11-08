#!/bin/bash
# Vegeta File Operations Test
# Tests file upload and download with authentication

BASE_URL="${BASE_URL:-http://localhost:8080}"
TEST_FILE="${TEST_FILE:-../../testfiles/sample.txt}"

echo "Running Vegeta File Operations Test..."
echo "Base URL: $BASE_URL"
echo "Test file: $TEST_FILE"
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

echo "Successfully logged in."
echo ""

# Step 2: Upload file
echo "Step 2: Uploading file..."
UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/files/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_FILE}")

FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.filename')

if [ -z "$FILENAME" ] || [ "$FILENAME" == "null" ]; then
    echo "ERROR: Failed to upload file"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "File uploaded successfully: $FILENAME"
echo ""

# Step 3: Perform load test on file downloads
echo "Step 3: Load testing file downloads..."

# Create targets file for download
cat > /tmp/vegeta-download-targets.txt <<EOF
GET ${BASE_URL}/api/files/download/${FILENAME}
@Authorization: Bearer ${TOKEN}
EOF

# Run download load test
vegeta attack \
  -targets=/tmp/vegeta-download-targets.txt \
  -rate=20 \
  -duration=30s \
  -timeout=10s \
  | tee results.bin \
  | vegeta report

echo ""
echo "=== Download Performance Report ==="
vegeta report -type=json results.bin | jq '{
  total_requests: .requests,
  success_ratio: .success_ratio,
  throughput: .throughput,
  latency_mean: .latencies.mean,
  latency_p95: .latencies."95th",
  bytes_in: .bytes_in
}'

# Step 4: Test multiple uploads under load
echo ""
echo "Step 4: Load testing file uploads..."

UPLOAD_COUNT=10
SUCCESS_COUNT=0

for i in $(seq 1 $UPLOAD_COUNT); do
    RESPONSE=$(curl -s -X POST "${BASE_URL}/api/files/upload" \
      -H "Authorization: Bearer ${TOKEN}" \
      -F "file=@${TEST_FILE}" \
      -w "\nHTTP_STATUS:%{http_code}")

    STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

    if [ "$STATUS" == "201" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi

    echo -n "."
done

echo ""
echo "Upload test completed: $SUCCESS_COUNT/$UPLOAD_COUNT successful"
echo ""

# Step 5: Logout
echo "Step 5: Logging out..."
curl -s -X POST "${BASE_URL}/api/auth/logout" \
  -H "Authorization: Bearer ${TOKEN}" > /dev/null

# Cleanup
rm -f /tmp/vegeta-download-targets.txt results.bin

echo ""
echo "File operations test completed!"
