# After Effects Proxy Server

Ein einfacher Proxy-Server, der ExtendScript HTTP-Requests an das PrismVid-Backend weiterleitet.

## Problem

ExtendScript hat Einschränkungen beim direkten HTTP-Request an externe Server.

## Lösung

Dieser Proxy-Server läuft lokal und macht Requests für das ExtendScript.

## Installation

```bash
cd tools/ae-proxy-server
# No npm install needed - only uses Node.js built-ins
```

## Verwendung

### Starten

```bash
node server.js
```

ODER

```bash
npm start
```

### Endpunkte

- Health Check: `http://localhost:8080/health`
- Search: `http://localhost:8080/proxy/search?q=<query>`

### Im ExtendScript nutzen

Statt:
```javascript
var url = "http://localhost:4001/api/search?q=test";
```

Nutze:
```javascript
var url = "http://localhost:8080/proxy/search?q=test";
```

## Konfiguration

Environment-Variablen:

```bash
# Backend URL
BACKEND_URL=http://localhost:4001

# Proxy Port
PORT=8080
```

Standard:
- Backend: `http://localhost:4001`
- Proxy: `http://localhost:8080`

## Vorteile

✅ Funktioniert mit ExtendScript  
✅ CORS aktiviert  
✅ Einfaches Deployment  
✅ Keine zusätzlichen Abhängigkeiten  

## Nachteile

⚠️ Zusätzlicher Prozess nötig  
⚠️ Muss laufen, damit Script funktioniert  

## Deployment

### Lokal

```bash
# Terminal 1: Backend
cd /Volumes/DOCKER_EXTERN/prismvid
docker-compose up backend

# Terminal 2: Proxy
cd tools/ae-proxy-server
node server.js

# After Effects: Script ausführen
```

### Als System Service (macOS)

```bash
# Create LaunchAgent
cat > ~/Library/LaunchAgents/com.prismvid.proxy.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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
</dict>
</plist>
EOF

# Load service
launchctl load ~/Library/LaunchAgents/com.prismvid.proxy.plist
```

## Troubleshooting

### "Cannot connect"

- Backend läuft? → `docker ps`
- Proxy läuft? → `curl http://localhost:8080/health`
- Firewall?

### Script funktioniert nicht

- Preferences > General > Allow Scripts to Access Network
- Proxy läuft?
- Backend läuft?

## Nächste Schritte

1. Proxy starten: `node server.js`
2. Script in After Effects anpassen (proxy URL nutzen)
3. Script ausführen
4. Profit! 🎉
