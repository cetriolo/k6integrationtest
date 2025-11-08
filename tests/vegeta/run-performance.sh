#!/bin/bash
# Vegeta Performance Test
# Comprehensive performance test with ramp-up and sustained load

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Running Vegeta Performance Test..."
echo "Base URL: $BASE_URL"
echo ""

# Create targets file with actual BASE_URL
cat > /tmp/vegeta-targets.txt <<EOF
GET ${BASE_URL}/health
GET ${BASE_URL}/api/users
GET ${BASE_URL}/api/products
EOF

# Phase 1: Warm-up (30s at 10 req/s)
echo "Phase 1: Warm-up (30s at 10 req/s)"
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=10 \
  -duration=30s \
  -timeout=5s \
  | vegeta report

sleep 2

# Phase 2: Ramp-up (1m at 50 req/s)
echo ""
echo "Phase 2: Ramp-up (1m at 50 req/s)"
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=50 \
  -duration=1m \
  -timeout=5s \
  | tee results-phase2.bin \
  | vegeta report

sleep 2

# Phase 3: Peak load (2m at 100 req/s)
echo ""
echo "Phase 3: Peak load (2m at 100 req/s)"
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=100 \
  -duration=2m \
  -timeout=5s \
  -workers=10 \
  | tee results-phase3.bin \
  | vegeta report

sleep 2

# Phase 4: Sustained load (2m at 75 req/s)
echo ""
echo "Phase 4: Sustained load (2m at 75 req/s)"
vegeta attack \
  -targets=/tmp/vegeta-targets.txt \
  -rate=75 \
  -duration=2m \
  -timeout=5s \
  | tee results-phase4.bin \
  | vegeta report

# Generate comprehensive report
echo ""
echo "=== Performance Test Summary ==="
echo ""
echo "Phase 2 (Ramp-up) Report:"
vegeta report -type=json results-phase2.bin | jq '{
  success_ratio: .success_ratio,
  latency_p95: .latencies."95th",
  latency_p99: .latencies."99th"
}'

echo ""
echo "Phase 3 (Peak Load) Report:"
vegeta report -type=json results-phase3.bin | jq '{
  success_ratio: .success_ratio,
  latency_p95: .latencies."95th",
  latency_p99: .latencies."99th"
}'

echo ""
echo "Phase 4 (Sustained Load) Report:"
vegeta report -type=json results-phase4.bin | jq '{
  success_ratio: .success_ratio,
  latency_p95: .latencies."95th",
  latency_p99: .latencies."99th"
}'

# Cleanup
rm -f /tmp/vegeta-targets.txt results-*.bin

echo ""
echo "Performance test completed!"
