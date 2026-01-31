# Coolify Deployment – Videon

## Bekannte Probleme nach Merge

### "Nichts zurück" / Blank / Timeout auf https://videon.projects-a.plygrnd.tech/

**Ursache (2025-01):** `envDir` in `vite.config.ts` zeigte auf Monorepo-Root (`../..`). Im Docker-Build existiert dieser Pfad nicht (Build-Kontext ist nur `packages/`), was den Build brechen kann.

**Fix:** `envDir` ist jetzt bedingt – nur wenn `package.json` im Monorepo-Root existiert, sonst `__dirname` (Frontend-Paket).

### Build-Args für Coolify

In `docker-compose.prod.yml` werden diese Build-Args gesetzt:

- `VITE_BASE_PATH=/` – App unter Root (https://videon..../)
- `PUBLIC_BACKEND_URL` – Backend-URL für API-Calls

### Spinner hängt (Auth-Check)

**Ursache:** `PUBLIC_BACKEND_URL` zeigt auf interne Docker-Adresse (z.B. `http://backend:4001`), die der Browser nicht erreicht.

**Fix:** Frontend erkennt interne Docker-URLs zur Laufzeit und nutzt stattdessen Same-Origin (`/api`). Coolify/Nginx proxied `/api` zum Backend.

**Coolify:** `PUBLIC_BACKEND_URL` leer lassen oder auf öffentliche URL setzen (z.B. `https://videon.projects-a.plygrnd.tech`).

### Spinner nach Login (Session-Cookie)

**Ursache:** Session-Cookie wird nach Login nicht gesendet/empfangen.

**Fixes:**
1. **Login:** `credentials: 'include'` beim fetch – Cookie wird gespeichert
2. **Backend:** `cookie.secure: 'auto'` – korrekt hinter Proxy (X-Forwarded-Proto)
3. **Coolify:** Proxy muss `X-Forwarded-Proto: https` setzen

### Schnell-Fix: Auth-Bypass für Staging

Wenn der Spinner weiterhin hängt, in Coolify **Build-Args** setzen:

- `VITE_PUBLIC_BYPASS_AUTH=true`

→ App lädt ohne Session (Demo-Modus). **Nur für Staging/Test**, nicht für Produktion mit echten Nutzern.

### Checkliste bei "nichts zurück" / Spinner

1. **Coolify Build-Logs prüfen** – schlägt der Frontend-Build fehl?
2. **Container-Logs** – startet Nginx, gibt es Fehler?
3. **Healthcheck** – `curl http://localhost:80/` im Container
4. **Env-Variablen** – `VITE_BASE_PATH=/`, `PUBLIC_BACKEND_URL` leer oder öffentliche URL
