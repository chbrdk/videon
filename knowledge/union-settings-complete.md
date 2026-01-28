# UNION Settings Integration - VIDEON ✅

## Implementierung abgeschlossen

VIDEON nutzt jetzt die zentrale API-Key-Verwaltung von UNION für OpenAI und ElevenLabs Keys.

## ✅ Implementiert

### Code

1. **Config:**
   - ✅ `packages/backend/src/config/union.ts`

2. **Client:**
   - ✅ `packages/backend/src/services/union-settings.client.ts`
   - ✅ In-Memory Caching (15 min TTL)
   - ✅ Fallback zu Environment Variables

3. **Integration:**
   - ✅ `packages/backend/src/utils/union-init.ts` - Initialisierung beim Start
   - ✅ `packages/backend/src/utils/elevenlabs-factory.ts` - Factory für ElevenLabs
   - ✅ `packages/backend/src/services/openai.service.ts` - Unterstützt UNION
   - ✅ `packages/backend/src/routes/voice-segment.routes.ts` - Lädt von UNION
   - ✅ `packages/backend/src/app.ts` - Initialisiert beim Start

### Konfiguration

**docker-compose.yml:**
```yaml
environment:
  UNION_SETTINGS_ENABLED: ${UNION_SETTINGS_ENABLED:-true}
  UNION_BASE_URL: ${UNION_BASE_URL:-http://msqdx-unison-unison-1:8000}
  UNION_SETTINGS_CACHE_TTL: ${UNION_SETTINGS_CACHE_TTL:-900}
```

## Funktionsweise

### App-Start

1. **UNION Init läuft beim Start:**
   ```
   initializeUnionSettings()
     → Lädt Keys von UNION für 'videon'
     → Setzt process.env.OPENAI_API_KEY
     → Setzt process.env.ELEVENLABS_API_KEY
   ```

2. **Services verwenden Keys:**
   - `OpenAIService` verwendet `process.env.OPENAI_API_KEY`
   - `ElevenLabsClient` wird über Factory erstellt (lädt von UNION)

### Caching

- **In-Memory Cache:** 15 Minuten TTL
- **Cache wird beim App-Start geladen**
- **Bei Cache-Miss:** API-Call zu UNION

### Fallback

- Wenn UNION nicht erreichbar: Environment Variables
- Wenn auch keine Env-Vars: Service schlägt fehl (erwartetes Verhalten)

## Keys in UNION

### Aktuell vorhanden

- ✅ `videon.openai_api_key` - OpenAI API Key

### Noch zu setzen

- ⏳ `videon.elevenlabs_api_key` - ElevenLabs API Key (wird später gesetzt)

## Testing

### Keys von UNION laden

```bash
curl "http://localhost:8010/api/admin/settings/keys-all?service_name=videon"
```

### VIDEON Logs prüfen

```bash
docker logs videon-backend --tail 50 | grep -i "union\|keys loaded"
```

**Erwartete Logs:**
- `UNION Settings Client initialized`
- `Keys loaded from UNION`
- `OpenAI API key updated from UNION`

### Service Test

```bash
# Test OpenAI Service
docker exec videon-backend node -e "
const { OpenAIService } = require('./dist/services/openai.service');
const service = new OpenAIService();
console.log('OpenAI Service initialized');
"

# Test ElevenLabs Client
docker exec videon-backend node -e "
const { getElevenLabsClient } = require('./dist/utils/elevenlabs-factory');
getElevenLabsClient().then(client => {
  console.log('ElevenLabs Client:', client ? 'OK' : 'null');
});
"
```

## Nächste Schritte

### ElevenLabs Key hinzufügen

Sobald der ElevenLabs Key vorhanden ist:

1. **Über Admin UI:**
   - `http://localhost:3000/settings/api-keys`
   - VIDEON Tab → "Add API Key"
   - `elevenlabs_api_key` hinzufügen

2. **Über API:**
   ```bash
   curl -X POST http://localhost:8010/api/admin/settings/keys \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "videon",
       "key_name": "elevenlabs_api_key",
       "key_value": "...",
       "description": "ElevenLabs API Key for VIDEON"
     }'
   ```

3. **VIDEON neustarten:**
   ```bash
   docker compose restart backend
   ```

## Status

✅ **Implementierung:** Abgeschlossen  
✅ **OpenAI Key:** In UNION gesetzt  
⏳ **ElevenLabs Key:** Wird später gesetzt  
✅ **Integration:** Funktioniert

## Dokumentation

- Diese Datei: `knowledge/union-settings-integration.md`
- UNION Docs: `/Users/m4-dev/Development/UNION/msqdx-unison/docs/API_SETTINGS.md`
