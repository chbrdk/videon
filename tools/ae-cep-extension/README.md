# PrismVid Scene Search - CEP Extension für After Effects

Ein CEP Panel für After Effects 25.5, das die PrismVid-Suchfunktion nutzt, um Szenen zu finden und direkt in AE zu importieren.

## Technologie

**CEP (Common Extensibility Platform)** - Stabil und vollständig unterstützt in After Effects 25.5

- HTML/CSS/JavaScript für UI
- Fetch API für HTTP-Requests
- ExtendScript Bridge für AE-Integration

## Installation

### macOS

```bash
cp -r tools/ae-cep-extension ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

### Windows

```cmd
xcopy tools\ae-cep-extension "%APPDATA%\Adobe\CEP\extensions\PrismVidSceneSearch" /E /I
```

## Verwendung

1. **After Effects öffnen**
2. **Panel öffnen**: Window > Extensions > PrismVid Scene Search
3. **Settings öffnen** (⚙️ Icon)
4. **Test Connection** (optional)
5. **Suchen**
6. **Szenen auswählen**
7. **"Add Scenes"** klicken

## Voraussetzungen

1. After Effects 25.5
2. Proxy Server läuft (`tools/ae-proxy-server/server.js`)
3. Backend läuft (`docker-compose up backend`)

## Features

✅ Vollständige GUI  
✅ Backend-Integration (Fetch API)  
✅ Multi-Select  
✅ Automatischer Import  
✅ Timecode-Trim  
✅ Sequential Placement  

## Troubleshooting

### Panel erscheint nicht

CEP Extensions aktivieren in Preferences > General > "Allow Scripts to Write Files and Access Network"

### Connection failed

- Proxy läuft? (`node tools/ae-proxy-server/server.js`)
- Backend läuft? (`docker ps`)
- Firewall?

## Entwickler

- HTML/CSS/JS: Modern web stack
- ExtendScript: AE-Integration
- CEP: Stabil, bewährt

## Support

Bei Problemen: Backend-Logs, CEP-Logs, AE Console prüfen

