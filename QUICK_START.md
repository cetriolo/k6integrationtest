# Quick Start Guide

Get started with the K6 Integration Test Project in 5 minutes!

## Prerequisites

- Go 1.23+ installed
- Docker and Docker Compose (optional)
- Git

## Option 1: Local Development (Fastest)

### Step 1: Build and Run

```bash
# Build the application
go build -o api-server main.go

# Run the server
./api-server
```

The server will start on `http://localhost:8080`

### Step 2: Test the API

```bash
# Health check
curl http://localhost:8080/health

# Get users
curl http://localhost:8080/api/users

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Your token: $TOKEN"

# Verify authentication
curl http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

## Option 2: Docker (Recommended)

### Step 1: Build and Run with Docker

```bash
# Build and start
docker-compose up --build

# Or run in background
docker-compose up -d
```

### Step 2: Access Services

- API Server: http://localhost:8080
- Grafana: http://localhost:3000 (admin/admin)
- InfluxDB: http://localhost:8086

### Step 3: Test the API

```bash
curl http://localhost:8080/health
```

## Testing with K6

### Install K6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Run Your First Test

```bash
# Smoke test (1 minute)
k6 run tests/smoke-test.js

# Load test (4 minutes)
k6 run tests/load-test.js

# Auth flow test
k6 run tests/auth-flow-test.js

# File operations test
k6 run tests/file-operations-test.js
```

## Testing with Vegeta

### Install Vegeta

**macOS:**
```bash
brew install vegeta
```

**Linux:**
```bash
wget https://github.com/tsenart/vegeta/releases/download/v12.11.1/vegeta_12.11.1_linux_amd64.tar.gz
tar xzf vegeta_12.11.1_linux_amd64.tar.gz
sudo mv vegeta /usr/local/bin/
```

### Run Your First Test

```bash
cd tests/vegeta

# Smoke test
bash run-smoke.sh

# Auth flow test
bash run-auth-flow.sh

# File operations test
bash run-file-operations.sh
```

## Complete Example: Upload and Download a File

```bash
#!/bin/bash

# 1. Login
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"

# 2. Create a test file
echo "This is a test file" > test.txt

# 3. Upload file
echo "Uploading file..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt")

echo "Upload response: $UPLOAD_RESPONSE"

# 4. Extract filename
FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.filename')
echo "Filename: $FILENAME"

# 5. Download file
echo "Downloading file..."
curl -s http://localhost:8080/api/files/download/$FILENAME \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.txt

# 6. Verify
echo "Downloaded content:"
cat downloaded.txt

# 7. Logout
echo "Logging out..."
curl -s -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

echo "Done!"
```

Save this as `test-flow.sh`, make it executable, and run it:

```bash
chmod +x test-flow.sh
./test-flow.sh
```

## GitHub Actions

Your project is ready for CI/CD! Tests will run automatically on:

- Push to main or develop branches
- Pull requests to main
- Manual workflow dispatch

To run tests manually:

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "K6 Performance Tests" or "Vegeta Performance Tests"
4. Click "Run workflow"
5. Choose test type
6. Click "Run workflow" button

## Next Steps

1. **Explore API endpoints** - See `API_DOCUMENTATION.md`
2. **Run all tests** - Try different test types
3. **View metrics** - Use Grafana dashboard at http://localhost:3000
4. **Customize tests** - Edit test files in `tests/` directory
5. **Read full docs** - Check `README.md` for complete documentation

## Troubleshooting

### Server won't start

```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Tests fail

```bash
# Make sure server is running
curl http://localhost:8080/health

# Check server logs
docker-compose logs api-server

# Run test with verbose output
k6 run --verbose tests/smoke-test.js
```

### Docker issues

```bash
# Stop all containers
docker-compose down

# Clean up
docker system prune -a

# Rebuild
docker-compose up --build
```

## Common Commands

```bash
# Start server locally
go run main.go

# Build binary
go build -o api-server main.go

# Start with Docker
docker-compose up

# Stop Docker
docker-compose down

# Run smoke test
k6 run tests/smoke-test.js

# Run Vegeta test
cd tests/vegeta && bash run-smoke.sh

# View logs
docker-compose logs -f api-server

# Check health
curl http://localhost:8080/health
```

## Available Credentials

| Username | Password   |
|----------|-----------|
| admin    | admin123  |
| user     | user123   |
| test     | test123   |

## Test Types

- **Smoke Test**: Quick validation (1 min)
- **Load Test**: Normal load (4 min)
- **Stress Test**: High load (9 min)
- **Performance Test**: Comprehensive (8 min)
- **Auth Flow Test**: Authentication testing (2 min)
- **File Operations Test**: File upload/download testing (2 min)

## Support

- **Full Documentation**: `README.md`
- **API Reference**: `API_DOCUMENTATION.md`
- **Issues**: Open an issue on GitHub

---

**You're all set! Start testing your API!** 🚀
