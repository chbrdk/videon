# Storybook Docker Container

Storybook läuft in einem separaten Docker Container, losgelöst vom Haupt-Frontend.

## Container-Start

### Option 1: Separates docker-compose File (Empfohlen)

Für isoliertes Storybook ohne andere Services:

```bash
# Netzwerk erstellen (falls nicht vorhanden)
docker network create prismvid-network 2>/dev/null || true

# Storybook starten
docker-compose -f docker-compose.storybook.yml up -d

# Logs anzeigen
docker-compose -f docker-compose.storybook.yml logs -f storybook
```

### Option 2: Integriert in Haupt-docker-compose.yml

Storybook ist auch in der Haupt-docker-compose.yml integriert:

```bash
# Storybook zusammen mit anderen Services starten
docker-compose up -d storybook

# Nur Storybook starten (ohne Dependencies)
docker-compose up -d storybook

# Logs anzeigen
docker-compose logs -f storybook
```

## Zugriff

Nach dem Start ist Storybook verfügbar unter:
- **Lokal**: http://localhost:6006
- **Netzwerk**: http://192.168.50.101:6006 (oder entsprechende IP)

**Hinweis**: Der Container startet Storybook im Development-Modus mit Hot Reload. Änderungen am Code werden automatisch übernommen.

## Features

- ✅ **Hot Reload**: Source-Code wird gemountet für sofortige Updates
- ✅ **Isoliert**: Läuft unabhängig vom Frontend-Container
- ✅ **Development-Modus**: Optimiert für Entwicklung
- ✅ **Netzwerk**: Teil des `prismvid-network` für interne Kommunikation

## Container-Details

- **Container Name**: `prismvid-storybook`
- **Port**: `6006`
- **Image**: Wird aus `packages/frontend/Dockerfile.storybook` gebaut
- **Umgebung**: Development (NODE_ENV=development)

## Volumes

Die folgenden Verzeichnisse werden gemountet für Hot Reload:

- `./packages/frontend/src` → `/app/src`
- `./packages/frontend/.storybook` → `/app/.storybook`
- Konfigurationsdateien (svelte.config.js, vite.config.ts, etc.)

`node_modules` wird **nicht** gemountet - verwendet die Container-Version.

## Befehle

### Container neu bauen
```bash
docker-compose -f docker-compose.storybook.yml build storybook
# oder
docker-compose build storybook
```

### Container stoppen
```bash
docker-compose -f docker-compose.storybook.yml down
# oder
docker-compose stop storybook
```

### Container-Logs
```bash
docker-compose -f docker-compose.storybook.yml logs -f storybook
# oder
docker-compose logs -f storybook
```

### Shell in Container
```bash
docker exec -it prismvid-storybook sh
```

## Troubleshooting

### Port bereits belegt
Wenn Port 6006 bereits verwendet wird:
```yaml
ports:
  - "0.0.0.0:6007:6006"  # Externer Port ändern
```

### Dependencies nicht installiert
```bash
docker-compose -f docker-compose.storybook.yml build --no-cache storybook
```

### Hot Reload funktioniert nicht
Stelle sicher, dass Volumes korrekt gemountet sind:
```bash
docker-compose -f docker-compose.storybook.yml config | grep -A 10 storybook
```

## Production Build

Für statischen Storybook-Build:

```bash
# Im Container
docker exec -it prismvid-storybook npm run build-storybook

# Build-Verzeichnis kopieren
docker cp prismvid-storybook:/app/storybook-static ./storybook-static
```

Oder alternativ ein separates Production-Dockerfile erstellen, das `build-storybook` ausführt und mit nginx serviert.

## Integration in CI/CD

Der Storybook-Container kann auch in CI/CD-Pipelines verwendet werden:

```yaml
# Beispiel GitHub Actions
- name: Build Storybook
  run: |
    docker-compose -f docker-compose.storybook.yml build storybook
    docker-compose -f docker-compose.storybook.yml up -d storybook
```

