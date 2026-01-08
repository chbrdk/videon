# PrismVid Quick Start Guide

## 🚀 Schnellstart in 5 Minuten

### Voraussetzungen

- **macOS** (für Vision Service)
- **Node.js** 18+
- **Python** 3.11+
- **Swift** 5.9+
- **Docker** (optional)

### 1. Repository Setup

```bash
# Repository klonen
git clone <repository-url>
cd prismvid

# Dependencies installieren
npm install
pnpm install
```

### 2. Services starten

#### Option A: Alle Services einzeln starten

```bash
# Terminal 1: Vision Service
cd packages/vision-service
swift run VisionService

# Terminal 2: Backend Service
cd packages/backend
npm start

# Terminal 3: Analyzer Service
cd packages/analyzer
python -m uvicorn src.api.server:app --host 0.0.0.0 --port 5678

# Terminal 4: Frontend Development Server
cd packages/frontend
npm run dev
```

#### Option B: Docker Compose (Empfohlen)

```bash
# Alle Services mit Docker starten
docker-compose up -d

# Status prüfen
docker-compose ps
```

### 3. System testen

```bash
# Health Checks
curl http://localhost:8080/health  # Vision Service
curl http://localhost:4001/health  # Backend
curl http://localhost:5678/health  # Analyzer
curl http://localhost:8081/health  # Qwen VL

# Frontend öffnen
open http://localhost:3000
```

### 4. Erste Vision-Analyse testen

```bash
# Test-Bild erstellen
python3 -c "
from PIL import Image
img = Image.new('RGB', (400, 300), color='red')
img.save('/tmp/test-image.jpg', 'JPEG')
print('Test image created')
"

# Vision-Analyse durchführen
curl -X POST http://localhost:8080/analyze/vision \
  -H "Content-Type: application/json" \
  -d '{"sceneId": "test-scene-1", "keyframePath": "/tmp/test-image.jpg"}'
```

## 📋 Service URLs

| Service | URL | Beschreibung |
|---------|-----|--------------|
| **Frontend** | http://localhost:3000 | Web Interface |
| **Backend API** | http://localhost:4001 | REST API |
| **Analyzer API** | http://localhost:5678 | Video Processing |
| **Qwen VL API** | http://localhost:8081 | Semantic Video Analysis (MLX) |
| **Vision API** | http://localhost:8080 | Apple Vision Framework |

## 🔧 Wichtige Commands

### Services starten/stoppen

```bash
# Alle Services stoppen
pkill -f "node\|python\|swift"

# Docker Services stoppen
docker-compose down

# Einzelne Services neu starten
cd packages/[service-name] && npm start  # oder swift run
```

### Logs anzeigen

```bash
# Docker Logs
docker-compose logs -f [service-name]

# Lokale Logs (wenn verfügbar)
tail -f logs/*.log
```

### Tests ausführen

```bash
# Frontend Tests
cd packages/frontend && npm test

# Backend Tests
cd packages/backend && npm test

# Analyzer Tests
cd packages/analyzer && pytest

# Vision Service Tests
cd packages/vision-service && swift test
```

## 🎯 Erste Schritte

### 1. Video hochladen

1. Öffne http://localhost:3000
2. Klicke auf "Upload Video"
3. Wähle eine Video-Datei aus
4. Warte auf Upload-Completion

### 2. Vision-Analyse triggern

1. Gehe zur Video-Detail-Seite
2. Klicke auf "Vision Analysis" Button
3. Warte auf Analyse-Completion
4. Siehe Vision-Tags in der Scene-Liste

### 3. API direkt testen

```bash
# Video Upload (Backend)
curl -X POST http://localhost:4001/api/videos/upload \
  -F "video=@/path/to/video.mp4"

# Qwen VL Analyse starten
curl -X POST http://localhost:4001/api/videos/video-123/qwenVL/analyze

# Qwen VL Status abrufen
curl http://localhost:4001/api/videos/video-123/qwenVL/status

# Vision Analysis (Vision Service)
curl -X POST http://localhost:8080/analyze/vision \
  -H "Content-Type: application/json" \
  -d '{"sceneId": "scene-123", "keyframePath": "/path/to/keyframe.jpg"}'
```

## 🔍 Debugging

### Häufige Probleme

1. **Port bereits belegt**
   ```bash
   # Alle Prozesse beenden
   pkill -f "node\|python\|swift"
   docker-compose down
   ```

2. **Vision Service nicht erreichbar**
   ```bash
   # Service Status prüfen
   ps aux | grep VisionService
   
   # Neu starten
   cd packages/vision-service && swift run VisionService
   ```

3. **Database Connection Error**
   ```bash
   # PostgreSQL Status
   pg_isready -h localhost -p 5432
   
   # Docker Database
   docker-compose up -d postgres
   ```

### Debug-Modus

```bash
# Frontend mit Debug-Logs
cd packages/frontend && DEBUG=* npm run dev

# Backend mit Debug-Logs
cd packages/backend && DEBUG=* npm start

# Vision Service mit Verbose-Logs
cd packages/vision-service && swift run VisionService --verbose
```

## 📊 System-Status prüfen

```bash
# Alle Services Health Check
curl http://localhost:4001/health && \
curl http://localhost:5678/health && \
curl http://localhost:8081/health && \
curl http://localhost:8080/health

# Performance Metrics
curl http://localhost:8080/performance

# Hardware Acceleration Status
curl http://localhost:8080/hardware-acceleration
```

## 🎨 Frontend Features

- **Dashboard:** Übersicht aller Videos
- **Upload:** Drag & Drop Video Upload
- **Video Gallery:** Grid-Ansicht mit Status-Badges
- **Video Detail:** Player + Scene-Liste + Vision-Tags
- **Vision Analysis:** Automatische Objekt- und Gesichtserkennung

## 🔬 Vision Features

- **Object Detection:** Automatische Objekterkennung
- **Face Detection:** Gesichtserkennung mit Landmarks
- **Scene Classification:** Indoor/Outdoor Kategorisierung
- **Apple Intelligence:** Natürliche Szenenbeschreibungen
- **Hardware Acceleration:** M4 GPU + Neural Engine Optimierung

## 📈 Performance

### Benchmarks (Apple M4)

- **Bild-Analyse:** ~0.75ms
- **Video Upload:** ~100MB/s
- **Scene Detection:** ~2-5s für 1min Video
- **Keyframe Extraction:** ~0.5s pro Keyframe

### Hardware-Optimierungen

- **Apple Vision Framework:** Native Performance
- **Core ML:** Neural Engine Integration
- **Metal GPU:** Hardware-Beschleunigung
- **VideoToolbox:** Optimierte Video-Verarbeitung

## 🚀 Nächste Schritte

1. **Erste Video-Upload:** Teste das Upload-System
2. **Vision-Analyse:** Triggere eine Vision-Analyse
3. **API-Integration:** Integriere die APIs in eigene Projekte
4. **Custom Models:** Füge eigene Core ML Modelle hinzu
5. **Performance-Tuning:** Optimiere für deine Hardware

## 📚 Weitere Dokumentation

- [System Overview](./SYSTEM_OVERVIEW.md) - Vollständige Architektur-Übersicht
- [Vision Service Documentation](./VISION_SERVICE_DOCUMENTATION.md) - Detaillierte Vision Service API
- [API Reference](./API_REFERENCE.md) - Vollständige API-Dokumentation
- [Deployment Guide](./DEPLOYMENT.md) - Produktions-Deployment

---

**Need Help?** Check die [Troubleshooting](./TROUBLESHOOTING.md) Sektion oder erstelle ein Issue im Repository.
