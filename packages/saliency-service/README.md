# Saliency Detection Service

Ein eigenständiger Python-Service für Saliency Detection mit SAM 2.1 (Segment Anything Model 2.1) für Video-Reframing. Der Service analysiert Videos Frame-by-Frame und generiert Heatmap-Visualisierungen für Debugging und ROI-Vorschläge für Reframing.

## Features

- **SAM 2.1 Integration**: Verwendet Segment Anything Model 2.1 mit Core ML Optimierung für Apple Silicon M4
- **Video-Analyse**: Frame-by-Frame Saliency Detection mit konfigurierbarem Sample Rate
- **Heatmap-Generierung**: Debug-Visualisierungen mit verschiedenen Colormaps
- **ROI-Vorschläge**: Automatische Region-of-Interest Vorschläge für Reframing
- **Scene-Analyse**: Spezifische Analyse einzelner Video-Szenen
- **REST API**: FastAPI-basierte REST-API für Integration
- **Docker-Support**: Vollständige Docker-Integration

## Architektur

```
packages/saliency-service/
├── src/
│   ├── api/
│   │   └── server.py              # FastAPI Server
│   ├── services/
│   │   ├── saliency_detector.py  # Video-Analyse Service
│   │   └── heatmap_generator.py # Heatmap-Generierung
│   ├── models/
│   │   └── sam_wrapper.py        # SAM 2.1 Wrapper
│   ├── database/
│   │   └── client.py             # Backend-Integration
│   └── utils/
│       └── logger.py             # Logging
├── tests/                        # Unit & Integration Tests
├── Dockerfile                    # Docker-Container
├── requirements.txt              # Python Dependencies
└── pytest.ini                   # Test-Konfiguration
```

## Installation

### Lokale Entwicklung

```bash
# Service-Verzeichnis
cd packages/saliency-service

# Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# Service starten
./run_local.sh
```

### Docker

```bash
# Service bauen
docker build -t prismvid-saliency-service .

# Service starten
docker run -p 8002:8002 \
  -v /Volumes/DOCKER_EXTERN/prismvid/storage:/app/storage \
  prismvid-saliency-service
```

## API Endpoints

### Video-Analyse

```bash
# Video analysieren
POST /analyze
{
  "videoId": "video_123",
  "videoPath": "/path/to/video.mp4",
  "sampleRate": 5,
  "aspectRatio": [9, 16],
  "maxFrames": 100
}

# Scene analysieren
POST /analyze-scene
{
  "videoId": "video_123",
  "sceneId": "scene_456",
  "videoPath": "/path/to/video.mp4",
  "startTime": 10.0,
  "endTime": 20.0,
  "aspectRatio": [9, 16]
}
```

### Heatmap-Generierung

```bash
# Heatmap-Video generieren
POST /generate-heatmap
{
  "videoId": "video_123",
  "colormap": "jet",
  "opacity": 0.5,
  "showRoi": true,
  "showInfo": true
}

# Alle Visualisierungen generieren
POST /generate-all-visualizations
{
  "video_id": "video_123"
}
```

### Daten-Abruf

```bash
# Saliency-Daten abrufen
GET /saliency/{video_id}

# Scene-Saliency-Daten abrufen
GET /saliency/{video_id}/scene/{scene_id}

# Heatmap-Video abrufen
GET /heatmap/{video_id}

# Vergleichsvideo abrufen
GET /comparison/{video_id}
```

## Konfiguration

### Umgebungsvariablen

- `LOG_LEVEL`: Logging-Level (INFO, DEBUG, ERROR)
- `BACKEND_URL`: Backend-API URL (default: http://localhost:3001)
- `PYTHONPATH`: Python-Pfad für Module

### Model-Konfiguration

Der Service unterstützt verschiedene SAM 2.1 Modelle:

- `sam2.1_small`: Kleines Modell, schnell
- `sam2.1_large`: Großes Modell, höhere Qualität
- `sam2.1_huge`: Größtes Modell, beste Qualität

## Testing

### Unit Tests

```bash
# Alle Tests ausführen
pytest

# Spezifische Test-Kategorien
pytest -m unit          # Unit Tests
pytest -m integration   # Integration Tests
pytest -m performance  # Performance Tests
pytest -m visual       # Visual Tests
```

### End-to-End Tests

```bash
# Kompletter Workflow-Test
./test_e2e.sh
```

## Performance

### Benchmarks (Mac mini M4)

- **SAM 2.1 Small**: ~2-3 FPS
- **SAM 2.1 Large**: ~1-2 FPS
- **OpenCV Fallback**: ~10-15 FPS

### Optimierungen

- **Core ML**: Native Apple Silicon Beschleunigung
- **Sample Rate**: Konfigurierbare Frame-Sampling
- **Batch Processing**: Effiziente Video-Verarbeitung
- **Memory Management**: Optimierte Speichernutzung

## Integration

### Backend-Integration

Der Service integriert sich über HTTP-API mit dem Backend:

```typescript
// Backend Service
import { SaliencyService } from './services/saliencyService';

// API Routes
app.use('/api', saliencyRoutes);
```

### Database Schema

```prisma
model SaliencyAnalysis {
  id          String   @id @default(cuid())
  sceneId     String?  @unique
  scene       Scene?   @relation(fields: [sceneId], references: [id])
  videoId     String
  video       Video    @relation(fields: [videoId], references: [id])
  
  dataPath    String   // Pfad zu JSON-Daten
  heatmapPath String?  // Pfad zu Heatmap-Video
  roiData     String   // JSON mit ROI-Vorschlägen
  
  frameCount      Int
  sampleRate      Int      @default(1)
  modelVersion    String
  processingTime  Float
  
  createdAt   DateTime @default(now())
}
```

## Troubleshooting

### Häufige Probleme

1. **Core ML Model nicht gefunden**
   - Fallback zu OpenCV Spectral Residual
   - Prüfe Model-Pfad in `storage/models/`

2. **Memory Issues**
   - Reduziere `maxFrames` Parameter
   - Erhöhe `sampleRate` für weniger Frames

3. **Performance-Probleme**
   - Verwende `sam2.1_small` Modell
   - Erhöhe `sampleRate` auf 5-10

### Logs

```bash
# Service-Logs
tail -f logs/saliency-service-error.log

# Docker-Logs
docker logs prismvid-saliency-service
```

## Entwicklung

### Code-Struktur

- **SAM Wrapper**: `src/models/sam_wrapper.py`
- **Saliency Detector**: `src/services/saliency_detector.py`
- **Heatmap Generator**: `src/services/heatmap_generator.py`
- **API Server**: `src/api/server.py`

### Erweiterungen

- **Neue Modelle**: Erweitere `SAMSaliencyModel` Klasse
- **Zusätzliche Colormaps**: Füge zu `HeatmapGenerator.colormaps` hinzu
- **API Endpoints**: Erweitere `server.py` mit neuen Routen

## Lizenz

Teil des PrismVid-Projekts. Siehe Hauptprojekt-Lizenz.

## Support

Bei Problemen oder Fragen:

1. Prüfe die Logs
2. Führe Tests aus
3. Konsultiere die API-Dokumentation: `http://localhost:8002/docs`
4. Erstelle Issue im Hauptprojekt-Repository
