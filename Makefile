.PHONY: help build run test-smoke test-load test-stress test-performance test-all docker-build docker-run docker-stop clean

# Variabili
APP_NAME=api-server
DOCKER_IMAGE=api-server:latest
BASE_URL?=http://localhost:8080

help: ## Mostra questo messaggio di aiuto
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Compila l'applicazione Go
	@echo "🔨 Compilazione applicazione..."
	go build -o $(APP_NAME) main.go
	@echo "✅ Compilazione completata!"

run: build ## Avvia il server in locale
	@echo "🚀 Avvio server su :8080..."
	./$(APP_NAME)

test-smoke: ## Esegue smoke test
	@echo "🚬 Esecuzione Smoke Test..."
	k6 run -e BASE_URL=$(BASE_URL) tests/smoke-test.js

test-load: ## Esegue load test
	@echo "📈 Esecuzione Load Test..."
	k6 run -e BASE_URL=$(BASE_URL) tests/load-test.js

test-stress: ## Esegue stress test
	@echo "💪 Esecuzione Stress Test..."
	k6 run -e BASE_URL=$(BASE_URL) tests/stress-test.js

test-performance: ## Esegue performance test
	@echo "⚡ Esecuzione Performance Test..."
	k6 run -e BASE_URL=$(BASE_URL) tests/performance-test.js

test-all: ## Esegue tutti i test in sequenza
	@echo "🎯 Esecuzione di tutti i test..."
	@$(MAKE) test-smoke
	@$(MAKE) test-load
	@$(MAKE) test-stress
	@$(MAKE) test-performance
	@echo "✅ Tutti i test completati!"

docker-build: ## Build immagine Docker
	@echo "🐳 Build immagine Docker..."
	docker build -t $(DOCKER_IMAGE) .
	@echo "✅ Immagine Docker creata!"

docker-run: docker-build ## Avvia container Docker
	@echo "🚀 Avvio container Docker..."
	docker run -d -p 8080:8080 --name $(APP_NAME) $(DOCKER_IMAGE)
	@echo "✅ Container avviato su http://localhost:8080"

docker-stop: ## Ferma e rimuove container Docker
	@echo "🛑 Arresto container..."
	docker stop $(APP_NAME) || true
	docker rm $(APP_NAME) || true
	@echo "✅ Container fermato!"

docker-compose-up: ## Avvia stack con docker-compose
	@echo "🚀 Avvio stack completo..."
	docker-compose up -d
	@echo "✅ Stack avviato!"
	@echo "API: http://localhost:8080"
	@echo "Grafana: http://localhost:3000 (admin/admin)"
	@echo "InfluxDB: http://localhost:8086"

docker-compose-down: ## Ferma stack docker-compose
	@echo "🛑 Arresto stack..."
	docker-compose down
	@echo "✅ Stack fermato!"

clean: ## Pulizia file temporanei
	@echo "🧹 Pulizia..."
	rm -f $(APP_NAME)
	rm -f *.json
	rm -f server.pid
	@echo "✅ Pulizia completata!"

install-k6: ## Installa K6 (Linux/Mac)
	@echo "📦 Installazione K6..."
	@if [ "$$(uname)" = "Darwin" ]; then \
		brew install k6; \
	elif [ "$$(uname)" = "Linux" ]; then \
		sudo gpg -k; \
		sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69; \
		echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list; \
		sudo apt-get update; \
		sudo apt-get install k6; \
	else \
		echo "Sistema operativo non supportato. Installa K6 manualmente."; \
	fi
	@echo "✅ K6 installato!"

check-health: ## Verifica stato del server
	@echo "🔍 Controllo salute server..."
	@curl -s $(BASE_URL)/health | jq .
	@echo "✅ Server operativo!"