# Troubleshooting: Plugin wird nicht angezeigt

## Nach Installation

### ✅ Schritt 1: After Effects **komplett neu starten**

```
1. After Effects komplett schließen
2. App-Finder/Mission Control sicherstellen, dass kein AE-Prozess läuft
3. After Effects neu öffnen
```

### ✅ Schritt 2: Panel suchen

**In After Effects:**
```
Fenster > Erweiterungen > PrismVid Scene Search
```

Falls nicht sichtbar, siehe unten.

## Mögliche Probleme

### Problem 1: Plugin existiert, wird aber nicht geladen

**Lösung A: Developer Tools öffnen**
```
In After Effects:
Cmd + Shift + Opt + J (macOS)
oder
Ctrl + Shift + Alt + J (Windows)
```

**Suche nach Fehlern** im Console-Tab.

**Lösung B: Manifest prüfen**
```bash
cat ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search/manifest.json
```

**Lösung C: Permissions prüfen**
```bash
ls -la ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search/
```

Sollte auf deinem Account lesbar sein.

### Problem 2: "panel" vs "normal" UXP Extension

Manifest ist auf "panel" gesetzt. Prüfe:

```json
{
  "entrypoints": [
    {
      "type": "panel",  // ← Muss "panel" sein
      "id": "prismvidSearchPanel",
      "main": "src/index.html"
    }
  ]
}
```

### Problem 3: Dateipfad-Fehler

HTML-Datei muss relativ zu manifest.json liegen:
```
prismvid-scene-search/
├── manifest.json
└── src/
    └── index.html  ← Muss via "src/index.html" erreichbar sein
```

### Problem 4: UXP-Zones-Support

**In After Effects:**
```
Präferenzen > Allgemein > UXP Extensions aktivieren
```

### Problem 5: Alternative Installation

**Fallback: UXP Developer Tool verwenden**

1. UXP Developer Tool öffnen (Creative Cloud)
2. File > Add Extension
3. Ordner: `/Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin`
4. Plugin sollte erscheinen

## Debugging

### Logs finden

**After Effects Logs:**
```
~/Library/Application Support/Adobe/After Effects/2025/Logs/
```

**UXP Extension Logs:**
```
~/Library/Logs/Adobe/UXP/
```

### Manifest validieren

```bash
# In Plugin-Ordner
cd ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search

# JSON validieren
python3 -m json.tool manifest.json > /dev/null && echo "✅ Valid" || echo "❌ Invalid"
```

### Plugin-Liste prüfen

**In After Effects Console:**
```javascript
// Extension laden testen
app.defaultFont = "Arial";

// Projekte/Items prüfen
app.project.name;
```

## Alternative: CEP verwenden

Falls UXP weiterhin Probleme macht, könnte CEP verwendet werden (ältere, aber stabile Methode).

## Installations-Pfad

Das Plugin ist hier installiert:
```
~/Library/Application Support/Adobe/After Effects/2025/UXP/Panels/prismvid-scene-search/
```

**Korrektur-Installation:**
```bash
# Plugin löschen
rm -rf ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search

# Neu kopieren (aus dem aktuellen Directory)
cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/prismvid-scene-search

# AE neu starten
```

## Hilfe bekommen

Wenn nichts funktioniert:
1. Developer Tools öffnen und Screenshots von Fehlern machen
2. Backend-Logs: `docker logs <backend-container>`
3. Manifest-Struktur prüfen
4. Andere UXP-Extensions zum Vergleich installieren

