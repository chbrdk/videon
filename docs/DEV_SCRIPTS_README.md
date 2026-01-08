# PrismVid Development Scripts

## 🚀 Schnellstart

### Alle Services starten
```bash
./start-dev.sh
```

### Alle Services stoppen
```bash
./stop-dev.sh
```

## 📊 Service URLs

Nach dem Start sind die folgenden Services verfügbar:

| Service | Port | URL | Beschreibung |
|---------|------|-----|--------------|
| **Frontend** | 3000 | http://localhost:3000 | SvelteKit Web Interface |
| **Backend** | 4001 | http://localhost:4001 | Node.js API Server |
| **Analyzer** | 5678 | http://localhost:5678 | Python FastAPI Video Analyzer |
| **Saliency** | 8002 | http://localhost:8002 | Python FastAPI Saliency Detection |
| **Audio Separation** | 8003 | http://localhost:8003 | Python FastAPI Audio Separation |
| **Qwen VL** | 8081 | http://localhost:8081 | Python FastAPI Semantic Video Analysis (MLX) |

## 📝 Logs

Alle Service-Logs befinden sich in:
```
/Volumes/DOCKER_EXTERN/prismvid/logs/
```

### Logs anzeigen
```bash
# Alle Logs
tail -f logs/*.log

# Einzelne Logs
tail -f logs/backend.log
tail -f logs/frontend.log
tail -f logs/analyzer.log
tail -f logs/saliency.log
tail -f logs/audio-separation.log
tail -f logs/qwen-vl.log
```

## 🔧 Was passiert beim Start?

1. **Backend** (Node.js + TypeScript)
   - Startet auf Port 4001
   - Verwendet `npm run dev` (tsx watch)

2. **Frontend** (SvelteKit + Vite)
   - Startet auf Port 3000
   - Verwendet `npm run dev`

3. **Analyzer** (Python + FastAPI)
   - Erstellt virtuelle Umgebung (falls nötig)
   - Installiert Dependencies
   - Startet auf Port 5678

4. **Saliency Service** (Python + FastAPI)
   - Erstellt virtuelle Umgebung (falls nötig)
   - Installiert Dependencies
   - Startet auf Port 8002

5. **Audio Separation Service** (Python + FastAPI)
   - Erstellt virtuelle Umgebung (falls nötig)
   - Installiert Dependencies
   - Startet auf Port 8003

6. **Qwen VL Service** (Python 3.12 + FastAPI + MLX)
   - Erstellt virtuelle Umgebung `.venv312` (falls nötig)
   - Installiert Dependencies (inkl. MLX)
   - Startet auf Port 8081
   - Verwendet MLX für Apple Silicon Optimierung

## 🛠️ Wichtige Befehle

### Services neu starten
```bash
./stop-dev.sh && ./start-dev.sh
```

### Service-Status prüfen
```bash
# Health Check
curl http://localhost:4001/api/health

# Service-Status
curl http://localhost:4001/api/services/status
```

### Prozess-Status prüfen
```bash
ps aux | grep -E "tsx|vite|uvicorn"
```

### Ports prüfen
```bash
lsof -i :3000 -i :4001 -i :5678 -i :8002 -i :8003 -i :8081
```

## 🐛 Troubleshooting

### Ports bereits belegt
```bash
# Gefährlicher Prozess finden
lsof -i :PORT

# Prozess beenden
kill -9 PID
```

### Virtual Environment neu erstellen
```bash
cd packages/SERVICE_NAME
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules neu installieren
```bash
cd packages/SERVICE_NAME
rm -rf node_modules
npm install
```

## 📦 Python Dependencies

Die Scripts erstellen automatisch virtuelle Umgebungen für:
- `packages/analyzer/venv`
- `packages/saliency-service/venv`
- `packages/audio-separation-service/venv`
- `packages/qwen-vl-service/.venv312` (Python 3.12)

## 🔄 Auto-Reload

Alle Services unterstützen Hot-Reload:
- **Backend**: tsx watch
- **Frontend**: Vite HMR
- **Python Services**: uvicorn --reload

## 📍 Projektstruktur

```
prismvid/
├── packages/
│   ├── backend/          # Node.js Backend
│   ├── frontend/         # SvelteKit Frontend
│   ├── analyzer/         # Python Analyzer
│   ├── saliency-service/ # Python Saliency
│   └── audio-separation-service/ # Python Audio
├── storage/              # Persistierte Daten
├── logs/                 # Service-Logs
├── start-dev.sh          # Start-Script
└── stop-dev.sh           # Stop-Script
```

