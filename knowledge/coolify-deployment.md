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

### Auth-Bypass (Default seit Jan 2025)

**Default:** `VITE_PUBLIC_BYPASS_AUTH=true` – App lädt ohne Session (Coolify-kompatibel).

**Für echte Auth:** In Coolify Build-Args setzen:
- `VITE_PUBLIC_BYPASS_AUTH=false`

Dann müssen Proxy-Header (X-Forwarded-Proto, X-Forwarded-For) und Session-Cookie korrekt konfiguriert sein.

### Spinner überall (Jan 2025)

**Ursache:** Route-Erkennung oder Auth-Check hängt.

**Fixes (Layout):**
1. **Sofortige Route-Erkennung** – `isPublicRoute` wird aus `window.location.pathname` initialisiert (verhindert Spinner-Flash auf /login)
2. **Fallback in $effect** – Falls `page.url.pathname` noch nicht bereit, wird `window.location.pathname` verwendet
3. **checkAuth finally** – Nutzt `window.location.pathname` für `isPublicRoute`, falls $effect noch nicht lief
4. **Stale-Detection** – Nach 8s Spinner: Fehlermeldung + "Seite neu laden" Button
5. **Timeout-Redirect** – Nach 6s hängendem Auth-Check: Redirect zu /login
6. **Zentrale Route-Logik** – `$lib/utils/routes.ts` mit `isPathPublic()` (base-aware)

### Checkliste bei "nichts zurück" / Spinner

1. **Coolify Build-Logs prüfen** – schlägt der Frontend-Build fehl?
2. **Container-Logs** – startet Nginx, gibt es Fehler?
3. **Healthcheck** – `curl http://localhost:80/` im Container
4. **Env-Variablen** – `VITE_BASE_PATH=/`, `PUBLIC_BACKEND_URL` leer oder öffentliche URL
5. **Proxy** – Coolify muss `/api` zum Frontend-Container routen (Frontend-Nginx proxied dann zum Backend)
6. **Proxy-Header** – Frontend-Nginx leitet X-Forwarded-Proto und X-Forwarded-For an Backend weiter (für Session-Cookie)
