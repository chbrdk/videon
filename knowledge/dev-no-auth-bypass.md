# Frontend Dev ohne Backend (Auth-Bypass)

Für lokale Frontend-Entwicklung ohne laufendes Backend:

```bash
cd packages/frontend && npm run dev:no-auth
```

Oder manuell:
```bash
VITE_DEV_BYPASS_AUTH=true npm run dev
```

- **Aktiv nur in Dev** (`import.meta.env.DEV`)
- **Opt-in** via `VITE_DEV_BYPASS_AUTH=true`
- **Nur bei Netzwerkfehler** (Backend nicht erreichbar) – nicht bei "nicht authentifiziert"
- Auth-Check hat 3s Timeout, damit Bypass schnell greift
- API-Aufrufe (Videos, Folders etc.) schlagen weiterhin fehl – nur die UI ist navigierbar
