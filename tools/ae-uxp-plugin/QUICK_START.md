# Quick Start: Plugin verwenden

## Installation ist abgeschlossen ✅

Das Plugin wurde kopiert nach:
```
~/Library/Application Support/Adobe/After Effects/2025/UXP/Panels/prismvid-scene-search/
```

## Nächste Schritte

### 1. After Effects **KOMPLETT neu starten**

Wichtig: Nach manueller Installation MUSS After Effects neu gestartet werden!

```
1. After Effects schließen (alle Fenster)
2. App-Finder/Mission Control: kein AE-Prozess offen
3. After Effects neu öffnen
```

### 2. Panel öffnen

In After Effects:
```
Fenster > Erweiterungen > PrismVid Scene Search
```

### 3. Falls Panel nicht sichtbar

#### Option A: Developer Tools öffnen
```
Cmd + Shift + Opt + J (macOS)
```

#### Option B: Permissions prüfen
```bash
chmod -R 755 ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search
```

#### Option C: Alternative Installation via UXP Developer Tool
```
1. UXP Developer Tool öffnen (aus Creative Cloud)
2. File > Add Extension
3. Ordner wählen: /Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin
```

### 4. Plugin testen

1. **Settings öffnen** (⚙️ Icon)
2. **Server URL prüfen**: `http://localhost:4001`
3. **Settings speichern**
4. **Suchen testen**: Suchbegriff eingeben
5. **Backend-Verbindung prüfen**

## Backend starten

Falls Backend noch nicht läuft:

```bash
cd /Users/m4mini/Desktop/DOCKER-local
./deploy.sh backend start
```

## Erste Suche

1. Suchbegriff eingeben
2. "Suchen" klicken
3. Ergebnisse ansehen
4. Szenen auswählen (Checkboxen)
5. "Szenen zu AE hinzufügen" klicken

## Wichtige Hinweise

- Plugin ist JETZT im Panels-Ordner
- **Nach Kopieren: AE neu starten!**
- Backend muss laufen (`localhost:4001`)
- Settings sollten Server-URL enthalten

## Troubleshooting

Siehe `TROUBLESHOOTING.md` für Details.

## Alternative: UXP Developer Tool

Wenn manuelle Installation nicht funktioniert:

1. **UXP Developer Tool** aus Creative Cloud installieren
2. Tool öffnen
3. File > Add Extension
4. Ordner: `/Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin`
5. Panel sollte automatisch in AE erscheinen

