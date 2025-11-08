#!/bin/bash
# Vegeta Smoke Test
# Low volume, short duration test to verify basic functionality

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Running Vegeta Smoke Test..."
echo "Base URL: $BASE_URL"
echo "Duration: 30s"
echo "Rate: 1 req/sec"
echo ""

# Create targets file with actual BASE_URL
cat > /tmp/vegeta-targets.txt <<EOF
GET ${BASE_URL}/health
GET ${BASE_URL}/api/users
GET ${BASE_URL}/api/products
EOF

# Run vegeta attack
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=1 \
  -duration=30s \
  -timeout=5s \
  | tee results.bin \
  | vegeta report

# Generate additional reports
echo ""
echo "=== Detailed Report ==="
vegeta report -type=text results.bin

echo ""
echo "=== Success Rate ==="
vegeta report -type=json results.bin | jq -r '.success_ratio'

# Cleanup
rm -f /tmp/vegeta-targets.txt results.bin

echo ""
echo "Smoke test completed!"
