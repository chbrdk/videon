# UNION Settings Integration für VIDEON

## Übersicht

VIDEON nutzt jetzt die zentrale API-Key-Verwaltung von UNION für OpenAI und ElevenLabs Keys.

## Implementierung

### Erstellt

1. **Config:**
   - `packages/backend/src/config/union.ts` - UNION Konfiguration

2. **Client:**
   - `packages/backend/src/services/union-settings.client.ts` - UNION Settings Client (TypeScript)

3. **Utils:**
   - `packages/backend/src/utils/union-init.ts` - Initialisierung beim App-Start
   - `packages/backend/src/utils/elevenlabs-factory.ts` - Factory für ElevenLabs Client

4. **Integration:**
   - `packages/backend/src/services/openai.service.ts` - Unterstützt UNION Keys
   - `packages/backend/src/routes/voice-segment.routes.ts` - Lädt ElevenLabs Client von UNION
   - `packages/backend/src/app.ts` - Initialisiert UNION Settings beim Start

## Konfiguration

### Environment Variables

Füge zu `.env` oder `docker-compose.yml` hinzu:

```env
# UNION Settings
UNION_SETTINGS_ENABLED=true
UNION_BASE_URL=http://msqdx-unison-unison-1:8000
UNION_SETTINGS_CACHE_TTL=900

# Fallback (werden überschrieben wenn UNION Keys verfügbar sind)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

## Funktionsweise

### App-Start

1. **UNION Init läuft beim Start:**
   - Lädt alle Keys für `videon` von UNION
   - Setzt `process.env.OPENAI_API_KEY` und `process.env.ELEVENLABS_API_KEY`
   - Services verwenden dann diese Environment Variables

2. **Services initialisieren:**
   - `OpenAIService` verwendet `process.env.OPENAI_API_KEY`
   - `ElevenLabsClient` wird über Factory erstellt (lädt von UNION)

### Caching

- **In-Memory Cache:** 15 Minuten TTL (konfigurierbar)
- **Cache-Key Format:** `union:settings:videon:{key_name}`
- **Automatische Invalidierung:** Nach TTL

### Fallback

- Wenn UNION nicht erreichbar: Verwendet Environment Variables
- Wenn auch keine Env-Vars: Service schlägt fehl (erwartetes Verhalten)

## Verwendung

### OpenAI Service

```typescript
// Automatisch mit UNION Key initialisiert (über process.env)
const openaiService = new OpenAIService();
```

### ElevenLabs Client

```typescript
import { getElevenLabsClient } from '../utils/elevenlabs-factory';

// Lädt automatisch von UNION
const client = await getElevenLabsClient();
```

## Keys in UNION setzen

### Über Admin UI

1. Öffne: `http://localhost:3000/settings/api-keys`
2. Wähle "VIDEON" Tab
3. Klicke "Add API Key"
4. Füge hinzu:
   - `openai_api_key` - OpenAI API Key
   - `elevenlabs_api_key` - ElevenLabs API Key

### Über API

```bash
curl -X POST http://localhost:8010/api/admin/settings/keys \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "videon",
    "key_name": "openai_api_key",
    "key_value": "sk-...",
    "description": "OpenAI API Key for VIDEON"
  }'

curl -X POST http://localhost:8010/api/admin/settings/keys \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "videon",
    "key_name": "elevenlabs_api_key",
    "key_value": "...",
    "description": "ElevenLabs API Key for VIDEON"
  }'
```

## Testing

### Test UNION Connection

```bash
# Prüfe ob UNION erreichbar ist
curl "http://localhost:8010/api/admin/settings/keys-all?service_name=videon"
```

### Test nach Rebuild

```bash
cd /Users/m4-dev/Development/videon
docker compose build backend
docker compose restart backend

# Prüfe Logs
docker logs videon-backend --tail 50 | grep -i "union\|openai\|elevenlabs"
```

**Erwartete Logs:**
- `UNION Settings Client initialized`
- `Keys loaded from UNION`
- `OpenAI API key updated from UNION` (falls geändert)
- `ElevenLabs API key updated from UNION` (falls geändert)

## Troubleshooting

### Keys werden nicht geladen

1. Prüfe `UNION_BASE_URL` Konfiguration
2. Prüfe ob UNION erreichbar ist
3. Prüfe Logs: `docker logs videon-backend | grep union`

### Service verwendet alte Keys

- Cache-TTL ist 15 Minuten
- Keys werden beim App-Neustart aktualisiert
- Bei dringendem Update: Service neustarten

### UNION nicht erreichbar

- Service verwendet Environment Variables als Fallback
- Funktioniert weiterhin
- Prüfe UNION Service Status

## Dokumentation

- UNION Docs: `/Users/m4-dev/Development/UNION/msqdx-unison/docs/API_SETTINGS.md`
- ECHON Integration: `/Users/m4-dev/Development/ECHON/knowledge/02-backend/16-centralized-api-key-management.md`
