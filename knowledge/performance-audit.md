# Performance Audit (Repo-weit)

Stand: 2026-04-09  
Scope: `packages/frontend` (SvelteKit/Vite), `packages/backend` (Express/Prisma/Redis), `packages/analyzer` (FastAPI/FFmpeg/ML), Docker/Compose.

## Zielbild

- **Schnelle API**: niedrige P95-Latenzen bei Listen-/Search-Endpunkten, keine N+1-Patterns, kontrollierte Concurrency bei externen Calls.
- **Stabiles Processing**: ML/FFmpeg Jobs laufen effizient (Streaming statt Full-buffer), saubere Job-Queues, klare Ressourcenlimits.
- **Kleiner & reproduzierbarer Build**: Lockfiles, deterministische Container-Builds, keine Debug-Artefakte im Production-Image.
- **Messbarkeit**: p50/p95, CPU/RAM, Queue-Längen, DB-Query-Zeiten, Cache-Hit-Rate.

## Quick Wins (hoher Impact, geringe Invasivität)

### Backend (Node/Express/Prisma)

- **PrismaClient zentralisieren**: Mehrere Services instanziieren `new PrismaClient()` (z.B. `VisionService`, `VoiceSegmentService`). Das erhöht Connection-Pressure und Latenzspikes. Ziel: überall den Singleton aus `src/lib/prisma.ts` verwenden.
- **DB-Writes in Loops vermeiden**: `VoiceSegmentService.createSegmentsFromTranscription()` schreibt Segmente sequentiell via `prisma.voiceSegment.create()` in einer Schleife. Ziel: `createMany()` (oder Batch/Transaktion) + optional parallele Verarbeitung mit Concurrency-Limit.
- **Doppelte Initialisierung entfernen**: `initializeUnionSettings()` wird in `src/app.ts` zweimal gestartet (einmal oben „before anything else“, einmal später nochmals). Das ist unnötige IO/Log-Spam beim Start.
- **Request-Logging günstiger machen**: pro Request wird `logger.info` mit UA/IP geschrieben. In Produktion kann das teuer sein (I/O + JSON serialization). Ziel: Sampling / Levels / nur Fehler + langsame Requests.

### Docker/Build

- **Backend Dockerfile auf Lockfile umstellen**: `packages/backend/Dockerfile` nutzt `npm install` ohne Lockfile. Für Performance + Reproduzierbarkeit: `npm ci` mit `package-lock.json` (oder konsistent `pnpm` + `pnpm-lock.yaml`, aber nicht beides).
- **Frontend Dockerfile Debug entfernen**: `packages/frontend/Dockerfile` enthält `npm config list`, `cat package.json`, verbose install, „Trojan Horse“ Debug-Build-Skript. Das verlangsamt Builds massiv und sollte für Production entfernt bzw. via `ARG DEBUG_BUILD=1` opt-in werden.
- **Prisma `db push` beim Container-Start vermeiden**: In Compose/Backend `command` wird `npx prisma db push --accept-data-loss` beim Start ausgeführt. Das ist teuer, riskant und kann Startzeiten stark erhöhen. Ziel: Migrationen/Schema-Management als Deployment-Schritt, nicht bei jedem Start.

## Beobachtungen (Hotspots / Risiken)

### Backend Entry-Point

- `packages/backend/src/app.ts` setzt viele Middleware; aktuell ist Rate-Limit auskommentiert; CORS `origin: true` (alle Origins) ist dev-freundlich, aber kann in Prod unnötige Variabilität erzeugen.
- Server-Timeouts sind sehr hoch (30 Minuten), was bei vielen parallelen Uploads zu Thread/Socket-Pressure führen kann. Ziel: Uploads via presigned URLs/Chunking/Background Jobs.

### Datenmodell (Prisma)

- Viele Tabellen haben Indizes auf FK-IDs (gut). **Potenzial**:
  - Häufige Filter nach `userId` (Videos/Projects/Folders): prüfen ob Indizes fehlen (z.B. `Video.userId`, `Project.userId`, `Folder.userId`).
  - `SearchIndex.embedding` als JSON-String: Suche/Ranking kann teuer werden. Mittel-/Langfristig: Vektor-DB / pgvector + proper index.

### Analyzer (Python/FFmpeg/ML)

- `packages/analyzer/requirements.txt` ist sehr schwergewichtig (torch, whisper, ultralytics, mediapipe, segment-anything). Das hat direkte Auswirkungen auf Build-Zeiten, Container-Größe und Startzeit. Ziel: schlankere Images, Layer-Caching, optional Feature-Flags/Separate Worker Images.

## Mess- & Testplan (sollte CI-Standard werden)

### Backend

- **Unit/Integration**: `npm test`
- **Smoke**: `GET /api/health`
- **Load** (empfohlen): k6/vegeta auf `/api/videos`, `/api/search` (mit realistischen Payloads).
- **DB**: Prisma query logging für slow queries (z.B. via middleware) + Postgres `pg_stat_statements`.

### Frontend

- **Unit**: `npm test` (vitest)
- **Bundle**: `vite build` + Analyse (`rollup-plugin-visualizer` oder `vite-bundle-visualizer`)
- **Runtime**: Web Vitals (LCP/INP/CLS), Netzwerk-Wasserfall.

### Analyzer

- **Pytests**: `pytest -q`
- **Profiling**: `cProfile`/`py-spy` auf Keyframe Extraction / Scene Detection / Audio Separation.

## Nächste Schritte (konkret)

1. Backend: PrismaClient Konsolidierung + `createMany` für Voice-Segmente (inkl. Test).
2. Docker: Lockfile-Strategie entscheiden (npm vs pnpm) und Dockerfiles auf deterministic installs umbauen.
3. Compose/Deploy: Migrationen aus Startkommando herausziehen; separate „migrate“ job.
4. Frontend: Bundle-Analyse und große Dependencies/Routes identifizieren (Code-splitting, lazy loading).
5. Observability: Metriken (HTTP durations, queue length, db timings) zentral erfassen.

