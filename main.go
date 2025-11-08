package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

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

func main() {
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/users", usersHandler)
	http.HandleFunc("/api/products", productsHandler)

	log.Println("Server avviato su :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	// Simula un po' di carico
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
	// Simula un po' di carico
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
