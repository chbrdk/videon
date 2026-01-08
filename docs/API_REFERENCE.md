# PrismVid API Reference

## Übersicht

PrismVid bietet mehrere REST APIs für verschiedene Services. Alle APIs verwenden JSON für Request/Response und HTTP Status Codes für Error Handling.

## Base URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4001/api
- **Analyzer API:** http://localhost:5678
- **Saliency API:** http://localhost:8002
- **Audio Separation API:** http://localhost:8003
- **Qwen VL API:** http://localhost:8081
- **Vision API:** http://localhost:8080

## Authentication

**Aktuell:** Keine Authentication implementiert (Development Mode)

## Error Handling

Alle APIs verwenden standard HTTP Status Codes:

- **200** - Success
- **400** - Bad Request
- **404** - Not Found
- **500** - Internal Server Error
- **503** - Service Unavailable

Error Response Format:
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "statusCode": 400
}
```

---

## Backend API (Express)

### Videos

#### GET /api/videos
Listet alle Videos auf.

**Response:**
```json
[
  {
    "id": "video-123",
    "filename": "sample.mp4",
    "originalName": "Sample Video.mp4",
    "size": 10485760,
    "duration": 120.5,
    "status": "ANALYZED",
    "uploadedAt": "2025-10-20T14:31:14Z",
    "analyzedAt": "2025-10-20T14:32:30Z"
  }
]
```

#### POST /api/videos/upload
Uploadt ein Video.

**Request:** `multipart/form-data`
- `video` (file): Video-Datei

**Response:**
```json
{
  "id": "video-123",
  "filename": "sample.mp4",
  "status": "UPLOADED",
  "uploadedAt": "2025-10-20T14:31:14Z"
}
```

#### GET /api/videos/:id
Gibt Video-Details zurück.

**Response:**
```json
{
  "id": "video-123",
  "filename": "sample.mp4",
  "originalName": "Sample Video.mp4",
  "size": 10485760,
  "duration": 120.5,
  "status": "ANALYZED",
  "uploadedAt": "2025-10-20T14:31:14Z",
  "analyzedAt": "2025-10-20T14:32:30Z",
  "path": "/storage/videos/sample.mp4"
}
```

#### GET /api/videos/:id/scenes
Gibt Szenen für ein Video zurück.

**Response:**
```json
[
  {
    "id": "scene-123",
    "videoId": "video-123",
    "startTime": 0.0,
    "endTime": 5.2,
    "keyframePath": "/storage/keyframes/scene-123.jpg",
    "visionData": null,
    "createdAt": "2025-10-20T14:32:30Z"
  }
]
```

#### GET /api/videos/:id/vision
Gibt Vision-Analyse-Daten für ein Video zurück.

**Response:**
```json
[
  {
    "sceneId": "scene-123",
    "startTime": 0.0,
    "endTime": 5.2,
    "keyframePath": "/storage/keyframes/scene-123.jpg",
    "visionAnalysis": {
      "objects": [
        {
          "label": "person",
          "confidence": 0.95,
          "boundingBox": [0.1, 0.1, 0.8, 0.8]
        }
      ],
      "objectCount": 1,
      "faces": [],
      "faceCount": 0,
      "sceneClassification": [
        {
          "label": "indoor",
          "confidence": 0.85,
          "category": "indoor"
        }
      ],
      "customObjects": [],
      "sceneCategory": "indoor",
      "customObjectCount": 0,
      "aiDescription": "A person in an indoor environment",
      "aiTags": ["person", "indoor"],
      "processingTime": 0.75,
      "visionVersion": "macOS 26.0",
      "coreMLVersion": "1.0.0",
      "createdAt": "2025-10-20T14:32:35Z"
    }
  }
]
```

#### POST /api/videos/:id/vision/analyze
Triggert Vision-Analyse für ein Video.

**Response:**
```json
{
  "message": "Vision analysis started",
  "videoId": "video-123"
}
```

#### POST /api/videos/:id/qwenVL/analyze
Startet Qwen VL semantische Analyse für alle Szenen eines Videos.

**Response:**
```json
{
  "message": "Qwen VL analysis started",
  "videoId": "video-123",
  "status": "ANALYZING"
}
```

#### GET /api/videos/:id/qwenVL/status
Gibt den aktuellen Fortschritt der Qwen VL Analyse zurück.

**Response:**
```json
{
  "videoId": "video-123",
  "status": "ANALYZING",
  "totalScenes": 77,
  "analyzedScenes": 33,
  "progress": 43,
  "isComplete": false
}
```

#### GET /api/videos/:id/analysis-logs
Gibt Analysis-Logs für ein Video zurück.

**Response:**
```json
[
  {
    "id": "log-123",
    "videoId": "video-123",
    "level": "INFO",
    "message": "Video analysis completed successfully",
    "metadata": {
      "scenesDetected": 24,
      "keyframesExtracted": 24,
      "processingTime": 45.2
    },
    "createdAt": "2025-10-20T14:32:30Z"
  }
]
```

### Health

#### GET /health
Service Health Check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T14:31:14Z",
  "version": "1.0.0"
}
```

---

## Analyzer API (FastAPI)

### Analysis

#### POST /analyze
Startet Video-Analyse.

**Request Body:**
```json
{
  "videoId": "video-123",
  "videoPath": "/storage/videos/sample.mp4"
}
```

**Response:**
```json
{
  "analysisId": "analysis-123",
  "status": "started",
  "message": "Analysis started"
}
```

#### GET /analyze/:id/status
Gibt Analysis-Status zurück.

**Response:**
```json
{
  "analysisId": "analysis-123",
  "status": "completed",
  "progress": 100,
  "scenesDetected": 24,
  "keyframesExtracted": 24,
  "startedAt": "2025-10-20T14:31:14Z",
  "completedAt": "2025-10-20T14:32:30Z"
}
```

### Health

#### GET /health
Service Health Check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T14:31:14Z",
  "version": "1.0.0"
}
```

---

## Qwen VL API (FastAPI)

### Image Analysis

#### POST /analyze/image
Analysiert ein einzelnes Bild mit Qwen VL.

**Request Body:**
```json
{
  "image_path": "/path/to/image.jpg",
  "prompt": "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?",
  "max_tokens": 500
}
```

**Response:**
```json
{
  "description": "Eine detaillierte Beschreibung des Bildes...",
  "model": "mlx-community/Qwen3-VL-8B-Instruct-3bit",
  "prompt": "...",
  "image_path": "/path/to/image.jpg"
}
```

#### POST /analyze/video-frames
Analysiert mehrere Video-Frames für Video-Zusammenfassung.

**Request Body:**
```json
{
  "frame_paths": [
    "/path/to/frame1.jpg",
    "/path/to/frame2.jpg"
  ],
  "prompt": "Beschreibe was in diesen Video-Frames passiert.",
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "video_description": "Eine zusammenhängende Video-Beschreibung...",
  "frame_count": 2,
  "frames_analyzed": 1,
  "representative_frame": "frame1.jpg",
  "model": "mlx-community/Qwen3-VL-8B-Instruct-3bit"
}
```

### Model Information

#### GET /model/info
Gibt Model-Informationen zurück.

**Response:**
```json
{
  "model_name": "mlx-community/Qwen3-VL-8B-Instruct-3bit",
  "loaded": true,
  "max_tokens": 500,
  "temperature": 0.0
}
```

### Health

#### GET /health
Service Health Check.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "mlx-community/Qwen3-VL-8B-Instruct-3bit"
}
```

---

## Vision API (Vapor)

### Vision Analysis

#### POST /analyze/vision
Führt Vision-Analyse auf einem Bild durch.

**Request Body:**
```json
{
  "sceneId": "scene-123",
  "keyframePath": "/storage/keyframes/scene-123.jpg"
}
```

**Response:**
```json
{
  "objects": [
    {
      "label": "person",
      "confidence": 0.95,
      "boundingBox": [0.1, 0.1, 0.8, 0.8]
    }
  ],
  "faces": [
    {
      "confidence": 0.92,
      "landmarks": {
        "leftEye": [0.3, 0.4, 0.35, 0.45],
        "rightEye": [0.65, 0.4, 0.7, 0.45],
        "nose": [0.45, 0.5, 0.55, 0.6]
      },
      "boundingBox": [0.2, 0.2, 0.6, 0.6]
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
      "confidence": 0.88,
      "boundingBox": [0.7, 0.7, 0.2, 0.2]
    }
  ],
  "aiDescription": {
    "text": "A person sitting indoors with a vehicle in the background",
    "confidence": 0.88,
    "processingTime": 0.05,
    "model": "Apple Intelligence Foundation Models",
    "version": "1.0.0"
  },
  "processingTime": 0.75,
  "visionVersion": "macOS 26.0",
  "timestamp": "2025-10-20T14:31:14Z"
}
```

#### POST /analyze/video
Führt Video-Analyse durch (vereinfacht - nur erster Frame).

**Request Body:**
```json
{
  "videoPath": "/storage/videos/sample.mp4",
  "timeInterval": 1.0
}
```

**Response:**
```json
[
  {
    "objects": [...],
    "faces": [...],
    "processingTime": 0.75,
    "visionVersion": "macOS 26.0",
    "timestamp": "2025-10-20T14:31:14Z"
  }
]
```

### Core ML Models

#### GET /models
Listet verfügbare Core ML Modelle auf.

**Response:**
```json
{
  "models": [
    {
      "name": "SceneClassifier",
      "description": "Custom scene classification model",
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

#### GET /models/:modelName
Gibt Informationen zu einem spezifischen Modell zurück.

**Response:**
```json
{
  "name": "SceneClassifier",
  "description": "Custom scene classification model",
  "inputSize": {
    "width": 224,
    "height": 224
  },
  "outputLabels": ["indoor", "outdoor", "nature", "urban", "water", "sky"],
  "loaded": false
}
```

### Apple Intelligence

#### GET /apple-intelligence
Apple Intelligence Service Informationen.

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

#### GET /apple-intelligence/available
Apple Intelligence Verfügbarkeits-Check.

**Response:**
```json
{
  "available": true
}
```

### Hardware Acceleration

#### GET /hardware-acceleration
Hardware-Beschleunigung Informationen.

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

#### GET /hardware-acceleration/available
Hardware-Beschleunigung Verfügbarkeits-Check.

**Response:**
```json
{
  "available": true
}
```

### Performance

#### GET /performance
Vollständige Performance-Metriken.

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

#### POST /benchmark
Performance-Benchmark.

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

### Health

#### GET /health
Service Health Check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T14:31:14Z",
  "visionVersion": "macOS 26.0"
}
```

---

## Data Types

### ObjectDetection
```json
{
  "label": "string",
  "confidence": "float (0.0-1.0)",
  "boundingBox": "[x, y, width, height] (normalized 0.0-1.0)"
}
```

### FaceDetection
```json
{
  "confidence": "float (0.0-1.0)",
  "landmarks": {
    "leftEye": "[x1, y1, x2, y2]",
    "rightEye": "[x1, y1, x2, y2]",
    "nose": "[x1, y1, x2, y2]",
    "mouth": "[x1, y1, x2, y2]"
  },
  "boundingBox": "[x, y, width, height] (normalized 0.0-1.0)"
}
```

### SceneClassification
```json
{
  "label": "string",
  "confidence": "float (0.0-1.0)",
  "category": "string"
}
```

### SceneDescription
```json
{
  "text": "string",
  "confidence": "float (0.0-1.0)",
  "processingTime": "float (seconds)",
  "model": "string",
  "version": "string"
}
```

## Rate Limiting

**Aktuell:** Keine Rate Limiting implementiert

## CORS

**Aktuell:** Basis CORS-Konfiguration für lokale Entwicklung

## Examples

### Video Upload & Analysis

```bash
# 1. Video hochladen
curl -X POST http://localhost:4001/api/videos/upload \
  -F "video=@sample.mp4"

# 2. Video-Details abrufen
curl http://localhost:4001/api/videos/video-123

# 3. Vision-Analyse triggern
curl -X POST http://localhost:4001/api/videos/video-123/vision/analyze

# 4. Vision-Daten abrufen
curl http://localhost:4001/api/videos/video-123/vision

# 5. Qwen VL Analyse triggern
curl -X POST http://localhost:4001/api/videos/video-123/qwenVL/analyze

# 6. Qwen VL Status abrufen
curl http://localhost:4001/api/videos/video-123/qwenVL/status
```

### Direct Vision Analysis

```bash
# Direkte Vision-Analyse
curl -X POST http://localhost:8080/analyze/vision \
  -H "Content-Type: application/json" \
  -d '{
    "sceneId": "scene-123",
    "keyframePath": "/storage/keyframes/scene-123.jpg"
  }'
```

### System Status

```bash
# Alle Services prüfen
curl http://localhost:4001/health && \
curl http://localhost:5678/health && \
curl http://localhost:8002/health && \
curl http://localhost:8003/health && \
curl http://localhost:8081/health && \
curl http://localhost:8080/health
```

---

**Version:** 1.0.0  
**Letztes Update:** 2025-10-20
