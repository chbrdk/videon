# Qwen VL Integration - Vollständige Dokumentation

## Übersicht

Qwen VL (Vision Language) ist ein semantisches Video-Analyse-System, das Qwen 3VL mit MLX für Apple Silicon nutzt. Es ermöglicht detaillierte Beschreibungen von Video-Szenen basierend auf Keyframes.

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (SvelteKit)                      │
│  • Qwen VL Button im Services-Menü                          │
│  • Status-Chip mit Fortschritt (X/Y Szenen, X%)            │
│  • Progress Bar während der Analyse                         │
│  • Vision-Tags mit Qwen VL Beschreibungen                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                  │
│  • POST /api/videos/:id/qwenVL/analyze                      │
│  • GET  /api/videos/:id/qwenVL/status                      │
│  • QwenVLService (qwen-vl.service.ts)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Qwen VL Service (Python/FastAPI)               │
│  • Port 8081                                                │
│  • MLX-basiert für Apple Silicon                            │
│  • POST /analyze/image                                      │
│  • POST /analyze/video-frames                               │
│  • GET  /health                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  VisionAnalysis Model:                                      │
│  • qwenVLDescription (String?)                             │
│  • qwenVLProcessed (Boolean)                                │
│  • qwenVLModel (String?)                                    │
│  • qwenVLProcessingTime (Float?)                            │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Voraussetzungen

- **Python 3.12** (erforderlich für MLX)
- **Apple Silicon** (M1/M2/M3/M4) für optimale Performance
- **MLX Framework** (von Apple)

### Service Installation

```bash
cd packages/qwen-vl-service

# Virtual Environment erstellen (Python 3.12)
python3.12 -m venv .venv312
source .venv312/bin/activate

# Dependencies installieren
pip install --upgrade pip
pip install -r requirements.txt

# MLX muss von Apple's Index installiert werden
pip install mlx mlx-lm --index-url https://mlx.github.io/MLX/releases/python/
```

### Service-Start

#### Automatisch (via start-dev.sh)

Der Qwen VL Service wird automatisch beim Ausführen von `./start-dev.sh` gestartet:

```bash
./start-dev.sh
```

Das Script:
1. Prüft ob `.venv312` existiert (erstellt es falls nötig)
2. Installiert Dependencies falls nötig
3. Startet Service auf Port 8081 mit `uvicorn --reload`

#### Manuell

```bash
cd packages/qwen-vl-service
source .venv312/bin/activate
uvicorn src.api.server:app --host 0.0.0.0 --port 8081 --reload
```

#### Service-Status prüfen

```bash
# Health Check
curl http://localhost:8081/health

# Erwartete Antwort:
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "mlx-community/Qwen3-VL-8B-Instruct-3bit"
}
```

## Konfiguration

### Umgebungsvariablen

#### Backend (.env in packages/backend)

```bash
# Qwen VL Service URL (optional, Standard: http://localhost:8081)
QWEN_VL_SERVICE_URL=http://localhost:8081
# oder in Docker:
QWEN_VL_SERVICE_URL=http://qwen-vl-service:8081

# Storage Path für Pfad-Konvertierung
STORAGE_PATH=storage
```

#### Qwen VL Service

```bash
# Anzahl Frames pro Sekunde für Video-Analyse (Standard: 1)
QWEN_VL_FRAMES_PER_SECOND=1

# Model Name (optional, Standard: mlx-community/Qwen3-VL-8B-Instruct-3bit)
QWEN_VL_MODEL_NAME=mlx-community/Qwen3-VL-8B-Instruct-3bit
```

### Modell-Auswahl

Standard-Modell: `mlx-community/Qwen3-VL-8B-Instruct-3bit` (~3GB)

Verfügbare Modelle:
- `mlx-community/Qwen3-VL-8B-Instruct-3bit` - 3GB, schnellste Performance
- `mlx-community/Qwen3-VL-8B-Instruct-4bit` - 4GB, bessere Qualität
- `mlx-community/Qwen3-VL-8B-Instruct-5bit` - 5GB, beste Qualität
- `mlx-community/Qwen3-VL-30B-A3B-Thinking-5bit` - 15GB, sehr große Modelle

## API-Endpunkte

### Backend API (Express)

#### `POST /api/videos/:id/qwenVL/analyze`

Startet Qwen VL Analyse für alle Szenen eines Videos.

**Request:**
```http
POST /api/videos/cmhgliaqy000kzs97sgxc8al0/qwenVL/analyze
```

**Response:**
```json
{
  "message": "Qwen VL analysis started",
  "videoId": "cmhgliaqy000kzs97sgxc8al0",
  "status": "ANALYZING"
}
```

**Fehler:**
- `503 Service Unavailable`: Qwen VL Service nicht erreichbar
- `500 Internal Server Error`: Fehler beim Starten der Analyse

#### `GET /api/videos/:id/qwenVL/status`

Gibt den aktuellen Fortschritt der Qwen VL Analyse zurück.

**Request:**
```http
GET /api/videos/cmhgliaqy000kzs97sgxc8al0/qwenVL/status
```

**Response:**
```json
{
  "videoId": "cmhgliaqy000kzs97sgxc8al0",
  "status": "ANALYZING",
  "totalScenes": 77,
  "analyzedScenes": 33,
  "progress": 43,
  "isComplete": false
}
```

**Status-Werte:**
- `ANALYZING`: Analyse läuft noch
- `COMPLETED`: Analyse abgeschlossen

### Qwen VL Service API (FastAPI)

Base URL: `http://localhost:8081`

#### `GET /health`

Health Check Endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "mlx-community/Qwen3-VL-8B-Instruct-3bit"
}
```

#### `GET /model/info`

Gibt detaillierte Model-Informationen zurück.

**Response:**
```json
{
  "model_name": "mlx-community/Qwen3-VL-8B-Instruct-3bit",
  "loaded": true,
  "max_tokens": 500,
  "temperature": 0.0
}
```

#### `POST /analyze/image`

Analysiert ein einzelnes Bild mit Qwen VL.

**Request:**
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

**Features:**
- Automatisches Resizing auf max. 1024x1024px (verhindert Memory-Probleme)
- Timeout: 3 Minuten
- Support für verschiedene Bildformate (JPEG, PNG, etc.)

#### `POST /analyze/video-frames`

Analysiert mehrere Video-Frames für Video-Zusammenfassung.

**Request:**
```json
{
  "frame_paths": [
    "/path/to/frame1.jpg",
    "/path/to/frame2.jpg",
    "/path/to/frame3.jpg"
  ],
  "prompt": "Beschreibe was in diesen Video-Frames passiert.",
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "video_description": "Eine zusammenhängende Video-Beschreibung...",
  "frame_count": 3,
  "frames_analyzed": 1,
  "representative_frame": "frame2.jpg",
  "model": "mlx-community/Qwen3-VL-8B-Instruct-3bit",
  "prompt": "..."
}
```

## Datenbank-Integration

### Prisma Schema

Die Qwen VL Daten werden im `VisionAnalysis` Model gespeichert:

```prisma
model VisionAnalysis {
  // ... andere Felder ...
  
  // Qwen VL Semantic Analysis (optional)
  qwenVLDescription    String? // Semantic video description from Qwen 3VL
  qwenVLProcessed      Boolean @default(false)
  qwenVLModel          String? // e.g., "Qwen3-VL-8B-Instruct-3bit"
  qwenVLProcessingTime Float? // Processing time in seconds
}
```

### Migration

Die Qwen VL Felder wurden via Migration hinzugefügt:

```sql
ALTER TABLE vision_analyses 
ADD COLUMN "qwenVLDescription" TEXT,
ADD COLUMN "qwenVLProcessed" BOOLEAN DEFAULT false,
ADD COLUMN "qwenVLModel" TEXT,
ADD COLUMN "qwenVLProcessingTime" REAL;
```

## Frontend-Integration

### Status-Anzeige

Der Qwen VL Analyse-Status wird in der Chip-Leiste oben angezeigt:

- **Während Analyse**: Gelber Warning-Chip mit Spinner
  - Zeigt: `Qwen VL: X/Y (Z%)` (z.B. "Qwen VL: 33/77 (43%)")
- **Nach Abschluss**: Grüner Success-Chip
  - Zeigt: `Qwen VL: X Szenen` (z.B. "Qwen VL: 77 Szenen")

### Progress Bar

Während der Analyse wird eine Progress Bar im Vision-Analyse-Bereich angezeigt:
- Grüne Progress Bar mit Prozentanzeige
- Text: "Verarbeite X von Y Szenen"

### Status-Polling

Das Frontend pollt den Status alle 2 Sekunden während der Analyse:
- Timeout nach 10 Minuten (300 Versuche)
- Automatisches Reload der Vision-Daten nach Abschluss

### Vision-Tags Komponente

Die Qwen VL Beschreibung wird in der `UdgGlassVisionTags` Komponente angezeigt:
- Grüne Box wenn `qwenVLDescription` vorhanden
- Lila Box für normale `aiDescription` (Fallback)
- Bevorzugt Qwen VL wenn beide vorhanden

## Backend-Integration

### QwenVLService

Location: `packages/backend/src/services/qwen-vl.service.ts`

**Hauptmethoden:**

```typescript
class QwenVLService {
  // Prüft ob Service verfügbar ist
  async isAvailable(): Promise<boolean>
  
  // Analysiert einzelnes Bild
  async analyzeImage(imagePath: string, prompt?: string): Promise<string>
  
  // Analysiert mehrere Video-Frames
  async analyzeVideoFrames(framePaths: string[], prompt?: string): Promise<string>
  
  // Analysiert einzelne Szene
  async analyzeScene(sceneId: string): Promise<void>
  
  // Analysiert alle Szenen eines Videos
  async analyzeVideo(videoId: string): Promise<void>
}
```

**Funktionalität:**

1. **Pfad-Konvertierung**: Konvertiert Docker-Pfade (`/app/storage/`) zu lokalen Pfaden
2. **Keyframe-Validierung**: Prüft ob Keyframes existieren
3. **Sequenzielle Verarbeitung**: Analysiert alle Szenen nacheinander
4. **Fehlerbehandlung**: Überspringt fehlerhafte Szenen und macht weiter
5. **Database Updates**: Erstellt/Updated VisionAnalysis Einträge

## Analyse-Prozess

### Ablauf

1. **Trigger**: Frontend ruft `POST /api/videos/:id/qwenVL/analyze` auf
2. **Backend**: 
   - Prüft Qwen VL Service Verfügbarkeit
   - Startet Analyse im Hintergrund (nicht-blockierend)
3. **Qwen VL Service**:
   - Lädt alle Szenen für das Video
   - Für jede Szene:
     - Konvertiert Keyframe-Pfad zu lokalem Pfad
     - Resized Bild auf max. 1024x1024px (falls nötig)
     - Ruft Qwen VL Service API auf
     - Speichert Beschreibung in Database
4. **Frontend**: 
   - Pollt Status alle 2 Sekunden
   - Aktualisiert Progress Bar und Chip
   - Lädt Vision-Daten neu nach Abschluss

### Performance

- **Pro Szene**: 5-10 Sekunden (je nach Bildgröße und Hardware)
- **Bei 77 Szenen**: ~6-13 Minuten Gesamtzeit
- **Memory**: ~8-12GB RAM für 3-bit Model
- **Modell-Laden**: ~2-5 Sekunden (einmalig beim Start)

### Konfiguration

- **QWEN_VL_FRAMES_PER_SECOND**: Standard 1 (1 Frame pro Sekunde Szenen-Dauer)
- **Timeout**: 3 Minuten pro Bild-Analyse
- **Max Bildgröße**: Automatisch resized auf 1024x1024px

## Fehlerbehandlung

### Häufige Fehler

1. **Service nicht verfügbar** (503)
   - Prüfe ob Service läuft: `curl http://localhost:8081/health`
   - Prüfe Logs: `tail -f logs/qwen-vl.log`

2. **Keyframe nicht gefunden**
   - Service überspringt Szene und macht weiter
   - Wird in Logs geloggt

3. **Timeout bei Analyse**
   - Timeout wurde von 2 auf 3 Minuten erhöht
   - Bei sehr großen Bildern kann es trotzdem zu Timeouts kommen

4. **Memory-Probleme**
   - Bilder werden automatisch auf 1024x1024px resized
   - Falls weiterhin Probleme: Kleinere Model-Variante verwenden (3-bit statt 4-bit)

### Logging

Backend-Logs:
```bash
tail -f /tmp/backend-dev.log | grep "Qwen VL"
```

Qwen VL Service-Logs:
```bash
tail -f logs/qwen-vl.log
```

## Testing

### Service testen

```bash
# Health Check
curl http://localhost:8081/health

# Model Info
curl http://localhost:8081/model/info

# Image Analysis (mit Test-Bild)
curl -X POST http://localhost:8081/analyze/image \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "/path/to/test/image.jpg",
    "prompt": "Beschreibe diese Szene.",
    "max_tokens": 500
  }'
```

### Backend API testen

```bash
# Status abrufen
curl http://localhost:4001/api/videos/VIDEO_ID/qwenVL/status

# Analyse starten
curl -X POST http://localhost:4001/api/videos/VIDEO_ID/qwenVL/analyze
```

## Troubleshooting

### Service startet nicht

```bash
# Prüfe Python Version
python3.12 --version

# Virtual Environment neu erstellen
cd packages/qwen-vl-service
rm -rf .venv312
python3.12 -m venv .venv312
source .venv312/bin/activate
pip install -r requirements.txt
```

### Modell lädt nicht

```bash
# Prüfe MLX Installation
pip list | grep mlx

# MLX neu installieren
pip uninstall mlx mlx-lm
pip install mlx mlx-lm --index-url https://mlx.github.io/MLX/releases/python/
```

### Analyse hängt

- Prüfe Logs auf Fehler
- Prüfe ob Keyframes existieren
- Prüfe Memory-Verbrauch
- Restart Service falls nötig

## Best Practices

1. **Während Entwicklung**: Service manuell starten für besseres Debugging
2. **In Production**: Service via start-dev.sh oder Systemd starten
3. **Große Videos**: QWEN_VL_FRAMES_PER_SECOND auf 0.5 setzen für weniger Frames
4. **Memory-Optimierung**: 3-bit Model für bessere Performance verwenden
5. **Monitoring**: Status regelmäßig prüfen bei langen Analysen

## Zukünftige Verbesserungen

- [ ] Parallele Verarbeitung mehrerer Szenen
- [ ] Batch-Processing für mehrere Videos
- [ ] Caching von Beschreibungen
- [ ] Retry-Logik bei Fehlern
- [ ] WebSocket für Real-time Updates statt Polling

---

**Version**: 1.0.0  
**Letztes Update**: 2025-11-02  
**Status**: Produktiv

