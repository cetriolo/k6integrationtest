# Build stage
FROM golang:1.25.1-alpine AS builder

WORKDIR /app

# Copia i file del progetto
COPY main.go .

# Compila l'applicazione
RUN go build -o api-server main.go

# Run stage
FROM alpine:latest

WORKDIR /app

# Copia l'eseguibile dalla build stage
COPY --from=builder /app/api-server .

# Espone la porta 8080
EXPOSE 8080

# Comando per avviare l'applicazione
CMD ["./api-server"]