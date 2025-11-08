#!/bin/bash
# Vegeta Stress Test
# High load test to find breaking points

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Running Vegeta Stress Test..."
echo "Base URL: $BASE_URL"
echo "Duration: 3m"
echo "Rate: 200 req/sec"
echo ""

# Create targets file with actual BASE_URL
cat > /tmp/vegeta-targets.txt <<EOF
GET ${BASE_URL}/health
GET ${BASE_URL}/api/users
GET ${BASE_URL}/api/products
EOF

# Run vegeta attack with high rate
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=200 \
  -duration=3m \
  -timeout=10s \
  -workers=20 \
  | tee results.bin \
  | vegeta report

# Generate additional reports
echo ""
echo "=== Detailed Report ==="
vegeta report -type=text results.bin

echo ""
echo "=== Latency Percentiles ==="
vegeta report -type=json results.bin | jq '{
  mean: .latencies.mean,
  p50: .latencies."50th",
  p95: .latencies."95th",
  p99: .latencies."99th",
  max: .latencies.max
}'

echo ""
echo "=== Error Analysis ==="
vegeta report -type=json results.bin | jq '{
  total_requests: .requests,
  success_ratio: .success_ratio,
  status_codes: .status_codes
}'

# Cleanup
rm -f /tmp/vegeta-targets.txt results.bin

echo ""
echo "Stress test completed!"
