# Migration Guide: PrismVid → VIDEON

Dieses Dokument beschreibt die Migration von PrismVid zu VIDEON und die wichtigsten Änderungen.

## 🎯 Übersicht

VIDEON ist eine vollständige Rebranding-Version von PrismVid mit integriertem MSQDX Design System.

## 📦 Package-Namen

Alle Package-Namen wurden von `@prismvid/*` zu `@videon/*` geändert:

- `@prismvid/frontend` → `@videon/frontend`
- `@prismvid/backend` → `@videon/backend`
- `@prismvid/audio-service` → `@videon/audio-service`
- `@prismvid/audio-separation-service` → `@videon/audio-separation-service`

## 🐳 Docker-Container

Alle Container-Namen wurden aktualisiert:

- `prismvid-*` → `videon-*`
- Netzwerk: `prismvid-network` → `videon-network`
- Volumes: `prismvid_*` → `videon_*`

## 🗄️ Datenbank

Datenbank-Konfiguration wurde aktualisiert:

- **Database**: `prismvid` → `videon`
- **User**: `prismvid` → `videon`
- **Password**: `prismvid_dev` → `videon_dev`

## 📁 Storage-Pfade

Alle Storage-Pfade wurden aktualisiert:

- `/Volumes/DOCKER_EXTERN/prismvid/storage` → `/Volumes/DOCKER_EXTERN/videon/storage`
- `/Users/m4-dev/Development/prismvid/storage` → `/Users/m4-dev/Development/videon/storage`

## 🎨 Design System Migration

### Komponenten

Alle Komponenten wurden von `udg-glass-*` zu `msqdx-*` umbenannt:

- `udg-glass-video-card.svelte` → `msqdx-video-card.svelte`
- `udg-glass-folder-card.svelte` → `msqdx-folder-card.svelte`
- `udg-glass-upload.svelte` → `msqdx-upload.svelte`
- etc.

### CSS-Klassen

CSS-Klassen wurden migriert:

- `glass-*` → `msqdx-glass-*` (neue Klassen)
- Alte `glass-*` Klassen bleiben als Alias für Backward Compatibility

### Design Tokens

Design Tokens nutzen jetzt MSQDX Design System:

```typescript
// Alt
import { lightTheme, darkTheme } from '$lib/design-tokens';

// Neu (verwendet MSQDX Tokens)
import { lightTheme, darkTheme } from '$lib/design-tokens';
// Tokens basieren jetzt auf MSQDX_COLORS, MSQDX_TYPOGRAPHY, etc.
```

## 🔄 Migration-Schritte

### 1. Projekt duplizieren

```bash
cd /Users/m4-dev/Development
cp -r prismvid videon
cd videon
```

### 2. Git Repository neu initialisieren

```bash
rm -rf .git
git init
git add .
git commit -m "Initial commit: VIDEON - Duplicated from PrismVid"
```

### 3. MSQDX Design System integrieren

```bash
git submodule add https://github.com/chbrdk/msqdx-design-system.git packages/msqdx-design-system
git submodule update --init --recursive
```

### 4. Dependencies installieren

```bash
# Frontend
cd packages/frontend
npm install

# Backend
cd ../backend
npm install
```

### 5. Docker Container neu starten

```bash
docker compose down
docker compose up -d --build
```

## ⚠️ Breaking Changes

1. **Komponenten-Imports**: Alle `UdgGlass*` Imports müssen zu `Msqdx*` geändert werden
2. **CSS-Klassen**: Neue `msqdx-glass-*` Klassen sollten bevorzugt werden
3. **Package-Namen**: Alle `@prismvid/*` Imports müssen aktualisiert werden
4. **Environment-Variablen**: Storage-Pfade müssen angepasst werden

## 🔍 Prüfliste

- [ ] Alle Package-Namen aktualisiert
- [ ] Docker-Container-Namen geändert
- [ ] Datenbank-Konfiguration angepasst
- [ ] Storage-Pfade aktualisiert
- [ ] Komponenten-Imports aktualisiert
- [ ] CSS-Klassen migriert
- [ ] Tests aktualisiert
- [ ] Dokumentation aktualisiert

## 📞 Support

Bei Fragen zur Migration, bitte ein Issue erstellen oder das Team kontaktieren.
