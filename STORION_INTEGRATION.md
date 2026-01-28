# VIDEON STORION/UNION Integration

## Übersicht

VIDEON nutzt jetzt die zentrale STORION/UNION Infrastruktur, genau wie ECHON und AUDION. Dies ermöglicht:

- **Zentrale Datenbank**: PostgreSQL mit Schema-basierter Trennung (`videon` Schema)
- **Zentrale Storage**: STORION File Storage Service für alle Dateien
- **Zentrale Cache**: UNION Redis für Caching
- **Konsistente Infrastruktur**: Wie ECHON/AUDION

## Architektur

```
VIDEON Services
    │
    ├─ Backend (Node.js)
    │   ├─ Database: STORION PostgreSQL (videon schema)
    │   ├─ Storage: STORION File Storage API
    │   └─ Cache: UNION Redis
    │
    └─ Python Services
        ├─ Analyzer
        ├─ Saliency Service
        ├─ Audio Services
        └─ Qwen VL Service
```

## STORION Integration

### Datenbank

**Schema-basierte Trennung:**
- ECHON nutzt Schema: `echon`
- AUDION nutzt Schema: `audion`
- VIDEON nutzt Schema: `videon`

**Connection String:**
```
STORION_DATABASE_URL=postgresql+psycopg://unison:unison@msqdx-unison-postgres-1:5432/storion
```

**Prisma Schema:**
- Nutzt `search_path = videon, public` für Schema-Isolation
- Alle Tabellen werden im `videon` Schema erstellt

**Migration:**
Das `videon` Schema muss in STORION erstellt werden:
```sql
-- In STORION PostgreSQL
CREATE SCHEMA IF NOT EXISTS videon;
GRANT ALL ON SCHEMA videon TO unison;
```

### File Storage

**STORION Storage Service:**
- Base URL: `http://storion:8003` (Docker) oder `http://localhost:8003` (lokal)
- Storage Paths:
  - Videos: `videon/videos/`
  - Keyframes: `videon/keyframes/`
  - Audio Stems: `videon/audio_stems/`
  - Thumbnails: `videon/thumbnails/`

**API Endpoints:**
- Upload: `POST /api/v1/files/upload` (service=videon, entity_type, entity_id)
- Download: `GET /api/v1/files/{file_id}/download`
- Metadata: `GET /api/v1/files/{file_id}`
- List: `GET /api/v1/files?service=videon&entity_type=...&entity_id=...`
- Delete: `DELETE /api/v1/files/{file_id}`

**Storage Service:**
- `src/services/storage/index.ts` - Unified Storage Interface
- `src/services/storage/storion.client.ts` - STORION API Client
- Automatischer Fallback zu lokalem Storage, wenn STORION nicht verfügbar

## Konfiguration

### Environment Variables

```bash
# STORION Database
USE_STORION_DB=true
STORION_DATABASE_URL=postgresql+psycopg://unison:unison@msqdx-unison-postgres-1:5432/storion

# STORION Storage
STORION_STORAGE_URL=http://storion:8003
STORION_BASE_URL=http://storion:8003

# UNION Integration
UNION_BASE_URL=http://msqdx-unison-unison-1:8000
REDIS_URL=redis://msqdx-unison-redis-1:6379/0
```

### Docker Compose Anpassungen

1. **Entfernte lokale Services:**
   - ❌ `postgres` Service entfernt
   - ❌ `redis` Service entfernt
   - ✅ Nutzt externe Netzwerke: `ion-network`, `echon-network`

2. **Externe Netzwerke:**
   ```yaml
   networks:
     ion-network:
       name: ion-network
       external: true
     echon-network:
       name: echon-network
       external: true
   ```

3. **Environment Variables:**
   - Alle Services nutzen `STORION_DATABASE_URL`
   - Backend nutzt `STORION_STORAGE_URL` für File Storage
   - Redis URL zeigt auf UNION Redis

## Migration Steps

### 1. Datenbank Schema erstellen

```sql
-- In STORION PostgreSQL (via UNION docker-compose)
CREATE SCHEMA IF NOT EXISTS videon;
GRANT ALL ON SCHEMA videon TO unison;
```

### 2. Prisma Migration

```bash
# Setze STORION_DATABASE_URL
export STORION_DATABASE_URL="postgresql+psycopg://unison:unison@localhost:7505/storion"
export USE_STORION_DB=true

# Führe Migration aus
cd packages/backend
npx prisma migrate dev --name init_videon_schema
```

### 3. Storage Migration (Optional)

Bestehende lokale Dateien können zu STORION migriert werden:
- Nutze STORION API für Upload
- Oder behalte lokales Storage als Fallback

### 4. Docker Compose starten

```bash
# Stelle sicher, dass UNION/STORION läuft
cd ../UNION/msqdx-unison
docker compose up -d

# Starte VIDEON
cd ../../videon
docker compose up -d
```

## Code-Änderungen

### 1. Konfiguration

**`src/config/storion.ts`** - STORION Config Helper
- `getStorionConfig()` - STORION Konfiguration
- `getDatabaseUrl()` - Database URL mit STORION Support
- `getStorageConfig()` - Storage Config (STORION oder lokal)

**`src/config/index.ts`** - Erweitert für STORION
- `database.useStorion` - Flag für STORION DB
- `storage.type` - 'storion' oder 'local'
- `services.storion` - STORION Service URL

### 2. Storage Service

**`src/services/storage/index.ts`** - Unified Storage Interface
- `getStorageService()` - Gibt STORION oder Local Storage zurück
- Automatischer Fallback zu lokalem Storage

**`src/services/storage/storion.client.ts`** - STORION API Client
- `uploadFile()` - Upload zu STORION
- `downloadFile()` - Download von STORION
- `deleteFile()` - Löschen von STORION
- `getFileMetadata()` - File Metadaten

### 3. Prisma Client

**`src/lib/prisma.ts`** - Erweitert für Schema-Support
- Unterstützt STORION Database URL
- Schema wird via `search_path` gesetzt (in DB Migration)

## Verwendung

### Storage Service nutzen

```typescript
import { getStorageService } from './services/storage';

const storage = getStorageService();

// Upload
await storage.uploadFile('/local/path/video.mp4', 'videos/video.mp4', 'video-id');

// Download
await storage.downloadFile('storion-file-id', '/local/path/downloaded.mp4');

// Delete
await storage.deleteFile('storion-file-id');

// Check existence
const exists = await storage.fileExists('storion-file-id');
```

### STORION Client direkt nutzen

```typescript
import { getStorionClient } from './services/storage/storion.client';

const client = getStorionClient();
if (client) {
  const result = await client.uploadFile('/path/to/file', 'video', 'entity-id');
  console.log('File ID:', result.fileId);
}
```

## Vorteile

1. **Zentrale Datenbank:** Ein PostgreSQL für alle Services
2. **Zentrale Storage:** Ein Storage-Service für alle Dateien
3. **Konsistente Infrastruktur:** Wie ECHON/AUDION
4. **Einfacheres Management:** Weniger Services zu verwalten
5. **Skalierbarkeit:** Zentrale Ressourcen können besser skaliert werden
6. **Backup:** Zentrale Backup-Strategie für alle Services

## Fallback-Verhalten

- **Database:** Falls `STORION_DATABASE_URL` nicht gesetzt, nutzt lokale `DATABASE_URL`
- **Storage:** Falls STORION nicht verfügbar, nutzt lokales File Storage
- **Redis:** Falls UNION Redis nicht verfügbar, kann lokaler Redis genutzt werden

## Troubleshooting

### Database Connection Issues

```bash
# Prüfe STORION Database
docker exec -it msqdx-unison-postgres-1 psql -U unison -d storion -c "\dn"

# Prüfe videon Schema
docker exec -it msqdx-unison-postgres-1 psql -U unison -d storion -c "SELECT * FROM information_schema.schemata WHERE schema_name = 'videon';"
```

### Storage Issues

```bash
# Prüfe STORION Service
curl http://localhost:8003/health

# Prüfe File Upload
curl -X POST http://localhost:8003/api/v1/files/upload \
  -F "file=@test.mp4" \
  -F "service=videon" \
  -F "entity_type=video" \
  -F "entity_id=test-id"
```

### Network Issues

```bash
# Prüfe externe Netzwerke
docker network ls | grep -E "ion-network|echon-network"

# Prüfe Container-Netzwerk
docker inspect videon-backend | grep -A 10 Networks
```

## Migration Checklist

- [x] STORION Config Helper erstellt
- [x] Backend Config für STORION angepasst
- [x] Docker Compose für externe Netzwerke angepasst
- [x] Storage Service mit STORION Client erstellt
- [x] Prisma Client für Schema-Support vorbereitet
- [x] STORION Schema `videon` erstellt ✅
- [x] Prisma Migration durchgeführt ✅ (15 Tabellen erstellt)
- [x] Verification erfolgreich ✅
- [ ] Storage-Migration durchführen (optional)
- [ ] Tests durchführen
- [x] Dokumentation aktualisiert

## Status: ✅ ERFOLGREICH INTEGRIERT

### Abgeschlossen:
1. ✅ **Schema erstellt:** `videon` Schema in STORION erstellt
2. ✅ **Migration durchgeführt:** 15 Tabellen im `videon` Schema erstellt
3. ✅ **Verification:** Alle Checks erfolgreich

### Tabellen im videon Schema:
- analysis_logs, audio_stems, folders, project_history, project_scenes
- projects, reframed_videos, saliency_analyses, scenes, search_indices
- transcriptions, videos, vision_analyses, voice_clones, voice_segments

### Nächste Schritte:
1. **Environment Variables setzen** in `.env`:
   ```bash
   USE_STORION_DB=true
   STORION_DATABASE_URL=postgresql+psycopg://unison:unison@msqdx-unison-postgres-1:5432/storion
   STORION_STORAGE_URL=http://storion:8003
   REDIS_URL=redis://msqdx-unison-redis-1:6379/0
   ```

2. **Services starten:**
   ```bash
   docker compose up -d
   ```

3. **Testen:** Teste Upload/Download mit STORION

## Referenzen

- [STORION README](../../STORION/README.md)
- [UNION Konzept](../../UNION/UNISON-Konzept.md)
- [ECHON STORION Integration](../../ECHON/apps/api/app/db.py)
