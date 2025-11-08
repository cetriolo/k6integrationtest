#!/bin/bash
# Vegeta Load Test
# Sustained load test to measure performance under normal conditions

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Running Vegeta Load Test..."
echo "Base URL: $BASE_URL"
echo "Duration: 2m"
echo "Rate: 50 req/sec"
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
  -rate=50 \
  -duration=2m \
  -timeout=5s \
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
echo "=== Success Rate ==="
vegeta report -type=json results.bin | jq -r '.success_ratio'

# Generate HTML plot if gnuplot is available
if command -v gnuplot &> /dev/null; then
    vegeta plot results.bin > load-test-plot.html
    echo "Plot saved to load-test-plot.html"
fi

# Cleanup
rm -f /tmp/vegeta-targets.txt results.bin

echo ""
echo "Load test completed!"
