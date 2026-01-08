# Installation Guide - ExtendScript für After Effects

## Schnellstart

### Option 1: Via After Effects (Einfachste Methode)

1. **After Effects öffnen**
2. **File > Browse Templates**
3. **Scripts-Ordner öffnen** (wird automatisch gefunden)
4. **PrismVidSceneSearch.jsx** in diesen Ordner kopieren
5. **After Effects neu starten** (falls nötig)

### Option 2: Manuell kopieren

#### macOS

```bash
# Finde dein After Effects Scripts-Verzeichnis
# Oft: /Applications/Adobe After Effects [YEAR]/Scripts/

# Kopiere dann:
cp tools/ae-extendscript/PrismVidSceneSearch.jsx "/Applications/Adobe After Effects 2025/Scripts/"
```

#### Windows

```cmd
REM Oft: C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\

copy tools\ae-extendscript\PrismVidSceneSearch.jsx "C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\"
```

## Script-Verzeichnis finden

### In After Effects

1. **File > Browse Templates**
2. Nach "Scripts" im Pfad suchen
3. Diesen Ordner im Finder/Explorer öffnen

### Über Terminal

```bash
# macOS - Standard-Pfad
ls "/Applications/Adobe After Effects 2025/Scripts/"

# Oder in User-Library
ls ~/Library/Application\ Support/Adobe/After\ Effects/
```

## Scripts aktivieren

Wichtig: In After Effects aktivieren!

```
Preferences > General > "Allow Scripts to Write Files and Access Network"
```

## Verwenden

### Script ausführen

```
File > Scripts > PrismVidSceneSearch
```

### Was passiert

1. Dialog öffnet sich
2. Server URL eingeben (Default: http://localhost:4001)
3. "Test Connection" (optional)
4. Suchbegriff eingeben
5. "Search" klicken
6. Ergebnisse wählen
7. "Add Scenes to AE" klicken

## Troubleshooting

### Script erscheint nicht

- Nach AE-Neustart prüfen
- Scripts-Aktivierung prüfen
- Pfad prüfen

### "Connection failed"

- Backend läuft? → `docker ps`
- Server-URL korrekt?
- Firewall?

### "Video file not found"

- Backend liefert korrekten Pfad?
- Video existiert in `/Volumes/DOCKER_EXTERN/prismvid/storage/videos`?

## Alternative Installation (Drag & Drop)

1. **PrismVidSceneSearch.jsx** Datei haben
2. **After Effects öffnen**
3. **File > Browse Templates**
4. **Datei in den Scripts-Ordner ziehen**

Fertig! ✅

