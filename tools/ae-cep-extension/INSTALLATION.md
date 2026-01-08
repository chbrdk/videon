# Installation Guide - CEP Extension

## Schnellstart

### 1. Extension installieren

**macOS**:
```bash
cp -r tools/ae-cep-extension ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

**Windows**:
```cmd
xcopy tools\ae-cep-extension "%APPDATA%\Adobe\CEP\extensions\PrismVidSceneSearch" /E /I
```

### 2. Prerequisites sicherstellen

**Proxy Server starten**:
```bash
cd tools/ae-proxy-server
node server.js
```

**Backend starten** (falls nicht läuft):
```bash
docker-compose up backend
```

### 3. In After Effects

1. After Effects öffnen
2. Window > Extensions > PrismVid Scene Search
3. Settings > Test Connection
4. Suchen und nutzen!

## Detaillierte Installation

### Schritt 1: CEP Extensions aktivieren

**Wichtig**: In After Effects aktivieren!

```
Preferences > General > "Allow Scripts to Write Files and Access Network"
```

Muss aktiviert sein!

### Schritt 2: Extension kopieren

**macOS**:
```bash
# Extension ins CEP-Verzeichnis kopieren
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions

cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

**Windows**:
```cmd
mkdir "%APPDATA%\Adobe\CEP\extensions"

xcopy /E /I tools\ae-cep-extension "%APPDATA%\Adobe\CEP\extensions\PrismVidSceneSearch"
```

### Schritt 3: Backend und Proxy starten

**Terminal 1 - Proxy**:
```bash
cd tools/ae-proxy-server
node server.js
```

**Terminal 2 - Backend** (falls nötig):
```bash
docker-compose up backend
```

### Schritt 4: Testen

1. After Effects öffnen
2. Window > Extensions > PrismVid Scene Search
3. Settings > Test Connection

## Verifizierung

### Extension installiert?

Prüfen ob Dateien vorhanden sind:
```bash
# macOS
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/

# Windows
dir "%APPDATA%\Adobe\CEP\extensions\PrismVidSceneSearch"
```

### Proxy läuft?

```bash
curl http://localhost:8080/health
```

Sollte JSON-Response zurückgeben.

### Backend läuft?

```bash
docker ps | grep backend
```

## Troubleshooting

### Panel erscheint nicht in After Effects

1. Preferences > General > "Allow Scripts..." aktivieren
2. After Effects neu starten
3. Extension-Pfad prüfen

### "Connection failed"

- Proxy läuft? (`curl http://localhost:8080/health`)
- Backend läuft? (`docker ps`)
- URL korrekt? (Standard: http://localhost:8080)

### Extension wird nicht erkannt

- CEP-Version prüfen (manifest.xml)
- .debug-Datei vorhanden?
- Extension-Ordner korrekt?

## Deinstallation

```bash
# macOS
rm -rf ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Windows
rmdir /S "%APPDATA%\Adobe\CEP\extensions\PrismVidSceneSearch"
```

Dann After Effects neu starten.

## Nächste Schritte

Nach Installation:
1. Panel öffnen
2. Connection testen
3. Suchen
4. Szenen hinzufügen

Viel Erfolg! 🎉

