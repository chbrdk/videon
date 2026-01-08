# PrismVid Scene Search - After Effects ExtendScript

Ein vollständiges After Effects Script, das die PrismVid-Suchfunktion nutzt, um Szenen zu finden und direkt in AE-Kompositionen zu importieren.

## Features

✅ **Vollständige GUI**: Search-Interface direkt in After Effects  
✅ **Backend-Integration**: Verbindung zu PrismVid Search API  
✅ **Multi-Select**: Mehrere Szenen gleichzeitig auswählen  
✅ **Automatischer Import**: Videos werden importiert und getrimmt  
✅ **Timecode-Trim**: Clips werden automatisch anhand Start/End-Zeit getrimmt  
✅ **Sequential Placement**: Optionale hintereinander-Platzierung mit Abstand  
✅ **Footage-Reuse**: Wiederverwendung bereits importierter Videos  

## Installation

### Schritt 1: Script kopieren

```bash
# macOS
cp tools/ae-extendscript/PrismVidSceneSearch.jsx ~/Applications/Adobe\ After\ Effects\ 2024/Scripts/

# Windows (Beispiel)
copy tools\ae-extendscript\PrismVidSceneSearch.jsx "C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\"
```

Oder einfach ins Scripts-Verzeichnis kopieren:
- After Effects öffnen
- File > Browse Templates
- Scripts-Ordner im Finder/Explorer öffnen
- `PrismVidSceneSearch.jsx` hineinkopieren

### Schritt 2: Script-Installation prüfen

Präferenzen > General > Allow Scripts to Write Files and Access Network → **Aktivieren**

### Schritt 3: Verwendung

```
File > Scripts > PrismVidSceneSearch
```

## Verwendung

1. **After Effects öffnen**
2. **Projekt erstellen** (wichtig!)
3. **Script ausführen**: File > Scripts > PrismVidSceneSearch
4. **Server-URL prüfen** (Standard: http://localhost:4001)
5. **"Test Connection" klicken** (optional)
6. **Suchen**: Suchbegriff eingeben
7. **Ergebnisse ansehen** und auswählen
8. **Target Comp wählen**: Neue Komposition oder Active Composition
9. **Options**: Sequential, Gap-Frames
10. **"Add Scenes to AE" klicken**

## Konfiguration

### Server URL

Standard: `http://localhost:4001`

Änderung im Script möglich:
```javascript
var BACKEND_URL = "http://localhost:4001";
```

Oder zur Laufzeit im Settings-Feld ändern.

## Technische Details

### Video-Import

Das Script:
1. Prüft, ob Video bereits importiert wurde
2. Importiert nur bei Bedarf
3. Erstellt Layer in der Ziel-Komposition
4. Trimm Clips via In/Out-Points
5. Setzt Start-Zeit in der Komposition

### Timecode-Konvertierung

- Input: Millisekunden (aus Backend)
- Konvertierung: `/1000` zu Sekunden
- Layer In/Out: Start-Time und End-Time setzen

### Sequential Placement

- Aktivierbar via Checkbox
- Gap in Frames einstellbar
- Berechnet automatisch nächste Position

## Funktioniert mit

- ✅ After Effects 2024
- ✅ After Effects 2025
- ✅ Lokales Backend (localhost:4001)
- ✅ Remotes Backend (via Server-URL)

## Fehlerbehebung

### "Backend nicht erreichbar"

1. Backend prüfen: `docker ps`
2. Server-URL im Script prüfen
3. Firewall-Check

### "Video file not found"

- Prüfe, ob Video in `/Volumes/DOCKER_EXTERN/prismvid/storage/videos` existiert
- Pfad könnte sich unterscheiden
- Backend liefert den korrekten Pfad

### "Scripts nicht erlaubt"

```
Preferences > General > Allow Scripts to Write Files and Access Network
```

Aktivieren!

### JSON Parse Error

ExtendScript nutzt ein simples `eval()` für JSON-Parsing. Falls Probleme auftreten:

- Backend-Antwort prüfen
- Nach HTTP-Fehlern suchen
- Network-Access aktivieren

## Voraussetzungen

1. **After Effects 2024+** (getestet mit 2024, 2025)
2. **PrismVid Backend** läuft (localhost:4001)
3. **Scripts aktiviert** in AE Preferences
4. **Projekt offen** (wird geprüft beim Import)

## Vorteile gegenüber UXP

✅ Stabile, bewährte Technologie  
✅ Keine Installation, einfach kopieren  
✅ Direkter Script-Zugriff auf AE-API  
✅ Funktioniert sofort  
✅ Keine manifest.json-Probleme  
✅ Keine UXP Developer Tool nötig  

## Nächste Schritte (Optional)

- [ ] Thumbnail-Anzeige in Result-Liste
- [ ] FPS-Ermittlung pro Clip
- [ ] Remotes Video-Download
- [ ] Batch-Operation Optimierung

## Support

Bei Problemen:
1. Script-Editor öffnen und Logs prüfen
2. Backend-Logs: `docker logs backend-container`
3. Network-Access prüfen
4. Video-Pfade prüfen

