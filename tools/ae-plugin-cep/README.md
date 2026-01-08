# PrismVid After Effects CEP Plugin

Modern CEP Plugin für PrismVid Scene Search in After Effects 2025+.

## Übersicht

Dieses Plugin ermöglicht es, Szenen direkt aus PrismVid in After Effects zu importieren, basierend auf der Suche im Backend.

## Features

- **Suche**: Recherche nach Szenen im PrismVid Backend
- **Multi-Select**: Mehrere Szenen auswählen und importieren
- **Smart Import**: Footage-Reuse (keine Duplikate)
- **Flexibel**: Neue Komposition erstellen oder bestehende verwenden
- **Sequentiell**: Mit Abstand platzieren für kontinuierliche Montagen
- **Modern**: Webpack, ES6+, Babel-Transpilation

## Voraussetzungen

- **Adobe After Effects 2025** oder neuer
- **CEP Debug Mode** aktiviert
- **Backend läuft**: `http://localhost:4001` (oder konfigurierte URL)
- **Mac**: macOS mit CEP Support

## Installation

### 1. Debug Mode aktivieren (einmalig)

```bash
npm run enable-debug:mac
# Oder manuell:
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

### 2. Dependencies installieren

```bash
cd tools/ae-plugin-cep
npm install
```

### 3. Development

```bash
# Watch-Mode für Entwicklung
npm run dev
```

### 4. Symlink erstellen (Development)

```bash
npm run symlink:mac

# Oder manuell:
ln -sf "$(pwd)/dist" "$HOME/Library/Application Support/Adobe/CEP/extensions/prismvid-search"
```

### 5. In After Effects öffnen

1. After Effects 2025 starten
2. **Window > Extensions (Legacy) > PrismVid Search**
3. Das Panel sollte sich automatisch öffnen

## Build & Production

```bash
# Production Build
npm run build

# Manuell: dist/ → CEP Extensions kopieren
cp -r dist "/Users/YOUR_USERNAME/Library/Application Support/Adobe/CEP/extensions/prismvid-search"
```

## Konfiguration

### Server Settings

Im Panel:
1. Settings-Button klicken
2. **Server URL**: Standard ist `http://localhost:4001`
3. **API Token** (optional)
4. **Default Composition Name**
5. **Save Settings**

Für Remote-Backend (z.B. Mac mini):
- Server URL: `http://192.168.50.111:4001`

### Debugging

#### Chrome DevTools

In After Effects:
1. CEP Panel öffnen
2. Browser öffnen: `http://localhost:8088`
3. Developer Tools öffnen (F12)

#### Console Logging

```javascript
// Im JavaScript Layer
console.log('Debug:', data);

// Im ExtendScript Layer
$.writeln('ExtendScript: ' + data);
```

#### CEP Logs

```bash
# Logs ansehen
tail -f ~/Library/Logs/Adobe/AfterEffects/CEP/*.log

# Oder in Console.app nach "CEP" suchen
```

## Usage

### 1. Verbindung testen

1. Settings öffnen (⚙️)
2. "Test Connection" klicken
3. Bestätigung prüfen

### 2. Suche durchführen

1. Suchbegriff eingeben
2. Enter oder "Search" klicken
3. Ergebnisse werden angezeigt

### 3. Szenen importieren

1. Checkboxen für gewünschte Szenen
2. Insert Options konfigurieren:
   - **Target Composition**: Neue erstellen oder bestehende wählen
   - **Sequential**: Aktivieren für sequentielle Platzierung
   - **Gap**: Abstand in Frames (nur bei Sequential)
3. "Insert Selected" klicken
4. Fortschritt in der Status-Bar verfolgen

## Projektstruktur

```
ae-plugin-cep/
├── src/
│   ├── jsx/              # ExtendScript Layer (ES3)
│   │   ├── hostscript.jsx
│   │   └── json2.js
│   ├── js/               # Modern JavaScript
│   │   ├── main.js       # Controller
│   │   └── api.js        # Backend Client
│   ├── styles/
│   │   └── main.css
│   └── index.html
├── CSXS/
│   └── manifest.xml
├── .debug                 # Unsigned Development
├── .vscode/              # Cursor IDE Setup
├── webpack.config.js
├── package.json
└── README.md
```

## Troubleshooting

### Panel öffnet sich nicht

1. **Debug-Mode prüfen**:
```bash
defaults read com.adobe.CSXS.11 PlayerDebugMode
# Sollte "1" sein
```

2. **Symlink prüfen**:
```bash
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
```

3. **Manifest validieren**:
```bash
cd dist
xmllint --noout CSXS/manifest.xml
```

### "Backend nicht erreichbar"

1. Backend läuft? `curl http://localhost:4001/api/health`
2. Server URL in Settings prüfen
3. Firewall/Network Issues?
4. Für Mac mini: `http://192.168.50.111:4001`

### "Video-Datei nicht gefunden"

1. Prüfen: Video in `storage/videos/` vorhanden?
2. Datei-Berechtigungen prüfen
3. Backend-Logs: `docker logs -f backend-container`

### "CSInterface is not defined"

1. CSInterface.js vorhanden in dist/js/?
2. Pfad in index.html prüfen
3. Webpack Copy Plugin korrekt?

## Development Commands

```bash
# Development (Watch-Mode)
npm run dev

# Production Build
npm run build

# Clean
npm run clean

# Symlink erstellen (Mac)
npm run symlink:mac

# Debug aktivieren (Mac)
npm run enable-debug:mac

# Debug prüfen (Mac)
npm run check-debug:mac
```

## API Integration

### Endpoints

- `GET /api/search?q=<query>&limit=20` - Suche durchführen
- `GET /api/health` - Health Check

### Response Format

```json
[
  {
    "videoId": "cmh...",
    "videoTitle": "Video Name",
    "sceneId": "scene-1",
    "startTime": 5000,
    "endTime": 10000,
    "content": "Transcript text",
    "videoFilePath": "/Volumes/DOCKER_EXTERN/prismvid/storage/videos/file.mp4",
    "videoUrl": "http://..."
  }
]
```

## Technische Details

### Architektur

- **CEP Extensions**: Adobe CEP (Common Extensibility Platform)
- **JavaScript Layer**: Modern ES6+ mit Babel-Transpilation
- **ExtendScript Layer**: ES3 für AE-Integration
- **Build**: Webpack 5 mit Babel, CSS Loaders

### Compatibility

- After Effects 2025+
- CSXS Version 11.0
- macOS mit CEP Support

### Limitations

1. **Lokale Dateien**: Plugin benötigt Zugriff auf Storage-Ordner
2. **FPS**: Nutzt aktuell Project-FPS
3. **CORS**: Proxy-Server für Backend-Kommunikation (optional)
4. **CEP Debug**: Nur im Development-Mode verfügbar

## Bekannte Issues

- CSS-Loading kann in manchen AE-Versionen Probleme machen
- ExtendScript Console Output nicht immer sichtbar
- Symlink muss bei jeder npm install neu erstellt werden

## Next Steps

- [ ] FPS-Erkennung pro Clip
- [ ] Thumbnail-Vorschau
- [ ] Batch-Operations
- [ ] Download-Flow für Remote-Videos
- [ ] Testing-Framework
- [ ] Package-Signierung (.zxp)

## Resources

- [Adobe CEP Documentation](https://github.com/Adobe-CEP/CEP-Resources)
- [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/)
- [CSInterface API](https://github.com/Adobe-CEP/CEP-Resources)

## Support

Bei Problemen:
1. GitHub Issues erstellen
2. Backend-Logs bereitstellen
3. AE-Console-Output bereitstellen
4. Debug-Mode Status angeben

