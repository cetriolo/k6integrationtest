# API Server con Test K6 Performance

Sistema completo di API REST in Go con suite di test di performance utilizzando K6 di Grafana.

## 🚀 Quick Start

### Prerequisiti
- Go 1.21+
- Docker (opzionale)
- K6 (per test locali)

### Avvio Rapido

```bash
# 1. Avvia il server
go run main.go

# 2. In un altro terminale, esegui uno smoke test
k6 run tests/smoke-test.js
```

## 📋 Contenuti del Progetto

```
.
├── main.go                    # Server API Go
├── Dockerfile                 # Container Docker
├── docker-compose.yml         # Stack completo con monitoring
├── Makefile                   # Comandi automation
├── README.md                  # Questa guida
├── .github/
│   └── workflows/
│       └── k6-tests.yml      # Pipeline CI/CD GitHub Actions
└── tests/
    ├── smoke-test.js         # Test funzionalità base
    ├── load-test.js          # Test carico normale
    ├── stress-test.js        # Test limiti sistema
    └── performance-test.js   # Analisi performance dettagliata
```

## 🔧 Installazione

### Setup Locale

```bash
# Clona il repository
git clone <your-repo>
cd <your-repo>

# Installa K6
make install-k6

# Oppure manualmente:
# Mac: brew install k6
# Linux: sudo apt-get install k6
# Windows: choco install k6
```

### Setup Docker

```bash
# Build immagine
make docker-build

# Avvia container
make docker-run

# Verifica stato
make check-health
```

### Stack Completo (con Monitoring)

```bash
# Avvia API + InfluxDB + Grafana
make docker-compose-up

# Accedi:
# - API: http://localhost:8080
# - Grafana: http://localhost:3000 (admin/admin)
# - InfluxDB: http://localhost:8086
```

## 🎯 API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/users` | GET | Lista utenti (simula 50ms latency) |
| `/api/products` | GET | Lista prodotti (simula 30ms latency) |

### Esempi

```bash
# Health check
curl http://localhost:8080/health

# Ottieni utenti
curl http://localhost:8080/api/users

# Ottieni prodotti
curl http://localhost:8080/api/products
```

## 🧪 Test di Performance

### Comandi Makefile

```bash
# Test singoli
make test-smoke        # Smoke test (1 min)
make test-load         # Load test (9 min)
make test-stress       # Stress test (23 min)
make test-performance  # Performance test (5 min)

# Esegui tutti i test
make test-all
```

### Comandi K6 Diretti

```bash
# Test locale
k6 run tests/smoke-test.js

# Test con URL custom
k6 run -e BASE_URL=http://your-server.com tests/smoke-test.js

# Con output JSON
k6 run --out json=results.json tests/load-test.js

# Con output InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 tests/performance-test.js
```

## 📊 Tipi di Test

### 1. Smoke Test (1 VU, 1 min)
Verifica funzionalità base con carico minimo.
```bash
make test-smoke
```

**Usa quando:**
- Dopo ogni commit
- Prima di deploy
- Come gate CI/CD

### 2. Load Test (50 VU, 9 min)
Valuta performance sotto carico normale di produzione.
```bash
make test-load
```

**Usa quando:**
- Test settimanali
- Validazione SLA
- Confronto versioni

### 3. Stress Test (100-300 VU, 23 min)
Trova limiti e breaking points del sistema.
```bash
make test-stress
```

**Usa quando:**
- Pianificazione capacità
- Pre Black Friday/eventi
- Validazione scalabilità

### 4. Performance Test (20-100 VU, 5 min)
Analisi dettagliata con metriche custom e report.
```bash
make test-performance
```

**Usa quando:**
- Ottimizzazione codice
- Identificazione bottleneck
- Benchmark versioni

## 🔄 Integrazione CI/CD

### GitHub Actions

La pipeline si attiva automaticamente su:
- Push su `main` o `develop`
- Pull request verso `main`
- Trigger manuale

#### Esecuzione Manuale

1. Vai su **Actions** nel repository
2. Seleziona **K6 Performance Tests**
3. Click su **Run workflow**
4. Scegli tipo di test: `smoke`, `load`, `stress`, `performance`, o `all`

#### Configurazione Ambiente Remoto

Per testare ambiente di produzione:

1. Vai su **Settings → Secrets → Actions**
2. Aggiungi secret: `PROD_URL`
3. Valore: `https://your-production-url.com`

I test su ambiente remoto si eseguono solo su branch `main`.

## 📈 Interpretazione Risultati

### Output K6

```
✓ http_req_duration..............: avg=245ms  min=102ms  med=230ms  max=1.2s   p(90)=420ms  p(95)=487ms
✓ http_req_failed................: 0.12%
✓ http_reqs......................: 15234 (253.9/s)
✓ checks.........................: 99.88%
  vus............................: 50
  vus_max........................: 50
```

### Metriche Chiave

| Metrica | Descrizione | Soglia Consigliata |
|---------|-------------|-------------------|
| `http_req_duration` | Tempo risposta | p95 < 500ms |
| `http_req_failed` | % richieste fallite | < 1% |
| `http_reqs` | Richieste/secondo | > 100 |
| `checks` | % validazioni passed | > 99% |

### Criteri Pass/Fail

**✅ Test Passato:**
- Tutti i threshold sono rispettati
- Error rate < 1%
- Performance costanti

**❌ Test Fallito:**
- Uno o più threshold superati
- Error rate > 5%
- Degradazione progressiva

## 🐛 Troubleshooting

### Server non risponde
```bash
# Verifica se è in esecuzione
ps aux | grep api-server

# Controlla logs
docker logs api-server

# Test manuale
curl -v http://localhost:8080/health
```

### Test K6 falliscono
```bash
# Abilita debug
k6 run --verbose tests/smoke-test.js

# Controlla URL
k6 run -e BASE_URL=http://localhost:8080 tests/smoke-test.js

# Verifica connettività
curl http://localhost:8080/health
```

### Container Docker problematici
```bash
# Riavvia tutto
make docker-stop
make docker-run

# Oppure con compose
make docker-compose-down
make docker-compose-up

# Logs
docker logs -f api-server
```

## 🌟 Punti di Forza di K6

1. **Scripting in JavaScript** - Sintassi familiare
2. **Performance** - Scritto in Go, estremamente veloce
3. **Metriche built-in** - Analisi complete out-of-the-box
4. **Thresholds** - Criteri pass/fail automatici
5. **CLI-first** - Perfetto per CI/CD
6. **Cloud-ready** - Integrazione con K6 Cloud
7. **Output flessibili** - JSON, InfluxDB, CSV, etc.
8. **Open source** - Community attiva

## 📚 Risorse

- [Guida Completa K6](./GUIDA_K6.md)
- [Documentazione K6](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [Community Forum](https://community.k6.io/)

## 🤝 Contribuire

1. Fork il progetto
2. Crea branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📝 License

MIT License - vedi file LICENSE per dettagli

## 💡 Pro Tips

- Inizia sempre con smoke test prima di eseguire test più pesanti
- Non testare mai produzione senza autorizzazione esplicita
- Monitora risorse server durante i test
- Salva risultati per confronti futuri
- Esegui test in orari di basso traffico
- Aumenta gradualmente il carico nei test

---

**Nota:** Questa è un'applicazione di esempio per dimostrare le capacità di K6. Adattala alle tue esigenze specifiche!