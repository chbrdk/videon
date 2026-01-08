# PrismVid - Complete System Documentation

**Version:** 2.0.0  
**Last Updated:** 2025-11-05  
**Status:** Production Ready

---

## 📑 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Features](#features)
5. [Services](#services)
6. [APIs](#apis)
7. [Database Schema](#database-schema)
8. [Frontend](#frontend)
9. [Deployment](#deployment)
10. [Configuration](#configuration)
11. [Development](#development)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)
14. [Performance](#performance)
15. [Security](#security)
16. [Roadmap](#roadmap)

---

## System Overview

PrismVid ist eine fortschrittliche Video-Analyse- und Bearbeitungsplattform mit KI-gestützten Features für professionelles Video-Editing.

### Core Capabilities

- **🎥 Video Management**: Upload, analyse und organisiere Videos in Ordner-Strukturen
- **🔍 Scene Detection**: Automatische Szenen-Erkennung mit PySceneDetect
- **👁️ Vision Analysis**: Apple Vision Framework + Core ML für Objekt- & Gesichtserkennung
- **🧠 Semantic Analysis**: Qwen VL (MLX) für detaillierte Szenen-Beschreibungen
- **🔎 Intelligent Search**: Text- & Embedding-basierte Suche über alle Inhalte
- **🤖 AI Creator**: GPT-5-mini powered automatische Video-Projekt-Erstellung
- **🎵 Audio Separation**: KI-basierte Trennung in Vocals/Music/Drums/Bass
- **🎙️ Re-Voicing**: ElevenLabs Integration für Voice-Cloning & Text-to-Speech
- **🎯 Saliency Detection**: SAM 2.1 für intelligentes Video-Reframing
- **📝 Transcription**: Automatische Sprach-zu-Text Transkription
- **🎬 Project System**: Flexible Projekt-basierte Video-Bearbeitung
- **📤 Export**: Premiere Pro, Final Cut Pro, SRT Untertitel

### Technology Stack

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Svelte 5 + SvelteKit + Tailwind CSS                  │  │
│  │  • Glassmorphism Design System                        │  │
│  │  • Material Design Icons                              │  │
│  │  • Real-time Video Player                             │  │
│  │  • Storybook Component Library                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Node.js + Express + TypeScript                       │  │
│  │  • Prisma ORM (PostgreSQL)                            │  │
│  │  • OpenAI API Integration                             │  │
│  │  • ElevenLabs Integration                             │  │
│  │  • Winston Logging                                     │  │
│  │  • Express Rate Limiting                              │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    AI/ML SERVICES LAYER                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Qwen VL (Python/MLX) - Semantic Analysis           │  │
│  │  • Vision Service (Swift) - Apple Vision Framework    │  │
│  │  • Analyzer (Python/FastAPI) - Scene Detection        │  │
│  │  • Saliency Service (Python) - SAM 2.1 Reframing     │  │
│  │  • Audio Service (Python) - Audio Processing          │  │
│  │  • Audio Separation (Python) - Demucs Model          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • PostgreSQL - Primary Database                      │  │
│  │  • Redis - Caching & Sessions                         │  │
│  │  • File System - Video & Asset Storage               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### System Requirements

**Minimum:**
- macOS 13+ (für Vision Service & Qwen VL)
- Apple Silicon M1+ (optimal: M4)
- 16 GB RAM
- 50 GB freier Speicher
- Node.js 18+
- Python 3.11+
- Swift 5.9+
- PostgreSQL 15+
- Docker & Docker Compose

**Recommended:**
- macOS 15+ (für neueste Vision Features)
- Apple Silicon M4
- 32 GB+ RAM
- 200 GB+ SSD
- Node.js 20+
- Python 3.12+
- Swift 6.0+

---

## Architecture

### Service Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                  │
│                        (Browser / Mobile App)                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Port 3003)                       │
│  • SvelteKit SSR                                                     │
│  • Component Library (Storybook)                                     │
│  • Real-time Video Player                                            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ REST API
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Port 4001)                        │
│  • Express API Server                                                │
│  • Authentication & Authorization                                    │
│  • Business Logic                                                    │
│  • File Upload Management                                            │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┘
   │          │          │          │          │          │
   │          │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Analyzer│ │ Qwen   │ │Saliency│ │ Audio  │ │  Audio │ │ Vision │
│        │ │   VL   │ │        │ │Separ...│ │Service │ │Service │
│:8001   │ │ :8081  │ │ :8002  │ │ :8003  │ │ :5679  │ │ :8080  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
   │          │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┴──────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌────────────────────┐  ┌─────────────┐  ┌───────────────────────┐ │
│  │   PostgreSQL       │  │   Redis     │  │  File Storage         │ │
│  │   :5432           │  │   :6379     │  │  /storage             │ │
│  └────────────────────┘  └─────────────┘  └───────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Service Ports & URLs

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | 3003 | http://localhost:3003 | SvelteKit Web Interface |
| **Backend** | 4001 | http://localhost:4001 | Node.js API Server |
| **PostgreSQL** | 5432 | postgresql://localhost:5432 | Primary Database |
| **Redis** | 6379 | redis://localhost:6379 | Cache & Sessions |
| **Analyzer** | 8001 | http://localhost:8001 | Python Scene Detection |
| **Saliency** | 8002 | http://localhost:8002 | SAM 2.1 Reframing Service |
| **Audio Separation** | 8003 | http://localhost:8003 | Demucs Audio Separation |
| **Audio Service** | 5679 | http://localhost:5679 | Audio Processing |
| **Vision Service** | 8080 | http://localhost:8080 | Apple Vision Framework |
| **Qwen VL** | 8081 | http://localhost:8081 | Semantic Video Analysis |
| **Storybook** | 6006 | http://localhost:6006 | Component Library |


### Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│  1. VIDEO UPLOAD                                                   │
│     User → Frontend → Backend → File System                       │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  2. SCENE DETECTION                                                │
│     Backend → Analyzer Service → PySceneDetect                     │
│     Result: Scene Timecodes & Keyframes                            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  3. VISION ANALYSIS (Parallel)                                     │
│     ├─ Apple Vision (Swift) → Objects, Faces, OCR, Body Pose      │
│     ├─ Qwen VL (MLX) → Semantic Descriptions                      │
│     └─ Saliency (SAM 2.1) → Saliency Maps & ROI                   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  4. AUDIO PROCESSING (Parallel)                                    │
│     ├─ Transcription → Text Segments                              │
│     └─ Audio Separation → Vocals/Music/Drums/Bass Stems           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  5. SEARCH INDEXING                                                │
│     Content + Embeddings → SearchIndex (OpenAI text-embedding-3)  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  6. UI UPDATE                                                      │
│     Database → Backend → Frontend → User                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone Repository
git clone <repository-url>
cd prismvid

# 2. Environment Setup
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your API keys

# 3. Start Services
docker-compose up -d

# 4. Check Health
curl http://localhost:4001/health
curl http://localhost:3003

# 5. Open Application
open http://localhost:3003
```

### Option 2: Local Development

```bash
# 1. Clone Repository
git clone <repository-url>
cd prismvid

# 2. Install Dependencies
npm install
pnpm install

# 3. Setup Database
cd packages/backend
cp .env.example .env
npm run prisma:migrate

# 4. Start Vision Service (Terminal 1)
cd packages/vision-service
swift run VisionService

# 5. Start Qwen VL Service (Terminal 2)
cd packages/qwen-vl-service
source .venv312/bin/activate
uvicorn src.api.server:app --host 0.0.0.0 --port 8081

# 6. Start Backend (Terminal 3)
cd packages/backend
npm run dev

# 7. Start Frontend (Terminal 4)
cd packages/frontend
npm run dev

# 8. Open Application
open http://localhost:3000
```

### First Steps

1. **Upload Video**: Navigate to Upload page, select video file (max 100MB)
2. **Analyze**: Click "Analyze" to trigger scene detection & vision analysis
3. **Search**: Use search bar to find specific scenes or content
4. **Create Project**: Use AI Creator or manually select scenes for projects
5. **Export**: Export projects to Premiere Pro, Final Cut Pro, or SRT

---

## Features

### 1. Video Management

#### Upload & Storage
- **File Upload**: Drag & Drop or Browse (max 100MB per file)
- **Formats**: MP4, AVI, MOV, MKV, WebM (alle FFmpeg-Formate)
- **Metadata**: Automatische Extraktion von Duration, Resolution, Codec
- **Folder Organization**: Hierarchische Ordner-Struktur
- **Status Tracking**: UPLOADED → ANALYZING → ANALYZED → AUDIO_SEPARATED

#### Video Gallery
- **Grid View**: Thumbnail-basierte Übersicht
- **List View**: Detaillierte Listenansicht mit Metadaten
- **Folder Navigation**: Breadcrumb-Navigation durch Ordner
- **Quick Actions**: Delete, Move, Analyze, Export
- **Batch Operations**: Multi-Select für Bulk-Actions

### 2. Scene Detection

**Engine**: PySceneDetect mit ContentDetector

**Process**:
```python
# Detection Algorithm
ContentDetector(threshold=15.0)
- Analysiert Frame-to-Frame Unterschiede
- Erkennt harte Schnitte & Szenenübergänge
- Generiert Start/End Timecodes

# Fallback für Videos ohne Schnitte
- Erstellt Single Scene für gesamtes Video
- Duration via FFprobe
```

**Features**:
- **Keyframe Extraction**: Mittleres Frame jeder Szene als Thumbnail
- **Adjustable Threshold**: Konfigurierbare Empfindlichkeit (default: 15.0)
- **Scene Splitting**: Manuelle Szenen-Teilung nach Analyse
- **Scene Merging**: Zusammenführung mehrerer Szenen

### 3. Vision Analysis

#### Apple Vision Framework Integration

**Features**:
- **Object Detection**: Automatische Objekt-Erkennung (100+ Kategorien)
- **Face Detection**: Gesichter mit Landmarks & Bounding Boxes
- **OCR / Text Recognition**: Text-Erkennung in Bildern (macOS 15+)
- **Human Body Pose**: Body Keypoint Detection (macOS 14+)
- **Scene Classification**: Indoor/Outdoor, Landschaften, etc.

**Hardware Acceleration**:
- Neural Engine für Core ML Models
- Metal GPU für Vision Framework
- VideoToolbox für optimierte Video-Verarbeitung
- Performance: ~0.75ms pro Frame (M4)

#### Qwen VL Semantic Analysis

**Model**: Qwen3-VL-8B-Instruct-3bit (MLX)

**Features**:
- **Semantic Descriptions**: Detaillierte natürlichsprachliche Szenen-Beschreibungen
- **Context Understanding**: Versteht Zusammenhänge & Aktionen
- **Multi-Frame Analysis**: Analysiert mehrere Frames für Video-Kontext
- **Apple Silicon Optimized**: MLX für M1/M2/M3/M4

**Performance**:
- 5-10 Sekunden pro Szene
- ~8-12 GB RAM für 3-bit Model
- Parallel zu Vision Analysis

**API**:
```bash
# Start Analysis
POST /api/videos/:id/qwenVL/analyze

# Check Status
GET /api/videos/:id/qwenVL/status
# Response: { totalScenes: 77, analyzedScenes: 33, progress: 43 }
```

### 4. Intelligent Search

#### Text Search
- **Full-Text Search**: PostgreSQL case-insensitive search
- **Content Sources**: 
  - Transcription text
  - Qwen VL descriptions
  - Vision tags & labels
  - OCR text
  - Metadata (filenames, descriptions)

#### Semantic Search
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Similarity Search**: Cosine similarity for semantic matching
- **Multi-Source**: Kombiniert alle Content-Quellen
- **Real-time Indexing**: Automatische Indexierung nach Analyse

#### Search Types
```typescript
GET /api/search?q=query&type=all|videos|scenes

// type=all - Alle Inhalte durchsuchen
// type=videos - Nur Video-Level
// type=scenes - Nur Scene-Level
```

### 5. AI Creator (GPT-5-mini)

**Purpose**: Automatische Video-Projekt-Erstellung basierend auf User-Queries

**Workflow**:
```
User Query → GPT-5-mini Analysis → Multi-Query Search → 
Scene Evaluation → Video Suggestions → Project Creation
```

**Features**:
1. **Query Analysis**: Extrahiert Intent, Keywords, Duration, Tone
2. **Multi-Query Search**: Generiert 3-5 Search-Queries für beste Ergebnisse
3. **Scene Evaluation**: GPT bewertet jede Szene (Relevance Score 0-100)
4. **Video Assembly**: Erstellt 1-3 Varianten mit optimaler Szenen-Reihenfolge
5. **Smart Trimming**: Schlägt Trimming für besseren Flow vor
6. **One-Click Creation**: Direkte Projekt-Erstellung aus Suggestion

**API**:
```bash
# Analyze Query
POST /api/ai-creator/analyze
Body: { query: "Create a video about management presentations" }

# Create Project from Suggestion
POST /api/ai-creator/create-project
Body: { suggestionId: "abc123", variantIndex: 0 }
```

**Configuration**:
- Model: gpt-5-mini (November 2025)
- Max Tokens: 16000 (includes reasoning tokens)
- Temperature: 1.0 (fixed for GPT-5-mini)


### 6. Audio Features

#### Audio Separation (Demucs)

**Model**: Demucs AI Model

**Stems**:
- **Vocals**: Gesang/Sprache
- **Music**: Instrumentale Musik
- **Drums**: Schlagzeug
- **Bass**: Bass-Instrumente
- **Other**: Restliche Sounds

**Usage**:
```bash
POST /api/audio-stems/videos/:videoId/separate-audio
# Triggers background job
# Results: 4-5 separate audio files per video
```

**Performance**:
- ~30-60 Sekunden für 1-Minute Video
- Qualität: Professional-grade separation
- Storage: ~5x Original-Audio-Größe

#### Transcription

**Engine**: Whisper (OpenAI)

**Features**:
- **Language Detection**: Automatische Sprach-Erkennung
- **Timestamps**: Segment-Level Timing (Sekunden-genau)
- **Punctuation**: Automatische Interpunktion
- **Formats**: JSON, SRT Export

**API**:
```bash
POST /api/videos/:id/transcribe
GET /api/videos/:id/transcription
```

#### Voice Segments & Re-Voicing

**Purpose**: Text-basierte Voice-Bearbeitung mit ElevenLabs

**Workflow**:
```
1. Audio Separation → Vocals Stem
2. Transcription → Text Segments
3. Segment Creation → Voice Segments (mit Timing)
4. Text Editing → User kann Text bearbeiten
5. Voice Selection → ElevenLabs Voice wählen
6. Re-Voicing → TTS für jedes Segment
7. Export → Neue Audio-Datei mit editierter Voice
```

**Features**:
- **Text Editing**: Bearbeite transkribierten Text
- **Voice Cloning**: Nutze eigene Voice-Clones
- **Voice Library**: 1000+ ElevenLabs Voices
- **Voice Settings**: Stability, Similarity, Style, Speaker Boost
- **Preview**: Live-Preview während Text-Eingabe
- **Batch Processing**: Mehrere Segmente gleichzeitig

**API**:
```bash
# Create Segments from Transcription
POST /api/voice-segments/audio-stems/:audioStemId/create-segments

# Get Segments
GET /api/voice-segments/audio-stems/:audioStemId/segments

# Re-Voice Single Segment
POST /api/voice-segments/:segmentId/revoice
Body: { voiceId, text?, voiceSettings? }

# Stream Preview
POST /api/voice-segments/preview-voice
Body: { text, voiceId, voiceSettings }
```

**Database Schema**:
```typescript
model VoiceSegment {
  id: string
  audioStemId: string
  startTime: float
  endTime: float
  duration: float
  originalText: string
  originalFilePath: string
  editedText?: string
  voiceId?: string
  voiceName?: string
  stability: float
  similarityBoost: float
  style: float
  useSpeakerBoost: boolean
  reVoicedFilePath?: string
  reVoicedAt?: DateTime
  status: 'ORIGINAL' | 'EDITED_TEXT' | 'GENERATING' | 'COMPLETED' | 'ERROR'
}
```

### 7. Saliency Detection & Reframing

**Model**: SAM 2.1 (Segment Anything Model 2.1)

**Purpose**: Intelligentes Video-Reframing für Social Media Formate

**Features**:
- **Saliency Maps**: Frame-by-Frame Saliency Detection
- **ROI Suggestions**: Automatische Region-of-Interest Vorschläge
- **Smart Reframing**: Automatisches Reframing für 9:16, 1:1, etc.
- **Smooth Tracking**: Smooth ROI-Tracking über Zeit
- **Heatmap Visualization**: Debug-Visualisierungen

**Supported Aspect Ratios**:
- 9:16 (Instagram Stories, TikTok)
- 16:9 (YouTube, Standard)
- 1:1 (Instagram Feed)
- Custom (beliebige Ratios)

**API**:
```bash
# Analyze Video for Saliency
POST /api/saliency/analyze
Body: { videoId, videoPath, sampleRate, aspectRatio, maxFrames }

# Analyze Scene
POST /api/saliency/analyze-scene
Body: { videoId, sceneId, videoPath, startTime, endTime, aspectRatio }

# Generate Reframed Video
POST /api/saliency/reframe
Body: { videoId, aspectRatio, smoothingFactor }

# Get Saliency Data
GET /api/saliency/:videoId
GET /api/saliency/:videoId/scene/:sceneId
```

**Performance** (M4):
- SAM 2.1 Large: ~1-2 FPS
- SAM 2.1 Small: ~2-3 FPS
- Memory: ~8-12 GB

### 8. Project System

**Purpose**: Flexible Video-Projekt-Erstellung & -Bearbeitung

**Features**:

#### Project Management
```typescript
// Create Project
POST /api/projects
Body: { name, description? }

// Get Projects
GET /api/projects

// Get Project with Scenes
GET /api/projects/:id

// Delete Project
DELETE /api/projects/:id
```

#### Scene Management
```typescript
// Add Scene to Project
POST /api/projects/:id/scenes
Body: { videoId, startTime, endTime }

// Reorder Scenes
PUT /api/projects/:id/scenes/reorder
Body: { scenes: [{ sceneId, order }] }

// Update Scene Timing (Trimming)
PUT /api/projects/scenes/:sceneId/timing
Body: { startTime?, endTime?, trimStart?, trimEnd? }

// Split Scene
POST /api/projects/scenes/:sceneId/split
Body: { splitTime }

// Delete Scene
DELETE /api/projects/scenes/:sceneId
```

#### Audio Level Control
```typescript
// Set Audio Level (0.0 - 2.0)
PUT /api/projects/scenes/:sceneId/audio-level
Body: { audioLevel }
```

#### History & Undo/Redo
```typescript
// Get Project History
GET /api/projects/:id/history

// Undo Last Action
POST /api/projects/:id/undo

// Redo Action
POST /api/projects/:id/redo
```

**History Actions**:
- add_scene
- delete_scene
- split_scene
- reorder
- audio_level
- trim

### 9. Export Functions

#### Premiere Pro Export

**Format**: Adobe Premiere Pro XML (XMEML)

**Features**:
- **Full Project Export**: Alle Szenen mit Timing
- **Audio Level Support**: Individuelle Lautstärken
- **Trim Support**: Trimming-Informationen
- **Metadata**: Project Name, Description, Duration
- **Multi-Track**: Video + Audio Tracks

**API**:
```bash
# Export Project
GET /api/projects/:id/export/premiere

# Export Video Timeline
GET /api/videos/:id/export/premiere

# XML Only
GET /api/projects/:id/export/premiere/xml
```

#### Final Cut Pro Export

**Format**: FCPXML (Final Cut Pro XML)

**Features**:
- Analog zu Premiere Pro
- FCPXML 1.10+ Format
- Support für Final Cut Pro 10.6+

**API**:
```bash
GET /api/projects/:id/export/fcpxml
GET /api/videos/:id/export/fcpxml
```

#### SRT Subtitle Export

**Format**: SubRip Subtitle Format (.srt)

**Features**:
- Automatische Nummerierung
- Timestamp-Formatierung (HH:MM:SS,mmm)
- Multi-Language Support

**API**:
```bash
GET /api/projects/:id/export/srt
GET /api/videos/:id/export/srt
```

**Example SRT**:
```srt
1
00:00:00,000 --> 00:00:05,000
Dies ist der erste Untertitel.

2
00:00:05,000 --> 00:00:10,000
Und hier kommt der zweite Untertitel.
```


---

## Services

### Backend Service (Node.js + Express)

**Port**: 4001  
**Runtime**: Node.js 20+ with TypeScript  
**Framework**: Express 4.x

**Structure**:
```
packages/backend/
├── src/
│   ├── app.ts                 # Main Express app
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── routes/                # API routes
│   ├── middleware/            # Express middleware
│   └── utils/                 # Utilities & helpers
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── storage/                  # File storage
│   ├── videos/
│   ├── keyframes/
│   ├── audio_stems/
│   └── thumbnails/
└── tests/                    # Jest tests
```

**Key Services**:
- VideoService - Video management & processing
- SceneService - Scene detection & manipulation
- SearchService - Text & semantic search
- ProjectService - Project management
- AICreatorService - GPT-5-mini integration
- VoiceSegmentService - Re-voicing with ElevenLabs
- QwenVLService - Semantic analysis
- OpenAIService - OpenAI API wrapper
- ElevenLabsClient - ElevenLabs API wrapper
- PremiereExportService - Adobe export functions

**Middleware**:
- CORS (configurable origins)
- Helmet (security headers)
- Rate Limiting (express-rate-limit)
- Error Handling (global error handler)
- Request Logging (Winston)

### Analyzer Service (Python + FastAPI)

**Port**: 8001  
**Runtime**: Python 3.11+  
**Framework**: FastAPI

**Purpose**: Video scene detection & keyframe extraction

**Key Features**:
- PySceneDetect Integration (ContentDetector)
- FFmpeg für Video Processing
- Keyframe Extraction (mittleres Frame)
- Vision Service Integration
- Database Integration (Prisma)

**API Endpoints**:
```python
POST /analyze
{
  "videoId": "string",
  "videoPath": "string",
  "threshold": 15.0
}

GET /analyze/:id/status
# Returns: { status, progress, scenes }

GET /health
# Returns: { status: "healthy", version: "1.0.0" }
```

### Qwen VL Service (Python + MLX)

**Port**: 8081  
**Runtime**: Python 3.12+ (required for MLX)  
**Framework**: FastAPI  
**Model**: Qwen3-VL-8B-Instruct-3bit (MLX)

**Purpose**: Semantic video frame analysis with natural language descriptions

**Requirements**:
- Python 3.12+
- Apple Silicon (M1/M2/M3/M4)
- MLX Framework
- 8-12 GB RAM

**Installation**:
```bash
cd packages/qwen-vl-service
python3.12 -m venv .venv312
source .venv312/bin/activate
pip install -r requirements.txt
pip install mlx mlx-lm --index-url https://mlx.github.io/MLX/releases/python/
```

**API Endpoints**:
```python
GET /health
POST /analyze/image
{
  "image_path": "string",
  "prompt": "string",
  "max_tokens": 500
}

POST /analyze/video-frames
{
  "frame_paths": ["string"],
  "prompt": "string",
  "max_tokens": 1000
}

GET /model/info
```

**Performance**:
- 5-10 seconds per frame (M4)
- Memory: ~8-12 GB
- Automatic image resizing to 1024x1024px

### Vision Service (Swift + Vapor)

**Port**: 8080  
**Runtime**: Swift 5.9+  
**Framework**: Vapor  
**Vision**: Apple Vision Framework + Core ML

**Purpose**: Native Apple Vision Framework integration

**Features**:
- Object Detection (VNRecognizeAnimalsRequest, VNDetectHumanRectanglesRequest)
- Face Detection (VNDetectFaceRectanglesRequest + Landmarks)
- Text Recognition / OCR (VNRecognizeTextRequest) - macOS 15+
- Human Body Pose (VNDetectHumanBodyPoseRequest) - macOS 14+
- Scene Classification (VNClassifyImageRequest)
- Core ML Model Support
- Metal GPU Acceleration
- Neural Engine Optimization

**Hardware Acceleration**:
- Neural Engine für Core ML
- Metal GPU für Vision Processing
- VideoToolbox für Video Decode

**API Endpoints**:
```swift
POST /analyze/vision
{
  "sceneId": "string",
  "keyframePath": "string"
}

GET /models
GET /apple-intelligence
GET /hardware-acceleration
GET /performance
GET /health
```

### Saliency Service (Python + SAM 2.1)

**Port**: 8002  
**Runtime**: Python 3.11+  
**Framework**: FastAPI  
**Model**: Segment Anything Model 2.1

**Purpose**: Saliency detection & intelligent video reframing

**Models**:
- sam2.1_small - Schnell, moderate Qualität
- sam2.1_large - Langsamer, hohe Qualität
- sam2.1_huge - Sehr langsam, beste Qualität

**API Endpoints**:
```python
POST /analyze
POST /analyze-scene
POST /generate-heatmap
POST /generate-all-visualizations
GET /saliency/:videoId
GET /saliency/:videoId/scene/:sceneId
GET /heatmap/:videoId
GET /health
```

### Audio Separation Service (Python + Demucs)

**Port**: 8003  
**Runtime**: Python 3.11+  
**Framework**: FastAPI  
**Model**: Demucs (Meta AI)

**Purpose**: AI-powered audio source separation

**Stems**:
- Vocals
- Music (Instrumental)
- Drums
- Bass
- Other

**API Endpoints**:
```python
POST /separate
{
  "videoId": "string",
  "audioPath": "string"
}

GET /stems/:videoId
GET /health
```

### Audio Service (Python + FastAPI)

**Port**: 5679  
**Runtime**: Python 3.11+  
**Framework**: FastAPI

**Purpose**: Audio processing & manipulation

**Features**:
- Audio Trimming
- Audio Concatenation
- Audio Mixing
- Volume Adjustment
- Format Conversion

**API Endpoints**:
```python
POST /trim
POST /concatenate
POST /mix
POST /adjust-volume
POST /convert
GET /health
```

---

## APIs

### Complete API Reference

#### Videos API (`/api/videos`)

```typescript
// Upload Video
POST /videos
Content-Type: multipart/form-data
Body: { video: File }
Response: Video

// Get All Videos
GET /videos
Response: Video[]

// Get Video by ID
GET /videos/:id
Response: Video

// Delete Video
DELETE /videos/:id

// Move Video to Folder
PUT /videos/:id/move
Body: { folderId: string }

// Stream Video File
GET /videos/:id/file
Response: Video Stream (Range Support)

// Get Thumbnail
GET /videos/:id/thumbnail?t=timestamp
Response: Image Stream

// Get Scenes
GET /videos/:id/scenes
Response: Scene[]

// Get Scene Thumbnail
GET /videos/:id/scenes/:sceneId/thumbnail
Response: Image Stream

// Reorder Scenes
PUT /videos/:id/scenes/reorder
Body: { scenes: [{ sceneId, order }] }

// Split Scene
POST /videos/:id/scenes/:sceneId/split
Body: { splitTime: number }
Response: { scene1: Scene, scene2: Scene }

// Delete Scene
DELETE /videos/:id/scenes/:sceneId

// Merge Scenes
POST /videos/:id/scenes/merge
Body: { sceneIds: string[] }

// Generate Scene Video
GET /videos/:id/scene-video?startTime=X&endTime=Y
Response: Video Stream

// Delete Scene Video
DELETE /videos/:id/scene-video?startTime=X&endTime=Y

// Get Vision Analysis
GET /videos/:id/vision
Response: VisionAnalysis[]

// Trigger Vision Analysis
POST /videos/:id/vision/analyze
Body: { timeInterval?: number }

// Trigger Qwen VL Analysis
POST /videos/:id/qwenVL/analyze
Response: { message, videoId, status: 'ANALYZING' }

// Get Qwen VL Status
GET /videos/:id/qwenVL/status
Response: { videoId, status, totalScenes, analyzedScenes, progress, isComplete }

// Transcribe Video
POST /videos/:id/transcribe

// Get Transcription
GET /videos/:id/transcription
Response: Transcription[]

// Export Functions
GET /videos/:id/export/premiere        # ZIP with project files
GET /videos/:id/export/premiere/xml    # XML only
GET /videos/:id/export/fcpxml          # FCPXML
GET /videos/:id/export/srt             # SRT Subtitles
```

#### Projects API (`/api/projects`)

```typescript
// Create Project
POST /projects
Body: { name: string, description?: string }
Response: Project

// Get All Projects
GET /projects
Response: Project[]

// Get Project by ID
GET /projects/:id
Response: Project (with scenes)

// Delete Project
DELETE /projects/:id

// Add Scene to Project
POST /projects/:id/scenes
Body: { videoId, startTime, endTime }
Response: ProjectScene

// Reorder Scenes
PUT /projects/:id/scenes/reorder
Body: { scenes: [{ sceneId, order }] }

// Update Scene Timing
PUT /projects/scenes/:sceneId/timing
Body: { startTime?, endTime?, trimStart?, trimEnd? }

// Delete Scene
DELETE /projects/scenes/:sceneId
DELETE /projects/:id/scenes/:sceneId  # Alternative

// Split Scene
POST /projects/scenes/:sceneId/split
Body: { splitTime: number }
Response: { scene1, scene2 }

// Update Audio Level
PUT /projects/scenes/:sceneId/audio-level
Body: { audioLevel: number }  # 0.0 - 2.0

// Get History
GET /projects/:id/history
Response: ProjectHistory[]

// Undo
POST /projects/:id/undo

// Redo
POST /projects/:id/redo

// Get Transcription Segments
GET /projects/:id/transcription-segments
Response: TranscriptionSegment[]

// Export Functions
GET /projects/:id/export/premiere      # ZIP
GET /projects/:id/export/premiere/xml  # XML
GET /projects/:id/export/fcpxml        # FCPXML
GET /projects/:id/export/srt           # SRT
```


#### Search API (`/api/search`)

```typescript
// Search Videos & Scenes
GET /search?q=query&type=all|videos|scenes
Response: SearchResult[]

// Index Video for Search
POST /search/videos/:videoId/index
```

#### Folders API (`/api/folders`)

```typescript
// Get All Folders
GET /folders?parentId=string
Response: Folder[]

// Get Folder by ID
GET /folders/:id
Response: Folder

// Get Breadcrumbs
GET /folders/:id/breadcrumbs
Response: Breadcrumb[]

// Create Folder
POST /folders
Body: { name: string, parentId?: string }
Response: Folder

// Update Folder
PUT /folders/:id
Body: { name: string }

// Delete Folder
DELETE /folders/:id

// Move Videos to Folder
POST /folders/:id/move-videos
Body: { videoIds: string[] }
```

#### Audio Stems API (`/api/audio-stems`)

```typescript
// Get Audio Stems for Video
GET /audio-stems/videos/:videoId/audio-stems
Response: AudioStem[]

// Stream Audio Stem
GET /audio-stems/audio-stems/:id/stream
Response: Audio Stream

// Separate Audio
POST /audio-stems/videos/:videoId/separate-audio

// Create Audio Stem (Internal)
POST /audio-stems/audio-stems
Body: AudioStem data

// Delete Audio Stem
DELETE /audio-stems/audio-stems/:id
```

#### Voice Segments API (`/api/voice-segments`)

```typescript
// Create Segments from Transcription
POST /voice-segments/audio-stems/:audioStemId/create-segments
Body: { videoId: string }
Response: { segments: VoiceSegment[] }

// Get Segments
GET /voice-segments/audio-stems/:audioStemId/segments
Response: VoiceSegment[]

// Re-Voice Segment
POST /voice-segments/:segmentId/revoice
Body: { voiceId: string, text?: string, voiceSettings?: object }
Response: VoiceSegment

// Preview Voice (Live)
POST /voice-segments/preview-voice
Body: { text: string, voiceId: string, voiceSettings?: object }
Response: Audio Stream
```

#### AI Creator API (`/api/ai-creator`)

```typescript
// Analyze Query & Create Suggestions
POST /ai-creator/analyze
Body: { query: string, variantCount?: number }
Response: {
  originalQuery: string,
  analysis: QueryAnalysis,
  suggestions: VideoSuggestion[],
  suggestionId: string
}

// Create Project from Suggestion
POST /ai-creator/create-project
Body: { suggestionId: string, variantIndex: number }
Response: Project

// Get Cached Suggestion
GET /ai-creator/suggestions/:id
Response: CachedSuggestion

// Health Check
GET /ai-creator/health
Response: { available: boolean, model: 'gpt-5-mini' }
```

#### Health API (`/api/health`)

```typescript
GET /health
Response: {
  status: 'healthy' | 'degraded',
  services: {
    backend: { status, uptime },
    database: { status, connected },
    analyzer: { status, url },
    qwenVL: { status, url },
    vision: { status, url },
    saliency: { status, url },
    audioSeparation: { status, url }
  }
}
```

---

## Database Schema

### Core Models

#### Video
```prisma
model Video {
  id           String   @id @default(cuid())
  filename     String
  originalName String
  duration     Float?
  fileSize     Int
  mimeType     String
  status       String   @default("UPLOADED")
  
  folderId     String?
  folder       Folder?  @relation(fields: [folderId], references: [id])
  
  uploadedAt   DateTime @default(now())
  analyzedAt   DateTime?
  
  scenes       Scene[]
  transcriptions Transcription[]
  audioStems   AudioStem[]
  searchIndices SearchIndex[]
  projectScenes ProjectScene[]
  saliencyAnalyses SaliencyAnalysis[]
}

// Status: UPLOADED, ANALYZING, ANALYZED, AUDIO_SEPARATING, 
//         AUDIO_SEPARATED, AUDIO_SEPARATION_FAILED, ERROR
```

#### Scene
```prisma
model Scene {
  id           String   @id @default(cuid())
  videoId      String
  video        Video    @relation(fields: [videoId], references: [id])
  startTime    Float
  endTime      Float
  keyframePath String?
  visionData   String?  // JSON
  createdAt    DateTime @default(now())
  
  visionAnalysis VisionAnalysis?
  saliencyAnalysis SaliencyAnalysis?
  searchIndices SearchIndex[]
  audioStems   AudioStem[]
}
```

#### VisionAnalysis
```prisma
model VisionAnalysis {
  id       String @id @default(cuid())
  sceneId  String @unique
  scene    Scene  @relation(fields: [sceneId], references: [id])
  
  // Object Detection
  objects     String?  // JSON
  objectCount Int      @default(0)
  
  // Face Detection
  faces       String?  // JSON
  faceCount   Int      @default(0)
  
  // Core ML
  sceneClassification String?  // JSON
  customObjects       String?  // JSON
  sceneCategory       String?
  customObjectCount   Int      @default(0)
  
  // Apple Intelligence
  aiDescription String?
  aiTags        String?  // JSON
  
  // Text Recognition (OCR)
  textRecognitions String?  // JSON
  textCount        Int      @default(0)
  
  // Human Detection
  humanRectangles String?  // JSON
  humanCount      Int      @default(0)
  
  // Body Pose
  humanBodyPoses String?  // JSON
  poseCount      Int      @default(0)
  
  // Qwen VL Semantic Analysis
  qwenVLDescription    String?
  qwenVLProcessed      Boolean @default(false)
  qwenVLModel          String?
  qwenVLProcessingTime Float?
  
  // Metadata
  processingTime Float?
  visionVersion  String
  coreMLVersion  String?
  createdAt      DateTime @default(now())
}
```

#### Project
```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  duration    Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  scenes   ProjectScene[]
  history  ProjectHistory[]
}
```

#### ProjectScene
```prisma
model ProjectScene {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  videoId   String
  video     Video   @relation(fields: [videoId], references: [id])
  
  startTime Float
  endTime   Float
  order     Int     @default(0)
  
  // Optional adjustments
  trimStart  Float?
  trimEnd    Float?
  audioLevel Float   @default(1.0)  // 0.0 - 2.0
  
  audioStems AudioStem[]
  createdAt  DateTime @default(now())
}
```

#### ProjectHistory
```prisma
model ProjectHistory {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  action    String   // add_scene, delete_scene, split_scene, reorder, audio_level, trim
  data      String   // JSON with undo/redo data
  createdAt DateTime @default(now())
}
```

#### SearchIndex
```prisma
model SearchIndex {
  id      String  @id @default(cuid())
  videoId String
  video   Video   @relation(fields: [videoId], references: [id])
  sceneId String?
  scene   Scene?  @relation(fields: [sceneId], references: [id])
  
  content     String  // Combined text from transcription + vision
  startTime   Float?
  endTime     Float?
  embedding   String  // JSON Array of floats (OpenAI embedding)
  contentType String  // transcription, vision, metadata
  language    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### AudioStem
```prisma
model AudioStem {
  id      String @id @default(cuid())
  videoId String
  video   Video  @relation(fields: [videoId], references: [id])
  
  sceneId  String?
  scene    Scene?  @relation(fields: [sceneId], references: [id])
  
  projectSceneId String?
  projectScene   ProjectScene? @relation(fields: [projectSceneId], references: [id])
  
  stemType  String  // vocals, music, drums, bass, original, other
  filePath  String
  fileSize  Int
  duration  Float?
  startTime Float?
  endTime   Float?
  
  voiceSegments VoiceSegment[]
  createdAt     DateTime @default(now())
}
```

#### VoiceSegment
```prisma
model VoiceSegment {
  id          String    @id @default(cuid())
  audioStemId String
  audioStem   AudioStem @relation(fields: [audioStemId], references: [id])
  
  startTime Float
  endTime   Float
  duration  Float
  
  originalText     String
  originalFilePath String
  editedText       String?
  
  // ElevenLabs Settings
  voiceId         String?
  voiceName       String?
  stability       Float   @default(0.5)
  similarityBoost Float   @default(0.75)
  style           Float   @default(0.0)
  useSpeakerBoost Boolean @default(true)
  
  reVoicedFilePath String?
  reVoicedAt       DateTime?
  
  status       String  @default("ORIGINAL")
  errorMessage String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Status: ORIGINAL, EDITED_TEXT, GENERATING, COMPLETED, ERROR
```

#### Transcription
```prisma
model Transcription {
  id       String @id @default(cuid())
  videoId  String
  video    Video  @relation(fields: [videoId], references: [id])
  language String  // de, en, etc.
  segments String  // JSON Array
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Folder
```prisma
model Folder {
  id       String   @id @default(cuid())
  name     String
  parentId String?
  parent   Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[] @relation("FolderHierarchy")
  path     String   // e.g., "/root/projects/2024"
  
  videos    Video[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### SaliencyAnalysis
```prisma
model SaliencyAnalysis {
  id      String  @id @default(cuid())
  sceneId String? @unique
  scene   Scene?  @relation(fields: [sceneId], references: [id])
  videoId String
  video   Video   @relation(fields: [videoId], references: [id])
  
  dataPath    String   // Path to JSON with frame data
  heatmapPath String?  // Path to heatmap video
  roiData     String   // JSON: ROI suggestions
  
  frameCount     Int
  sampleRate     Int    @default(1)
  modelVersion   String  // "sam2.1-large-coreml"
  processingTime Float
  
  createdAt      DateTime @default(now())
  reframedVideos ReframedVideo[]
}
```

---

## Frontend

### Technology Stack

- **Framework**: Svelte 5 + SvelteKit
- **Styling**: Tailwind CSS
- **Design System**: Custom Glassmorphism Components
- **Icons**: Material Design Icons (@material-icons/svg)
- **Video Player**: Custom Video Player mit WaveSurfer.js
- **Testing**: Vitest (Unit), Playwright (E2E)
- **Component Library**: Storybook


### Design System

**Naming Convention**: Alle Komponenten prefixed mit `udg-glass-`

**Core Components**:

```
src/lib/components/
├── udg-glass-button.svelte        # Buttons
├── udg-glass-card.svelte          # Card Containers
├── udg-glass-input.svelte         # Text Inputs
├── udg-glass-select.svelte        # Dropdowns
├── udg-glass-modal.svelte         # Modals
├── udg-glass-dialog.svelte        # Dialogs
├── udg-glass-badge.svelte         # Status Badges
├── udg-glass-chip.svelte          # Chips
├── udg-glass-progress.svelte      # Progress Bars
├── udg-glass-spinner.svelte       # Loading Spinners
├── udg-glass-video-player.svelte  # Video Player
├── udg-glass-waveform.svelte      # Audio Waveform
├── udg-glass-vision-tags.svelte   # Vision Analysis Tags
└── udg-glass-scene-timeline.svelte # Scene Timeline
```

**Glassmorphism Style**:
```css
/* Base Glass Effect */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
.dark .glass {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Page Structure

```
src/routes/
├── +layout.svelte              # Root Layout (Navigation)
├── +page.svelte                # Dashboard / Home
├── upload/
│   └── +page.svelte            # Video Upload
├── videos/
│   ├── +page.svelte            # Video Gallery
│   └── [id]/
│       └── +page.svelte        # Video Detail + Player
├── projects/
│   ├── +page.svelte            # Project List
│   └── [id]/
│       └── +page.svelte        # Project Editor
├── ai-creator/
│   └── +page.svelte            # AI Creator
├── search/
│   └── +page.svelte            # Search Results
└── settings/
    └── +page.svelte            # Settings
```

### State Management

**Svelte 5 Runes**:
```typescript
// Reactive State
let videos = $state([]);
let selectedVideo = $state(null);
let isLoading = $state(false);

// Computed State
let filteredVideos = $derived(
  videos.filter(v => v.status === 'ANALYZED')
);

// Effects
$effect(() => {
  console.log('Video changed:', selectedVideo);
});
```

### API Client

```typescript
// src/lib/api/
├── videos.ts       # Video API calls
├── projects.ts     # Project API calls
├── search.ts       # Search API calls
├── ai-creator.ts   # AI Creator API calls
└── client.ts       # Base HTTP client

// Example Usage
import { videoAPI } from '$lib/api/videos';

const videos = await videoAPI.getAll();
const video = await videoAPI.getById(id);
await videoAPI.delete(id);
```

### Internationalization (i18n)

**Languages**: English (en), German (de)

```typescript
// src/lib/i18n/
├── en.json         # English translations
├── de.json         # German translations
└── index.ts        # i18n setup

// Usage in Components
import { t, locale } from '$lib/i18n';

<h1>{$t('dashboard.title')}</h1>
<p>{$t('dashboard.subtitle', { count: 5 })}</p>
```

---

## Deployment

### Docker Compose Deployment (Recommended)

**Prerequisites**:
- Docker & Docker Compose
- 16 GB+ RAM
- 50 GB+ Disk Space

**Environment Variables**:
```bash
# packages/backend/.env
DATABASE_URL=postgresql://prismvid:prismvid_dev@postgres:5432/prismvid
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=el-...
QWEN_VL_SERVICE_URL=http://host.docker.internal:8081
VISION_SERVICE_URL=http://host.docker.internal:8080
ANALYZER_SERVICE_URL=http://analyzer:8001
SALIENCY_SERVICE_URL=http://saliency-service:8002
AUDIO_SEPARATION_SERVICE_URL=http://audio-separation-service:8003
AUDIO_SERVICE_URL=http://audio-service:5679
```

**Deployment Steps**:

```bash
# 1. Clone Repository
git clone <repository-url>
cd prismvid

# 2. Configure Environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your API keys

# 3. Build & Start
docker-compose up -d

# 4. Check Logs
docker-compose logs -f

# 5. Check Health
curl http://localhost:4001/health
curl http://localhost:3003
```

**Service Management**:
```bash
# Start All Services
docker-compose up -d

# Stop All Services
docker-compose down

# Restart Service
docker-compose restart backend

# View Logs
docker-compose logs -f backend

# Rebuild Service
docker-compose up -d --build backend

# Scale Service (if supported)
docker-compose up -d --scale backend=3
```

### Local Services (Required for Apple Silicon Features)

**Qwen VL Service** (MLX - must run locally):
```bash
cd packages/qwen-vl-service
source .venv312/bin/activate
uvicorn src.api.server:app --host 0.0.0.0 --port 8081
```

**Vision Service** (Swift - must run locally):
```bash
cd packages/vision-service
swift run VisionService
# Runs on port 8080
```

### Production Deployment

**Additional Considerations**:

1. **Nginx Reverse Proxy**:
```nginx
server {
    listen 80;
    server_name prismvid.example.com;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **SSL/TLS with Let's Encrypt**:
```bash
certbot --nginx -d prismvid.example.com
```

3. **Database Backups**:
```bash
# Automated Daily Backup
docker exec prismvid-postgres pg_dump -U prismvid prismvid > backup-$(date +%Y%m%d).sql

# Restore from Backup
docker exec -i prismvid-postgres psql -U prismvid prismvid < backup-20250105.sql
```

4. **Monitoring**:
- Health Checks: `/health` endpoints
- Prometheus Metrics (optional)
- Logging: Winston → File/Console
- Error Tracking: Sentry (optional)

---

## Configuration

### Environment Variables

#### Backend (.env)

```bash
# Server
NODE_ENV=production|development
PORT=4001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/prismvid

# Redis
REDIS_URL=redis://host:6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=text-embedding-3-small

# ElevenLabs
ELEVENLABS_API_KEY=el-...

# Services
ANALYZER_SERVICE_URL=http://analyzer:8001
AUDIO_SEPARATION_SERVICE_URL=http://audio-separation-service:8003
AUDIO_SERVICE_URL=http://audio-service:5679
SALIENCY_SERVICE_URL=http://saliency-service:8002
VISION_SERVICE_URL=http://host.docker.internal:8080
QWEN_VL_SERVICE_URL=http://host.docker.internal:8081

# CORS
CORS_ORIGINS=http://localhost:3003,http://192.168.50.101:3003

# Storage Paths
VIDEOS_STORAGE_PATH=/app/storage/videos
KEYFRAMES_STORAGE_PATH=/app/storage/keyframes
AUDIO_STEMS_STORAGE_PATH=/app/storage/audio_stems
THUMBNAILS_STORAGE_PATH=/app/storage/thumbnails
HOST_STORAGE_PATH=/Users/m4-dev/Development/prismvid/storage

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # per window

# Logging
LOG_LEVEL=info|debug|error
LOG_FILE_PATH=/tmp/backend-dev.log
```

#### Frontend (.env)

```bash
# API
PUBLIC_BACKEND_URL=http://localhost:4001
# or for Docker: http://192.168.50.101:4001

# Environment
NODE_ENV=production|development
```

#### Qwen VL Service (.env)

```bash
# Model Configuration
QWEN_VL_MODEL_NAME=mlx-community/Qwen3-VL-8B-Instruct-3bit
QWEN_VL_FRAMES_PER_SECOND=1

# API
PORT=8081
HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO
```

### Docker Compose Configuration

**Networks**:
```yaml
networks:
  prismvid-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Volumes**:
```yaml
volumes:
  postgres_data:
  redis_data:
  storybook_sveltekit_config:
```

**Health Checks**:
```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U prismvid"]
  interval: 10s
  timeout: 5s
  retries: 5

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5

# Services
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```


---

## Development

### Development Setup

```bash
# 1. Clone & Install
git clone <repository-url>
cd prismvid
npm install

# 2. Database Setup
cd packages/backend
cp .env.example .env
npm run prisma:migrate

# 3. Start Development Services
./start-dev.sh
# or manually start each service in separate terminals

# 4. Development Workflow
# - Backend: npm run dev (hot reload via tsx watch)
# - Frontend: npm run dev (hot reload via Vite)
# - Services: Auto-restart on code changes
```

### Development Scripts

**Root Scripts**:
```bash
npm run dev              # Start all services
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all packages
npm run type-check       # TypeScript type checking
```

**Backend Scripts**:
```bash
cd packages/backend
npm run dev              # Development server (tsx watch)
npm run build            # Build TypeScript
npm run start            # Production server
npm test                 # Jest tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Prisma Studio GUI
```

**Frontend Scripts**:
```bash
cd packages/frontend
npm run dev              # Development server (Vite)
npm run build            # Production build
npm run preview          # Preview production build
npm test                 # Vitest unit tests
npm run test:ui          # Vitest UI
npm run test:e2e         # Playwright E2E tests
npm run storybook        # Start Storybook
npm run build-storybook  # Build Storybook
```

### Code Style & Linting

**ESLint Configuration**:
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
```

**Prettier Configuration**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Git Workflow

```bash
# Feature Branch
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Pull Request → Code Review → Merge to main

# Hotfix
git checkout -b hotfix/critical-bug
git commit -m "fix: critical bug"
git push origin hotfix/critical-bug
```

**Commit Message Convention**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/tooling changes

---

## Testing

### Unit Tests (Backend)

**Framework**: Jest + Supertest

```bash
cd packages/backend
npm test
```

**Example Test**:
```typescript
// tests/services/video.service.test.ts
import { VideoService } from '../../src/services/video.service';

describe('VideoService', () => {
  let videoService: VideoService;
  
  beforeEach(() => {
    videoService = new VideoService();
  });
  
  test('should get video by ID', async () => {
    const video = await videoService.getVideoById('test-id');
    expect(video).toBeDefined();
    expect(video.id).toBe('test-id');
  });
});
```

### Unit Tests (Frontend)

**Framework**: Vitest + Testing Library

```bash
cd packages/frontend
npm test
```

**Example Test**:
```typescript
// tests/components/button.test.ts
import { render, screen } from '@testing-library/svelte';
import Button from '$lib/components/udg-glass-button.svelte';

test('renders button with text', () => {
  render(Button, { props: { text: 'Click me' } });
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### E2E Tests (Frontend)

**Framework**: Playwright

```bash
cd packages/frontend
npm run test:e2e
```

**Example Test**:
```typescript
// tests/e2e/upload.spec.ts
import { test, expect } from '@playwright/test';

test('upload video', async ({ page }) => {
  await page.goto('http://localhost:3000/upload');
  await page.setInputFiles('input[type="file"]', 'test-video.mp4');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Integration Tests (Python Services)

**Framework**: pytest

```bash
cd packages/analyzer
pytest
```

**Example Test**:
```python
# tests/test_scene_detector.py
import pytest
from src.services.scene_detector import SceneDetector

def test_scene_detection():
    detector = SceneDetector()
    scenes = detector.detect_scenes('test-video.mp4')
    assert len(scenes) > 0
    assert scenes[0]['startTime'] == 0.0
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::4001`

**Solution**:
```bash
# Find process using port
lsof -i :4001

# Kill process
kill -9 <PID>

# Or kill all Node processes
pkill -f node
```

#### 2. Database Connection Error

**Problem**: `Error: Can't reach database server`

**Solution**:
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Check logs
docker-compose logs postgres
```

#### 3. Vision Service Not Responding

**Problem**: `503 Service Unavailable` when calling Vision API

**Solution**:
```bash
# Check if service is running
curl http://localhost:8080/health

# Restart service
cd packages/vision-service
swift run VisionService

# Check logs
tail -f logs/vision-service.log
```

#### 4. Qwen VL Service Not Starting

**Problem**: `ModuleNotFoundError: No module named 'mlx'`

**Solution**:
```bash
cd packages/qwen-vl-service

# Check Python version
python --version  # Must be 3.12+

# Recreate venv
rm -rf .venv312
python3.12 -m venv .venv312
source .venv312/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
pip install mlx mlx-lm --index-url https://mlx.github.io/MLX/releases/python/
```

#### 5. Docker Build Fails

**Problem**: `ERROR: failed to solve: process "/bin/sh -c ..." did not complete successfully`

**Solution**:
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check disk space
df -h
```

#### 6. Frontend Build Error

**Problem**: `Error: Cannot find module 'svelte'`

**Solution**:
```bash
cd packages/frontend

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .svelte-kit
npm run build
```

### Logging & Debugging

**Backend Logs**:
```bash
# Development
tail -f /tmp/backend-dev.log

# Docker
docker-compose logs -f backend

# Debug Mode
DEBUG=* npm run dev
```

**Service Logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f analyzer

# Follow with grep
docker-compose logs -f | grep "ERROR"
```

**Database Debugging**:
```bash
# Prisma Studio (GUI)
cd packages/backend
npm run prisma:studio

# Direct PostgreSQL
docker exec -it prismvid-postgres psql -U prismvid

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance

### Benchmarks (Apple M4)

**Video Processing**:
- Scene Detection: 2-5s for 1min video
- Keyframe Extraction: ~0.5s per frame
- Vision Analysis: ~0.75ms per frame
- Qwen VL Analysis: 5-10s per frame
- Saliency Detection: 1-2 FPS (SAM 2.1 Large)
- Audio Separation: 30-60s for 1min video

**API Response Times**:
- GET /videos: ~50ms
- GET /videos/:id: ~20ms
- POST /videos (upload): ~2-5s per MB
- GET /search: ~100-300ms (with embeddings)
- POST /ai-creator/analyze: ~10-30s

**Database Performance**:
- Simple queries: <5ms
- Complex joins: <50ms
- Full-text search: <100ms
- Embedding similarity: <300ms

### Optimization Tips

1. **Video Upload**:
   - Use chunked upload for large files
   - Implement client-side compression
   - Stream directly to storage

2. **Search Performance**:
   - Index frequently searched fields
   - Cache search results (Redis)
   - Use pagination for large result sets

3. **Vision Analysis**:
   - Process in background jobs
   - Use queue system (Bull/BullMQ)
   - Batch process multiple frames

4. **Database**:
   - Add indexes on foreign keys
   - Use connection pooling
   - Regular VACUUM ANALYZE

5. **Caching Strategy**:
   - Redis for API responses
   - CDN for static assets
   - Browser caching headers

### Monitoring

**Health Endpoints**:
```bash
# Check all services
curl http://localhost:4001/health

# Individual services
curl http://localhost:8001/health  # Analyzer
curl http://localhost:8002/health  # Saliency
curl http://localhost:8080/health  # Vision
curl http://localhost:8081/health  # Qwen VL
```

**Performance Metrics**:
```bash
# Backend performance
curl http://localhost:8080/performance

# Hardware acceleration
curl http://localhost:8080/hardware-acceleration
```

---

## Security

### Current Implementation

- ✅ CORS Configuration
- ✅ Helmet Security Headers
- ✅ Rate Limiting (Express)
- ✅ Input Validation (express-validator)
- ✅ SQL Injection Protection (Prisma)
- ✅ XSS Protection (Helmet)
- ⚠️ Authentication: Not implemented (Development only)
- ⚠️ Authorization: Not implemented
- ⚠️ HTTPS/TLS: Not enforced

### Production Security Checklist

- [ ] **Implement JWT Authentication**
- [ ] **Add Role-Based Authorization**
- [ ] **Enable HTTPS/TLS**
- [ ] **Configure CORS for production domains**
- [ ] **Set secure cookie flags**
- [ ] **Implement API key rotation**
- [ ] **Add request signing**
- [ ] **Enable audit logging**
- [ ] **Set up WAF (Web Application Firewall)**
- [ ] **Implement file upload scanning**
- [ ] **Add DDoS protection**
- [ ] **Regular dependency updates**
- [ ] **Security vulnerability scanning**

---

## Roadmap

### Phase 1: Core Features ✅

- [x] Video Upload & Storage
- [x] Scene Detection
- [x] Vision Analysis
- [x] Search Functionality
- [x] Project System
- [x] Export Functions

### Phase 2: AI Features ✅

- [x] Qwen VL Semantic Analysis
- [x] AI Creator (GPT-5-mini)
- [x] Audio Separation
- [x] Re-Voicing (ElevenLabs)
- [x] Saliency Detection & Reframing

### Phase 3: Production Features (Q1 2026)

- [ ] Authentication & Authorization (JWT)
- [ ] User Management & Roles
- [ ] Team Collaboration
- [ ] Workspace Management
- [ ] API Rate Limiting per User
- [ ] Usage Analytics & Reporting

### Phase 4: Advanced Features (Q2 2026)

- [ ] Real-time Collaboration
- [ ] Live Streaming Support
- [ ] Advanced Timeline Editor
- [ ] Color Grading Tools
- [ ] Motion Tracking
- [ ] Advanced Text-to-Video
- [ ] Batch Processing Queue

### Phase 5: Scale & Performance (Q3 2026)

- [ ] Horizontal Scaling
- [ ] Load Balancing
- [ ] CDN Integration
- [ ] Advanced Caching Strategy
- [ ] Database Sharding
- [ ] Microservices Architecture
- [ ] Kubernetes Deployment

### Future Considerations

- [ ] Mobile Apps (iOS/Android)
- [ ] Desktop Apps (Electron)
- [ ] Browser Extensions
- [ ] API Marketplace
- [ ] Plugin System
- [ ] Webhooks & Integrations
- [ ] AI Model Fine-Tuning
- [ ] Custom ML Model Training

---

## Contributing

### Development Guidelines

1. **Code Quality**:
   - Follow TypeScript/JavaScript best practices
   - Write clean, readable code
   - Add comments for complex logic
   - Maintain consistent formatting

2. **Testing**:
   - Write tests for new features
   - Maintain >80% code coverage
   - Run tests before committing

3. **Documentation**:
   - Update docs for API changes
   - Add JSDoc comments
   - Keep README up to date

4. **Pull Requests**:
   - Create feature branches
   - Write descriptive commit messages
   - Request code review
   - Address review feedback

### Project Structure

```
prismvid/
├── packages/
│   ├── backend/           # Node.js API Server
│   ├── frontend/          # SvelteKit Web App
│   ├── analyzer/          # Python Scene Detection
│   ├── qwen-vl-service/   # MLX Semantic Analysis
│   ├── vision-service/    # Swift Vision Framework
│   ├── saliency-service/  # SAM 2.1 Reframing
│   ├── audio-service/     # Audio Processing
│   └── audio-separation-service/  # Demucs Separation
├── docs/                  # Documentation
├── storage/               # File Storage
├── docker/                # Docker configurations
├── tools/                 # Development tools
├── config/                # Shared configuration
├── docker-compose.yml     # Docker Compose config
└── README.md              # Main README
```

---

## Support & Contact

### Documentation

- **Main Docs**: `/docs/README.md`
- **API Docs**: `/docs/API_DOCUMENTATION.md`
- **Quick Start**: `/docs/QUICK_START.md`
- **System Overview**: `/docs/SYSTEM_OVERVIEW.md`
- **AI Creator**: `/AI_CREATOR_DOCUMENTATION.md`

### Resources

- **GitHub Repository**: <repository-url>
- **Issue Tracker**: <repository-url>/issues
- **Wiki**: <repository-url>/wiki
- **Discussions**: <repository-url>/discussions

### Getting Help

1. **Check Documentation**: Start with relevant docs
2. **Search Issues**: Look for similar problems
3. **Create Issue**: Provide detailed description & logs
4. **Community**: Join discussions for help

---

## License

**Copyright © 2025 PrismVid**

All rights reserved. This software is proprietary and confidential.

---

## Appendix

### Glossary

- **Scene**: Continuous video segment without cuts
- **Keyframe**: Representative frame from a scene
- **Vision Analysis**: AI-powered image/video analysis
- **Embedding**: Vector representation for semantic search
- **Saliency**: Visual importance/attention in a frame
- **ROI**: Region of Interest
- **Stem**: Separated audio track (vocals/music/etc.)
- **Re-Voicing**: Regenerating voice with TTS
- **Glassmorphism**: UI design style with frosted glass effect

### Acronyms

- **API**: Application Programming Interface
- **TTS**: Text-to-Speech
- **OCR**: Optical Character Recognition
- **SAM**: Segment Anything Model
- **MLX**: Apple's Machine Learning framework
- **GPU**: Graphics Processing Unit
- **NPU**: Neural Processing Unit
- **SDK**: Software Development Kit
- **ORM**: Object-Relational Mapping
- **JWT**: JSON Web Token
- **CORS**: Cross-Origin Resource Sharing
- **CDN**: Content Delivery Network
- **SRT**: SubRip Subtitle format
- **FCPXML**: Final Cut Pro XML format

---

**End of Documentation**

For the latest updates and changes, please refer to the CHANGELOG.md file.

**Last Updated**: November 5, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅

