# Lokale Entwicklungsumgebung – VIDEON

## Schnellstart

```bash
# 1. Services starten
./start-dev.sh

# 2. Services stoppen
./stop-dev.sh
```

## Voraussetzungen

- **PostgreSQL** auf `localhost:5432` (Datenbank `videon`, User `videon`, Passwort `videon_dev`)
- **Redis** auf `localhost:6379`
- **Node.js** 18+
- **Python** 3.9+ (Analyzer, Saliency, Audio-Separation)
- **Python** 3.12 (Qwen VL Service)
- **Swift** (Vision Service, macOS)

## Service-URLs (nach Start)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3010/videon (oder 3011, 3012 wenn Port belegt) |
| Backend | http://localhost:4001 |
| Analyzer | http://localhost:5678 |
| Saliency | http://localhost:8002 |
| Audio Separation | http://localhost:8003 |
| Vision | http://localhost:8080 |
| Qwen VL | http://localhost:8081 |

## PostgreSQL & Redis lokal starten

**Hinweis:** Wenn Ports 5432/6379 bereits belegt sind (z.B. durch Audion), nutzt VIDEON 5433/6380.

### Mit Docker (OrbStack/Docker Desktop)

```bash
# Ports 5433/6380 falls 5432/6379 belegt
docker run -d --name videon-postgres -p 5433:5432 \
  -e POSTGRES_USER=videon -e POSTGRES_PASSWORD=videon_dev -e POSTGRES_DB=videon \
  postgres:15

docker run -d --name videon-redis -p 6380:6379 redis:7
```

Danach in `.env`: `DATABASE_URL=...localhost:5433...` und `REDIS_URL=redis://localhost:6380`

### Mit Homebrew (macOS)

```bash
brew services start postgresql@15
brew services start redis

# Datenbank erstellen
createdb videon
psql -c "CREATE USER videon WITH PASSWORD 'videon_dev';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE videon TO videon;"
```

## Konfiguration

- **`.env`** – Umgebungsvariablen (Storage-Pfade, Ports, API-Keys)
- **`config/environment.json`** – Service-URLs für Development

## Bekannte Hinweise

- `start-dev.sh` und `stop-dev.sh` nutzen den Projektpfad dynamisch (kein Hardcoding mehr)
- Backend lädt `.env` aus dem Projektroot
- `VITE_DEV_BYPASS_AUTH=true` – Auth-Bypass für lokale Entwicklung ohne Backend
