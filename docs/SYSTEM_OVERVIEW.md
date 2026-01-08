# PrismVid System Overview

## Architektur-Übersicht

PrismVid ist ein vollständiges Video-Analyse-System mit modernster Apple-Technologie-Integration. Das System besteht aus mehreren Microservices, die über HTTP APIs kommunizieren.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PrismVid System                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Svelte 5)     │  Backend (Node.js)    │  Analyzer (Python)     │
│  • Glassmorphism UI      │  • Express API        │  • FastAPI             │
│  • Video Gallery         │  • File Upload        │  • Scene Detection     │
│  • Scene Visualization   │  • Database ORM       │  • Keyframe Extraction │
│  • Vision Tags           │  • Vision Integration │  • Video Processing    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Vision Service (Swift)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Apple Vision Framework     • Core ML Models        • Apple Intelligence │
│  • Hardware Acceleration      • Neural Engine         • Metal GPU          │
│  • Object Detection           • Face Detection        • Scene Classification│
│  • Natural Language Gen.      • VideoToolbox          • Performance Opt.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services & Ports

| Service | Port | Beschreibung |
|---------|------|--------------|
| **Frontend** | 3000 | Svelte 5 + SvelteKit Web Interface |
| **Backend** | 4001 | Node.js + Express API Server |
| **Analyzer** | 5678 | Python + FastAPI Video Processing |
| **Saliency** | 8002 | Python + FastAPI Saliency Detection |
| **Audio Separation** | 8003 | Python + FastAPI Audio Separation |
| **Qwen VL** | 8081 | Python + FastAPI Semantic Video Analysis (MLX) |
| **Vision Service** | 8080 | Swift + Vapor Apple Vision Framework |
| **PostgreSQL** | 5432 | Hauptdatenbank |
| **Redis** | 6379 | Cache & Session Store |
| **Nginx** | 80/443 | Reverse Proxy |

## Schnellstart

### 1. Alle Services starten

```bash
# Vision Service
cd packages/vision-service && swift run VisionService &

# Backend Service
cd packages/backend && npm start &

# Analyzer Service
cd packages/analyzer && python -m uvicorn src.api.server:app --host 0.0.0.0 --port 5678 &

# Frontend Development Server
cd packages/frontend && npm run dev &
```

### 2. Docker Compose (Empfohlen)

```bash
# Alle Services mit Docker starten
docker-compose up -d

# Status prüfen
docker-compose ps

# Logs anzeigen
docker-compose logs -f
```

### 3. Einzelne Services testen

```bash
# Vision Service Health Check
curl http://localhost:8080/health

# Backend Health Check
curl http://localhost:4001/health

# Qwen VL Health Check
curl http://localhost:8081/health

# Analyzer Health Check
curl http://localhost:5678/health

# Frontend
open http://localhost:3000
```

## API Endpoints Übersicht

### Frontend (SvelteKit)
- **GET** `/` - Dashboard
- **GET** `/upload` - Video Upload
- **GET** `/videos/[id]` - Video Detail mit Vision Analysis

### Backend (Express)
- **GET** `/health` - Service Health
- **GET** `/api/videos` - Video Liste
- **POST** `/api/videos/upload` - Video Upload
- **GET** `/api/videos/:id` - Video Details
- **GET** `/api/videos/:id/vision` - Vision Analysis Data
- **POST** `/api/videos/:id/vision/analyze` - Trigger Vision Analysis
- **POST** `/api/videos/:id/qwenVL/analyze` - Trigger Qwen VL Analysis
- **GET** `/api/videos/:id/qwenVL/status` - Qwen VL Analysis Status

### Qwen VL Service (FastAPI)
- **GET** `/health` - Service Health
- **GET** `/model/info` - Model Information
- **POST** `/analyze/image` - Single Image Analysis
- **POST** `/analyze/video-frames` - Multi-Frame Video Analysis

### Analyzer (FastAPI)
- **GET** `/health` - Service Health
- **POST** `/analyze` - Video Analysis
- **GET** `/analyze/:id/status` - Analysis Status

### Vision Service (Vapor)
- **GET** `/health` - Service Health
- **POST** `/analyze/vision` - Vision Analysis
- **GET** `/models` - Core ML Models
- **GET** `/apple-intelligence` - Apple Intelligence Info
- **GET** `/hardware-acceleration` - Hardware Acceleration Info
- **GET** `/performance` - Performance Metrics

## Datenfluss

```
1. Video Upload (Frontend → Backend)
   ↓
2. Video Storage (Backend → File System)
   ↓
3. Scene Detection (Backend → Analyzer)
   ↓
4. Keyframe Extraction (Analyzer → File System)
   ↓
5. Vision Analysis (Analyzer → Vision Service)
   ↓
6. Results Storage (Vision Service → Backend → Database)
   ↓
7. UI Update (Backend → Frontend)
```

## Technologie-Stack

### Frontend
- **Framework:** Svelte 5 + SvelteKit
- **Styling:** Tailwind CSS + Glassmorphism
- **Icons:** Material Design Icons
- **Testing:** Vitest + Playwright
- **Build:** Vite

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL + Prisma ORM
- **File Upload:** Multer
- **Logging:** Winston
- **Testing:** Jest + Supertest

### Analyzer
- **Runtime:** Python 3.11+
- **Framework:** FastAPI
- **Video Processing:** OpenCV + FFmpeg
- **Scene Detection:** scenedetect
- **Testing:** pytest

### Vision Service
- **Runtime:** Swift 5.9+
- **Framework:** Vapor
- **Vision:** Apple Vision Framework
- **ML:** Core ML + Apple Intelligence
- **Hardware:** Metal + Neural Engine

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **Database:** PostgreSQL
- **Cache:** Redis
- **File Storage:** Local Volume Mounts

## Konfiguration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prismvid

# Redis
REDIS_URL=redis://localhost:6379

# Vision Service
VISION_SERVICE_URL=http://localhost:8080

# File Storage
STORAGE_PATH=./storage
```

### Docker Networks

- **proxy-network:** Hauptnetzwerk für alle Services
- **prismvid-network:** Isoliertes Netzwerk für PrismVid Services

## Monitoring & Debugging

### Health Checks

```bash
# Alle Services prüfen
curl http://localhost:3001/health  # Backend
curl http://localhost:5678/health  # Analyzer
curl http://localhost:8080/health  # Vision Service
```

### Logs

```bash
# Docker Logs
docker-compose logs -f [service-name]

# Lokale Logs
tail -f logs/*.log
```

### Performance Monitoring

```bash
# Vision Service Performance
curl http://localhost:8080/performance

# Hardware Acceleration Status
curl http://localhost:8080/hardware-acceleration
```

## Entwicklung

### Lokale Entwicklung

```bash
# Repository klonen
git clone <repository-url>
cd prismvid

# Dependencies installieren
npm install
pnpm install

# Services einzeln starten
npm run dev:frontend
npm run dev:backend
npm run dev:analyzer
swift run VisionService
```

### Testing

```bash
# Frontend Tests
cd packages/frontend
npm run test:unit
npm run test:e2e

# Backend Tests
cd packages/backend
npm test

# Analyzer Tests
cd packages/analyzer
pytest

# Vision Service Tests
cd packages/vision-service
swift test
```

## Deployment

### Docker Deployment

```bash
# Production Build
docker-compose -f docker-compose.prod.yml up -d

# Mit Nginx Reverse Proxy
./deploy.sh start
```

### Lokale Installation

```bash
# Alle Services installieren
./install.sh

# Services starten
./start.sh

# Services stoppen
./stop.sh
```

## Sicherheit

### Aktuelle Implementierung
- **Authentication:** Nicht implementiert (Development)
- **Authorization:** Nicht implementiert (Development)
- **CORS:** Basis-Konfiguration
- **Rate Limiting:** Nicht implementiert

### Produktions-Readiness
- [ ] JWT Authentication
- [ ] Role-based Authorization
- [ ] CORS Konfiguration
- [ ] Rate Limiting
- [ ] HTTPS/TLS
- [ ] Input Validation
- [ ] SQL Injection Protection

## Roadmap

### Phase 1: Core Features ✅
- [x] Video Upload & Storage
- [x] Scene Detection
- [x] Keyframe Extraction
- [x] Vision Analysis
- [x] Frontend UI

### Phase 2: Advanced Features ✅
- [x] Apple Vision Framework Integration
- [x] Core ML Model Support
- [x] Apple Intelligence Integration
- [x] Hardware Acceleration

### Phase 3: Production Features
- [ ] Authentication & Authorization
- [ ] Advanced Video Processing
- [ ] Batch Processing
- [ ] Real-time Streaming
- [ ] Advanced Analytics

### Phase 4: Scale & Performance
- [ ] Horizontal Scaling
- [ ] Load Balancing
- [ ] Caching Strategy
- [ ] CDN Integration
- [ ] Advanced Monitoring

## Support & Troubleshooting

### Häufige Probleme

1. **Port-Konflikte**
   ```bash
   # Alle Services stoppen
   pkill -f "node\|python\|swift"
   docker-compose down
   ```

2. **Database Connection Issues**
   ```bash
   # PostgreSQL Status prüfen
   pg_isready -h localhost -p 5432
   ```

3. **Vision Service nicht erreichbar**
   ```bash
   # Service neu starten
   cd packages/vision-service
   swift run VisionService
   ```

### Logs & Debugging

```bash
# Alle Logs anzeigen
tail -f logs/*.log

# Service-spezifische Logs
docker-compose logs -f [service-name]

# Debug-Modus
DEBUG=* npm run dev
```

---

**Version:** 1.0.0  
**Letztes Update:** 2025-10-20  
**Status:** Development Ready
