# Proxy Server starten

## Setup

### 1. Backend läuft bereits ✅

Dein Docker-Backend ist bereits aktiv auf `localhost:4001`

### 2. Proxy Server starten

```bash
# Im Terminal öffnen
cd /Volumes/DOCKER_EXTERN/prismvid/tools/ae-proxy-server
node server.js
```

Der Server läuft jetzt auf `http://localhost:8080`

### 3. Script in After Effects ausführen

1. After Effects öffnen
2. **File > Scripts > Run Script File...**
3. `PrismVidSceneSearch.jsx` wählen
4. Script ausführen

### 4. Testen

1. "Test Connection" klicken
2. Wenn Connection OK → Du kannst suchen!
3. Suchbegriff eingeben
4. "Search" klicken
5. Ergebnisse erscheinen

## Troubleshooting

### Proxy läuft nicht

```bash
# Prüfen ob Port 8080 frei ist
lsof -i :8080

# Falls belegt:
PORT=8081 node server.js
```

### Connection failed

- Backend prüfen: `docker ps`
- Proxy läuft? → Terminal prüfen
- Firewall?
- Script > Preferences > Allow Scripts...

## Quick Start (Copy & Paste)

```bash
# Terminal 1: Backend (falls nicht läuft)
cd /Volumes/DOCKER_EXTERN/prismvid
docker-compose up backend

# Terminal 2: Proxy
cd /Volumes/DOCKER_EXTERN/prismvid/tools/ae-proxy-server
node server.js

# Dann in After Effects: Script ausführen
```

## Auto-Start (Optional)

Den Proxy als automatischen Start einrichten:

```bash
# macOS LaunchAgent erstellen (einmal)
cat > ~/Library/LaunchAgents/com.prismvid.proxy.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.prismvid.proxy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Volumes/DOCKER_EXTERN/prismvid/tools/ae-proxy-server/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Volumes/DOCKER_EXTERN/prismvid/tools/ae-proxy-server</string>
</dict>
</plist>
EOF

# Service laden
launchctl load ~/Library/LaunchAgents/com.prismvid.proxy.plist

# Status prüfen
launchctl list | grep prismvid
```

Fertig! Der Proxy startet jetzt automatisch beim Login.

