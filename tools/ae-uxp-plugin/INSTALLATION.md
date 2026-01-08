# Installation Guide: PrismVid After Effects Plugin

## Übersicht

Dieses Plugin erlaubt es, Szenen direkt aus PrismVid in After Effects zu importieren, basierend auf der Suche.

## Voraussetzungen

1. **Adobe After Effects 2024** oder neuer (empfohlen: 2025)
2. **UXP Developer Tool** installiert
3. **PrismVid Backend** läuft (Standard: http://localhost:4001)
4. **Docker Development Environment** (laut deiner Setup-Anleitung)

## Installation

### Schritt 1: UXP Developer Tool

Wenn noch nicht installiert:
1. Adobe Creative Cloud Desktop öffnen
2. Nach "UXP Developer Tool" suchen und installieren

### Schritt 2: Plugin-Dateien vorbereiten

```bash
cd tools/ae-uxp-plugin
```

### Schritt 3: Build-Prozess (noch zu implementieren)

Aktuell ist ein Build-System noch zu implementieren. Für die Entwicklung:

```bash
# Zukünftig:
npm install
npm run build
```

### Schritt 4: Plugin in After Effects laden

**Option A: Entwicklungsladen**

1. UXP Developer Tool öffnen
2. File > Add Extension
3. Ordner wählen: `tools/ae-uxp-plugin`
4. Plugin sollte jetzt in After Effects verfügbar sein

**Option B: Installation als .ccx Package**

Noch zu implementieren - würde ein Package erstellen, das direkt installiert werden kann.

**Option C: Manuelles Kopieren (bereits erledigt ✅)**

Das Plugin wurde bereits in den Extensions-Ordner kopiert:
```bash
~/.Library/Application Support/Adobe/After Effects/2025/UXP/Panels/prismvid-scene-search
```

Einfach After Effects 2025 neu starten und Panel öffnen!

## Erste Verwendung

1. **After Effects öffnen**
2. **Panel laden**: Fenster > Erweiterungen > PrismVid Scene Search
3. **Backend-Verbindung prüfen**: 
   - Settings öffnen
   - Server URL prüfen (sollte http://localhost:4001 sein)
   - "Verbindung testen" klicken
4. **Projekt erstellen oder öffnen**
5. **Suchen**: Suchbegriff eingeben und "Suchen" klicken
6. **Szenen auswählen**: Checkboxen für gewünschte Szenen
7. **Einfügen**: Ziel-Komposition wählen und "Hinzufügen" klicken

## Konfiguration

### Server-Einstellungen

- **Server URL**: Standard ist `http://localhost:4001`
- **API Token**: Optional für Authentifizierung
- **Standard Komposition**: Name für neue Kompositionen (Standard: "Search Results")

### Erweiterte Einstellungen

- **Hintereinander platzieren**: Aktiviert sequentielles Einfügen mit Abstand
- **Abstand (Frames)**: Gibt an, wieviel Frames zwischen den Clips sein sollen

## Fehlerbehebung

### "Backend nicht erreichbar"

1. Prüfen, ob Backend läuft: `docker ps`
2. Prüfen Backend-URL in Settings
3. Prüfen Netzwerk-Verbindung zum Server

### "Video-Datei nicht gefunden"

1. Prüfen, ob Video in `/Volumes/DOCKER_EXTERN/prismvid/storage/videos` vorhanden ist
2. Prüfen Datei-Berechtigungen
3. Backend-Logs prüfen: `docker logs <backend-container>`

### "Komposition konnte nicht erstellt werden"

1. Prüfen, ob bereits eine Komposition mit dem Namen existiert
2. Prüfen Projekt-Berechtigungen
3. After Effects Logs prüfen

## Entwickler-Tipps

### Debugging

```bash
# After Effects Debug Console öffnen
# Window > Developer Tools
```

### Plugin neu laden

```bash
# In After Effects
# File > Reload UXP Extensions
```

### Logs prüfen

Plugin-Logs gehen in die After Effects Console (Window > Developer Tools)

Backend-Logs:
```bash
docker logs -f <backend-container>
```

## Bekannte Einschränkungen

1. **Lokale Dateien**: Plugin benötigt Zugriff auf die Storage-Ordner von PrismVid
2. **FPS**: Plugin nutzt aktuell Project-FPS, nicht individuelle Clip-FPS
3. **Thumbnails**: Thumbnail-Anzeige noch nicht implementiert
4. **Offline**: Aktuell nur Online-Modus mit Backend-Verbindung

## Nächste Schritte

- [ ] Build-System implementieren (.ccx Package)
- [ ] Download-Flow für Remote-Videos
- [ ] Thumbnail-Anzeige
- [ ] FPS-Ermittlung pro Clip
- [ ] Offline-Caching
- [ ] Batch-Operationen-Optimierung

## Support

Bei Problemen oder Fragen:
1. GitHub Issues erstellen
2. Entwickler-Team kontaktieren
3. Backend-Logs und AE-Console-Output bereitstellen

