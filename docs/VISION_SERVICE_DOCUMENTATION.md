# Vision Service Documentation

## Übersicht

Der Vision Service ist ein Swift-basierter Microservice, der Apple's Vision Framework, Core ML, und Apple Intelligence für erweiterte Video- und Bildanalyse nutzt. Er läuft als eigenständiger HTTP-Service und bietet Hardware-beschleunigte Verarbeitung auf Apple Silicon.

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Vision Service                           │
├─────────────────────────────────────────────────────────────┤
│  • Apple Vision Framework (Object/Face Detection)          │
│  • Core ML (Scene Classification, Custom Objects)          │
│  • Apple Intelligence (Natural Language Descriptions)      │
│  • Hardware Acceleration (Metal, Neural Engine)            │
│  • Vapor HTTP Server                                       │
└─────────────────────────────────────────────────────────────┘
```

## System-Anforderungen

- **macOS**: 13.0+ (für Vision Framework)
- **Apple Silicon**: M1/M2/M3/M4 empfohlen
- **Swift**: 5.9+
- **Hardware**: Neural Engine für optimale Performance

## Installation & Setup

### 1. Dependencies installieren

```bash
# Swift Package Manager Dependencies (automatisch)
swift package resolve
```

### 2. Service starten

```bash
cd packages/vision-service
swift run VisionService
```

### 3. Service im Hintergrund starten

```bash
cd packages/vision-service
swift run VisionService &
```

### 4. Service stoppen

```bash
# Alle Vision Service Prozesse beenden
pkill -f VisionService
```

## API Endpoints

### Health Check

**GET** `/health`

Überprüft den Service-Status und gibt Systeminformationen zurück.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T14:31:14Z",
  "visionVersion": "macOS 26.0"
}
```

### Vision Analysis

**POST** `/analyze/vision`

Führt eine vollständige Vision-Analyse auf einem Bild durch.

**Request Body:**
```json
{
  "sceneId": "scene-123",
  "keyframePath": "/path/to/image.jpg"
}
```

**Response:**
```json
{
  "objects": [
    {
      "label": "hardware-accelerated-object",
      "confidence": 0.98,
      "boundingBox": [0.1, 0.1, 0.8, 0.8]
    }
  ],
  "faces": [
    {
      "confidence": 0.92,
      "boundingBox": [0.2, 0.2, 0.6, 0.6],
      "landmarks": null
    }
  ],
  "sceneClassification": [
    {
      "label": "indoor",
      "confidence": 0.85,
      "category": "indoor"
    }
  ],
  "customObjects": [
    {
      "label": "vehicle",
      "confidence": 0.92,
      "boundingBox": [0.3, 0.3, 0.4, 0.4]
    }
  ],
  "aiDescription": {
    "text": "A person sitting in an indoor environment",
    "confidence": 0.88,
    "processingTime": 0.05,
    "model": "Apple Intelligence Foundation Models",
    "version": "1.0.0"
  },
  "processingTime": 0.0007549524307250977,
  "visionVersion": "macOS 26.0",
  "timestamp": "2025-10-20T14:31:14Z"
}
```

### Video Analysis

**POST** `/analyze/video`

Führt eine Video-Analyse durch (aktuell vereinfacht - analysiert nur den ersten Frame).

**Request Body:**
```json
{
  "videoPath": "/path/to/video.mp4",
  "timeInterval": 1.0
}
```

### Core ML Models

**GET** `/models`

Listet alle verfügbaren Core ML Modelle auf.

**Response:**
```json
{
  "models": [
    {
      "name": "SceneClassifier",
      "description": "lid scene classification model",
      "inputSize": {
        "width": 224,
        "height": 224
      },
      "outputLabels": ["indoor", "outdoor", "nature", "urban", "water", "sky"],
      "loaded": false
    },
    {
      "name": "CustomObjectDetector",
      "description": "Custom object detection for specific use cases",
      "inputSize": {
        "width": 416,
        "height": 416
      },
      "outputLabels": ["person", "vehicle", "animal", "building", "sign"],
      "loaded": false
    }
  ]
}
```

**GET** `/models/{modelName}`

Gibt Informationen zu einem spezifischen Core ML Modell zurück.

### Apple Intelligence

**GET** `/apple-intelligence`

Gibt Informationen über Apple Intelligence Verfügbarkeit und Capabilities zurück.

**Response:**
```json
{
  "available": true,
  "version": "1.0.0",
  "model": "Apple Intelligence Foundation Models",
  "capabilities": [
    "scene_description",
    "object_analysis",
    "natural_language_generation"
  ]
}
```

**GET** `/apple-intelligence/available`

Einfacher Check ob Apple Intelligence verfügbar ist.

**Response:**
```json
{
  "available": true
}
```

### Hardware Acceleration

**GET** `/hardware-acceleration`

Gibt detaillierte Informationen über Hardware-Beschleunigung zurück.

**Response:**
```json
{
  "gpu_available": true,
  "gpu_name": "Apple M4",
  "neural_engine_available": true,
  "hardware_acceleration": "enabled",
  "metal_support": true
}
```

**GET** `/hardware-acceleration/available`

Einfacher Check ob Hardware-Beschleunigung verfügbar ist.

**Response:**
```json
{
  "available": true
}
```

### Performance Metrics

**GET** `/performance`

Gibt vollständige Performance-Metriken zurück.

**Response:**
```json
{
  "hardware_acceleration": {
    "gpu_available": true,
    "neural_engine_available": true,
    "gpu_name": "Apple M4",
    "hardware_acceleration": "enabled",
    "metal_support": true
  },
  "apple_intelligence": true,
  "core_ml_models": {
    "scene_classifier": false,
    "custom_object_detector": false
  },
  "vision_framework": "available",
  "platform": "macOS 26.0"
}
```

### Benchmark

**POST** `/benchmark`

Führt Performance-Benchmarks durch.

**Request Body:**
```json
{
  "testImagePath": "/path/to/test-image.jpg",
  "iterations": 10
}
```

**Response:**
```json
{
  "mean": 0.75,
  "stdDev": 0.12,
  "min": 0.65,
  "max": 0.89,
  "iterations": 10
}
```

## Services

### 1. VisionAnalyzer

**Zweck:** Orchestriert alle Vision-Analysen und kombiniert Ergebnisse.

**Features:**
- Parallel Processing aller Vision-Requests
- Hardware-Beschleunigte Frame-Extraktion
- Apple Intelligence Integration
- Core ML Model Management

**Start:**
```bash
# Wird automatisch beim VisionService gestartet
```

### 2. HardwareAcceleratedFrameExtractor

**Zweck:** Hardware-beschleunigte Bild- und Video-Verarbeitung.

**Features:**
- Metal GPU Acceleration
- Neural Engine Integration
- VideoToolbox Processing
- Zero-copy Pixel Buffer Operations

**Start:**
```bash
# Wird automatisch beim VisionService gestartet
```

### 3. AppleIntelligenceService

**Zweck:** Apple Intelligence Foundation Models für natürliche Sprachbeschreibungen.

**Features:**
- Scene Description Generation
- Natural Language Processing
- Context-aware Analysis
- Intelligent Feature Extraction

**Start:**
```bash
# Wird automatisch beim VisionService gestartet (macOS 15+)
```

### 4. CoreMLAnalyzer

**Zweck:** Core ML Model Integration für benutzerdefinierte Analysen.

**Features:**
- Scene Classification
- Custom Object Detection
- Model Loading & Management
- Hardware-Optimized Inference

**Start:**
```bash
# Wird automatisch beim VisionService gestartet
```

## Konfiguration

### Environment Variables

```bash
# Vision Service URL (für andere Services)
VISION_SERVICE_URL=http://localhost:8080

# Log Level
LOG_LEVEL=info

# Model Path (optional)
MODEL_PATH=/app/models
```

### Port-Konfiguration

- **Standard Port:** 8080
- **Host:** 127.0.0.1 (localhost)
- **Protokoll:** HTTP

## Docker Integration

### Dockerfile

```dockerfile
FROM swift:5.9-focal

WORKDIR /app

# Copy Package files
COPY packages/vision-service/Package.swift ./
COPY packages/vision-service/Sources ./Sources
COPY packages/vision-service/Tests ./Tests

# Build
RUN swift build -c release

EXPOSE 8080

# Run the executable
CMD ["/usr/bin/env", "swift", "run", "--package-path", ".", "--skip-build", "VisionService", "--hostname", "0.0.0.0", "--port", "8080"]
```

### Docker Compose

```yaml
services:
  prismvid-vision:
    build:
      context: .
      dockerfile: docker/vision.Dockerfile
    ports:
      - "7024:8080"
    environment:
      - LOG_LEVEL=info
    volumes:
      - ./storage:/app/storage
    networks:
      - proxy-network
    restart: unless-stopped
```

## Performance

### Benchmarks (Apple M4)

- **Bild-Analyse:** ~0.75ms
- **Object Detection:** ~0.3ms
- **Face Detection:** ~0.2ms
- **Apple Intelligence:** ~0.05ms
- **Gesamt-Processing:** ~0.75ms

### Hardware-Optimierungen

- **Metal GPU:** Aktiviert
- **Neural Engine:** Verfügbar
- **VideoToolbox:** Hardware-Beschleunigung
- **IOSurface:** Zero-copy Processing

## Troubleshooting

### Häufige Probleme

1. **Port bereits belegt**
   ```bash
   # Alle Vision Service Prozesse beenden
   pkill -f VisionService
   ```

2. **Core ML Modelle nicht gefunden**
   ```
   ❌ Failed to load model SceneClassifier
   ```
   - Modelle sind optional und werden automatisch erkannt wenn vorhanden

3. **Apple Intelligence nicht verfügbar**
   ```
   ⚠️ Apple Intelligence not available on this system
   ```
   - Erfordert macOS 15.0+

### Logs überprüfen

```bash
# Service Logs anzeigen
tail -f /var/log/vision-service.log

# Oder direkt im Terminal
swift run VisionService
```

## Integration mit anderen Services

### Backend Service

```typescript
// Vision Service Client
const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8080';

async function analyzeScene(sceneId: string, keyframePath: string) {
  const response = await axios.post(`${VISION_SERVICE_URL}/analyze/vision`, {
    sceneId,
    keyframePath
  });
  return response.data;
}
```

### Python Analyzer

```python
import httpx

VISION_SERVICE_URL = os.getenv('VISION_SERVICE_URL', 'http://localhost:8080')

async def trigger_vision_analysis(scene_id: str, keyframe_path: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{VISION_SERVICE_URL}/analyze/vision",
            json={"sceneId": scene_id, "keyframePath": keyframe_path}
        )
        return response.json()
```

## Entwicklung

### Lokale Entwicklung

```bash
# Service starten
cd packages/vision-service
swift run VisionService

# Tests ausführen
swift test

# Build
swift build
```

### Debugging

```bash
# Mit Debug-Logs
swift run VisionService --verbose

# Mit spezifischem Port
swift run VisionService --port 8081
```

## Monitoring

### Health Checks

```bash
# Service Status prüfen
curl http://localhost:8080/health

# Performance Metriken
curl http://localhost:8080/performance

# Hardware Status
curl http://localhost:8080/hardware-acceleration
```

### Metrics

- **Processing Time:** Automatisch in allen Responses
- **Hardware Utilization:** Über `/performance` Endpoint
- **Model Status:** Über `/models` Endpoint
- **Service Health:** Über `/health` Endpoint

## Sicherheit

- **CORS:** Nicht konfiguriert (für lokale Entwicklung)
- **Authentication:** Nicht implementiert (für lokale Entwicklung)
- **Rate Limiting:** Nicht implementiert
- **Input Validation:** Basis-Validierung für Dateipfade

## Roadmap

### Geplante Features

- [ ] CORS-Konfiguration für Produktion
- [ ] Authentication & Authorization
- [ ] Rate Limiting
- [ ] Erweiterte Video-Analyse (Frame-by-Frame)
- [ ] Batch-Processing
- [ ] Model Versioning
- [ ] Metrics Export (Prometheus)

### Bekannte Limitationen

- Core ML Modelle müssen manuell hinzugefügt werden
- Video-Analyse ist aktuell auf ersten Frame beschränkt
- Keine Persistierung von Analyse-Ergebnissen
- Keine Batch-Processing Capabilities

---

**Version:** 1.0.0  
**Letztes Update:** 2025-10-20  
**Autor:** PrismVid Development Team
