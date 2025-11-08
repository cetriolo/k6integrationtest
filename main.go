package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Configuration
const (
	jwtSecret     = "your-secret-key-change-in-production"
	uploadDir     = "./uploads"
	maxUploadSize = 10 << 20 // 10 MB
)

// Data structures
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string `json:"token"`
	Message string `json:"message"`
}

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type FileUploadResponse struct {
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Message  string `json:"message"`
}

// Token blacklist for logout functionality
var (
	tokenBlacklist = make(map[string]bool)
	blacklistMu    sync.RWMutex
)

// Simple user database (in production, use a real database)
var users = map[string]string{
	"admin": "admin123",
	"user":  "user123",
	"test":  "test123",
}

func main() {
	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatal("Failed to create uploads directory:", err)
	}

	// Public endpoints
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/users", usersHandler)
	http.HandleFunc("/api/products", productsHandler)
	http.HandleFunc("/api/auth/login", loginHandler)
	http.HandleFunc("/api/auth/logout", authMiddleware(logoutHandler))

	// Protected endpoints
	http.HandleFunc("/api/files/upload", authMiddleware(uploadHandler))
	http.HandleFunc("/api/files/download/", authMiddleware(downloadHandler))
	http.HandleFunc("/api/auth/verify", authMiddleware(verifyHandler))

	log.Println("Server started on :8080")
	log.Println("Endpoints:")
	log.Println("  - GET  /health")
	log.Println("  - GET  /api/users")
	log.Println("  - GET  /api/products")
	log.Println("  - POST /api/auth/login")
	log.Println("  - POST /api/auth/logout (requires auth)")
	log.Println("  - GET  /api/auth/verify (requires auth)")
	log.Println("  - POST /api/files/upload (requires auth)")
	log.Println("  - GET  /api/files/download/{filename} (requires auth)")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// Middleware
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "Missing authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			respondWithError(w, http.StatusUnauthorized, "Invalid authorization format")
			return
		}

		// Check if token is blacklisted
		blacklistMu.RLock()
		if tokenBlacklist[tokenString] {
			blacklistMu.RUnlock()
			respondWithError(w, http.StatusUnauthorized, "Token has been invalidated")
			return
		}
		blacklistMu.RUnlock()

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			respondWithError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		// Store username in request context (simple way)
		r.Header.Set("X-Username", claims.Username)
		next(w, r)
	}
}

// Handlers
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	// Simulate some load
	time.Sleep(50 * time.Millisecond)

	users := []User{
		{ID: 1, Name: "Mario Rossi", Email: "mario@example.com", CreatedAt: time.Now()},
		{ID: 2, Name: "Laura Bianchi", Email: "laura@example.com", CreatedAt: time.Now()},
		{ID: 3, Name: "Giuseppe Verdi", Email: "giuseppe@example.com", CreatedAt: time.Now()},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	// Simulate some load
	time.Sleep(30 * time.Millisecond)

	products := []Product{
		{ID: 1, Name: "Laptop", Price: 999.99, Stock: 15},
		{ID: 2, Name: "Mouse", Price: 29.99, Stock: 100},
		{ID: 3, Name: "Tastiera", Price: 79.99, Stock: 50},
		{ID: 4, Name: "Monitor", Price: 299.99, Stock: 25},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var loginReq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate credentials
	password, exists := users[loginReq.Username]
	if !exists || password != loginReq.Password {
		respondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Create JWT token
	expirationTime := time.Now().Add(1 * time.Hour)
	claims := &Claims{
		Username: loginReq.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		Token:   tokenString,
		Message: "Login successful",
	})
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	authHeader := r.Header.Get("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Add token to blacklist
	blacklistMu.Lock()
	tokenBlacklist[tokenString] = true
	blacklistMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logout successful",
	})
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	username := r.Header.Get("X-Username")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"authenticated": true,
		"username":      username,
		"message":       "Token is valid",
	})
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Limit upload size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondWithError(w, http.StatusBadRequest, "File too large or invalid form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Failed to get file from request")
		return
	}
	defer file.Close()

	// Create a unique filename using hash
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to process file")
		return
	}

	// Reset file pointer for copying
	if _, err := file.Seek(0, 0); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to process file")
		return
	}

	hashString := hex.EncodeToString(hash.Sum(nil))[:16]
	ext := filepath.Ext(header.Filename)
	username := r.Header.Get("X-Username")
	filename := fmt.Sprintf("%s_%s_%s%s", username, time.Now().Format("20060102_150405"), hashString, ext)

	// Create the file
	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create file")
		return
	}
	defer dst.Close()

	// Copy the file
	size, err := io.Copy(dst, file)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(FileUploadResponse{
		Filename: filename,
		Size:     size,
		Message:  "File uploaded successfully",
	})
}

func downloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract filename from URL path
	filename := strings.TrimPrefix(r.URL.Path, "/api/files/download/")
	if filename == "" {
		respondWithError(w, http.StatusBadRequest, "Filename required")
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		respondWithError(w, http.StatusBadRequest, "Invalid filename")
		return
	}

	filepath := filepath.Join(uploadDir, filename)

	// Check if file exists
	fileInfo, err := os.Stat(filepath)
	if err != nil {
		if os.IsNotExist(err) {
			respondWithError(w, http.StatusNotFound, "File not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Failed to access file")
		return
	}

	// Open the file
	file, err := os.Open(filepath)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to open file")
		return
	}
	defer file.Close()

	// Set headers
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Stream the file
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("Error streaming file: %v", err)
	}
}

// Helper functions
func respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
