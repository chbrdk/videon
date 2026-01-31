# Coolify Deployment – Videon

## Bekannte Probleme nach Merge

### "Nichts zurück" / Blank / Timeout auf https://videon.projects-a.plygrnd.tech/

**Ursache (2025-01):** `envDir` in `vite.config.ts` zeigte auf Monorepo-Root (`../..`). Im Docker-Build existiert dieser Pfad nicht (Build-Kontext ist nur `packages/`), was den Build brechen kann.

**Fix:** `envDir` ist jetzt bedingt – nur wenn `package.json` im Monorepo-Root existiert, sonst `__dirname` (Frontend-Paket).

### Build-Args für Coolify

In `docker-compose.prod.yml` werden diese Build-Args gesetzt:

- `VITE_BASE_PATH=/` – App unter Root (https://videon..../)
- `PUBLIC_BACKEND_URL` – Backend-URL für API-Calls

### Checkliste bei "nichts zurück"

1. **Coolify Build-Logs prüfen** – schlägt der Frontend-Build fehl?
2. **Container-Logs** – startet Nginx, gibt es Fehler?
3. **Healthcheck** – `curl http://localhost:80/` im Container
4. **Env-Variablen** – `VITE_BASE_PATH`, `PUBLIC_BACKEND_URL` in Coolify gesetzt?
