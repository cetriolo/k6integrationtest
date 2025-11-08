# API Documentation

Complete API documentation for the K6 Integration Test Project.

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [Protected Endpoints](#protected-endpoints)
- [File Operations](#file-operations)
- [Error Responses](#error-responses)
- [Testing Guide](#testing-guide)

## Base URL

Local: `http://localhost:8080`

## Authentication

### Overview

The API uses JWT (JSON Web Tokens) for authentication. Tokens are valid for 1 hour from issuance.

### Available Credentials

| Username | Password   | Role  |
|----------|-----------|-------|
| admin    | admin123  | Admin |
| user     | user123   | User  |
| test     | test123   | Test  |

### Login Flow

1. **POST /api/auth/login** - Get JWT token
2. Include token in `Authorization` header for protected endpoints
3. **POST /api/auth/logout** - Invalidate token (optional)

---

## Public Endpoints

### Health Check

Check if the API is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "time": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl http://localhost:8080/health
```

---

### Get Users

Retrieve list of users.

**Endpoint:** `GET /api/users`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Mario Rossi",
    "email": "mario@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Laura Bianchi",
    "email": "laura@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:8080/api/users
```

---

### Get Products

Retrieve list of products.

**Endpoint:** `GET /api/products`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Laptop",
    "price": 999.99,
    "stock": 15
  },
  {
    "id": 2,
    "name": "Mouse",
    "price": 29.99,
    "stock": 100
  }
]
```

**Example:**
```bash
curl http://localhost:8080/api/products
```

---

### Login

Authenticate and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Protected Endpoints

All protected endpoints require an `Authorization` header with Bearer token.

**Header Format:**
```
Authorization: Bearer <your-jwt-token>
```

### Verify Authentication

Verify that your token is valid.

**Endpoint:** `GET /api/auth/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "authenticated": true,
  "username": "admin",
  "message": "Token is valid"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Missing authorization header"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

---

### Logout

Invalidate your JWT token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Token has been invalidated"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## File Operations

### Upload File

Upload a file to the server. Files are stored with a unique name format: `{username}_{timestamp}_{hash}{extension}`

**Endpoint:** `POST /api/files/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
Form field: file
Max size: 10MB
```

**Success Response (201 Created):**
```json
{
  "filename": "admin_20240115_103000_a1b2c3d4e5f6.txt",
  "size": 2048,
  "message": "File uploaded successfully"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "File too large or invalid form"
}
```

**401 Unauthorized:**
```json
{
  "error": "Missing authorization header"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to save file"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.txt"
```

---

### Download File

Download a previously uploaded file.

**Endpoint:** `GET /api/files/download/{filename}`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename={filename}`
- Body: File contents

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid filename"
}
```

**401 Unauthorized:**
```json
{
  "error": "Missing authorization header"
}
```

**404 Not Found:**
```json
{
  "error": "File not found"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
FILENAME="admin_20240115_103000_a1b2c3d4e5f6.txt"

curl http://localhost:8080/api/files/download/$FILENAME \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded_file.txt
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | Wrong HTTP method |
| 500 | Internal Server Error | Server error |

---

## Testing Guide

### Complete Authentication Flow

```bash
# 1. Login
RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

# 2. Extract token
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 3. Verify authentication
curl http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"

# 4. Access protected resource
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"

# 5. Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# 6. Verify token is invalidated (should fail)
curl http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

### File Upload and Download Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. Upload file
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt")

echo $UPLOAD_RESPONSE

# 3. Extract filename
FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.filename')
echo "Uploaded filename: $FILENAME"

# 4. Download file
curl http://localhost:8080/api/files/download/$FILENAME \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.txt

# 5. Verify download
cat downloaded.txt

# 6. Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. In production, consider implementing:

- Rate limiting per IP address
- Rate limiting per user
- Request throttling
- DDoS protection

---

## Security Considerations

### Current Implementation

- JWT tokens expire after 1 hour
- Tokens are blacklisted on logout
- File uploads limited to 10MB
- Directory traversal protection on downloads
- HMAC-SHA256 signing for JWT

### Recommendations for Production

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Secure JWT Secret** - Use a strong, randomly generated secret
3. **Token Storage** - Implement Redis or database for token blacklist
4. **File Validation** - Add file type and content validation
5. **Database** - Replace in-memory user store with real database
6. **Rate Limiting** - Implement request rate limiting
7. **Input Validation** - Add comprehensive input validation
8. **Logging** - Implement security logging and monitoring
9. **CORS** - Configure CORS properly for web clients
10. **Headers** - Add security headers (CSP, HSTS, etc.)

---

## API Versioning

Current version: `v1` (implicit)

Future versions will use URL versioning:
- `/api/v1/users`
- `/api/v2/users`

---

## Support

For issues or questions:
- Check the main README.md
- Review test files for examples
- Open an issue on GitHub
