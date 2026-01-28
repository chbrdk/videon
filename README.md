# VIDEON

VIDEON ist eine moderne Video-Analyse- und Bearbeitungsplattform, die automatische Szenenerkennung, KI-gestützte Analyse und professionelle Export-Funktionen bietet.

## 🚀 Features

- **Automatische Video-Analyse**: KI-gestützte Szenenerkennung und Objekterkennung
- **Audio-Trennung**: Automatische Trennung von Musik und Gesang
- **Saliency-Detection**: Intelligente Fokuserkennung für automatisches Reframing
- **Projekt-Management**: Organisierte Verwaltung von Videos und Projekten
- **Export-Funktionen**: Export zu Premiere Pro, XML, SRT und mehr
- **Modernes Design**: MSQDX Design System Integration

## 📋 Voraussetzungen

- Node.js 18+
- Docker & Docker Compose
- Python 3.12+ (für ML-Services)
- PostgreSQL 15+
- Redis 7+

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone <repository-url>
cd videon
git submodule update --init --recursive
```

### 2. Environment-Variablen konfigurieren

Kopiere `.env.example` zu `.env` und passe die Werte an:

```bash
cp .env.example .env
```

### 3. Services starten

```bash
# Mit Docker Compose
docker compose up -d

# Oder lokal (Development)
./start-dev.sh
```

## 📦 Projektstruktur

```
videon/
├── packages/
│   ├── frontend/          # SvelteKit Frontend
│   ├── backend/           # Node.js/Express Backend
│   ├── analyzer/          # Python Video Analyzer
│   ├── saliency-service/  # Saliency Detection Service
│   ├── audio-service/     # Audio Separation Service
│   ├── qwen-vl-service/   # Qwen VL Vision Service
│   └── msqdx-design-system/ # MSQDX Design System (Submodule)
├── storage/               # Video & Media Storage
├── config/                # Konfigurationsdateien
└── docker-compose.yml     # Docker Services
```

## 🎨 Design System

VIDEON nutzt das **MSQDX Design System** für konsistentes Styling:

- **Design Tokens**: Zentrale Farben, Typography, Spacing
- **Komponenten**: `msqdx-*` Komponenten für UI-Elemente
- **CSS-Klassen**: `msqdx-glass-*` für Glassmorphism-Effekte

## 🔧 Entwicklung

### Frontend Development

```bash
cd packages/frontend
npm install
npm run dev
```

### Backend Development

```bash
cd packages/backend
npm install
npm run dev
```

### Tests

```bash
# Frontend Tests
cd packages/frontend
npm test

# Backend Tests
cd packages/backend
npm test
```

## 📚 Dokumentation

- [API Dokumentation](./docs/API_DOCUMENTATION.md)
- [Design System](./packages/msqdx-design-system/README.md)
- [Migration Guide](./MIGRATION.md)
- [Branding Guide](./BRANDING.md)

## 🐳 Docker Services

- **Frontend**: Port 3003
- **Backend**: Port 4001
- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **Analyzer**: Port 8001
- **Saliency Service**: Port 8002
- **Audio Service**: Port 5679

## 📝 License

MIT

## 👥 Team

VIDEON Team
