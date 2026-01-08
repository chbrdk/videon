# Qwen VL Service - MLX für Apple Silicon

Semantische Video- und Bildanalyse mit Qwen 3VL (MLX) - Vollständig integriert in PrismVid.

## Features

- ✅ **Qwen 3VL-8B MLX**: Native Apple Silicon Optimierung
- ✅ **Semantic Understanding**: Videos und Bilder verstehen, nicht nur erkennen
- ✅ **Video Summarization**: Zusammenfassungen von Video-Frames
- ✅ **FastAPI Service**: REST API für Integration
- ✅ **Backend Integration**: Vollständig in PrismVid Backend integriert
- ✅ **Frontend Status**: Live Progress-Anzeige während der Analyse

## Installation

```bash
cd packages/qwen-vl-service

# Virtual Environment (empfohlen)
python3 -m venv .venv
source .venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt
```

## Quick Start

### 1. Test-Script

```bash
# Einfacher Test mit vorhandenem Bild
python test_qwen.py

# Oder mit spezifischem Bild
python test_qwen.py /path/to/image.jpg
```

### 2. Service starten

```bash
# Service auf Port 8081 starten
python -m src.api.server

# Oder mit uvicorn direkt
uvicorn src.api.server:app --host 0.0.0.0 --port 8081
```

### 3. API nutzen

```bash
# Health Check
curl http://localhost:8081/health

# Image Analysis
curl -X POST http://localhost:8081/analyze/image \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "/path/to/image.jpg",
    "prompt": "Beschreibe diese Szene detailliert."
  }'
```

## Modell-Auswahl

Standard: `mlx-community/Qwen3-VL-8B-Instruct-3bit` (~3GB)

Alternative Modelle:
- `mlx-community/Qwen3-VL-8B-Instruct-4bit` (~4GB, bessere Qualität)
- `mlx-community/Qwen3-VL-8B-Instruct-5bit` (~5GB, beste Qualität)

## Performance

- **Model Loading**: ~2-5 Sekunden (einmalig)
- **Image Analysis**: ~0.5-2 Sekunden
- **RAM Usage**: 8-12GB (für 3-bit Model)

## Integration

### Backend Integration

Der Service ist vollständig in das PrismVid Backend integriert:

- **Service**: `packages/backend/src/services/qwen-vl.service.ts`
- **API Routes**: `packages/backend/src/routes/videos.routes.ts`
  - `POST /api/videos/:id/qwenVL/analyze` - Startet Analyse
  - `GET /api/videos/:id/qwenVL/status` - Fortschritt abrufen

### Frontend Integration

- Status-Chip in der Video-Detail-Seite
- Progress Bar während der Analyse
- Automatisches Polling alle 2 Sekunden
- Vision-Tags mit Qwen VL Beschreibungen

### Direkte API-Nutzung

```python
from services.qwen_service import QwenVLService

qwen_service = QwenVLService()
result = qwen_service.analyze_image(image_path="...")
```

## Dokumentation

Vollständige Dokumentation: [QWEN_VL_INTEGRATION.md](../../docs/QWEN_VL_INTEGRATION.md)

## Status

✅ **Produktiv** - Vollständig integriert und einsatzbereit

