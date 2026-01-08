# Debug Checklist - CEP Extension

## Wenn Extension im Menü sichtbar, aber Panel nicht öffnet

### Schritt 1: Browser Console öffnen

1. Extension anklicken (auch wenn nichts passiert)
2. In After Effects: Tools > Debug > CEP Extensions Console
3. Oder: Terminal → Konsolen-App öffnen
4. Nach "CEP" oder "PrismVid" suchen

### Schritt 2: Developer Mode aktivieren

**Manuell:**

```bash
# Developer Mode aktivieren
defaults write com.adobe.AfterEffects CEFDebugPort 8095

# After Effects neu starten
```

### Schritt 3: CEP Logs prüfen

```bash
# Logs ansehen
tail -f ~/Library/Logs/Adobe/AfterEffects/CEP/*.log

# Oder in Console.app nach "CEP" suchen
```

### Schritt 4: Extension-Verzeichnis prüfen

```bash
# Struktur prüfen
ls -R ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Sollte zeigen:
# - .debug
# - CSXS/manifest.xml
# - client/index.html
# - client/styles.css
# - client/main.js
# - host/index.jsx
```

### Schritt 5: Manifest-Validierung

```bash
cd ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# XML validieren
xmllint --noout CSXS/manifest.xml

# Sollte keine Fehler zeigen
```

### Schritt 6: HTML-Datei testen

```bash
# HTML im Browser öffnen
open ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/client/index.html
```

Falls HTML fehlerhaft ist → Problem gefunden!

### Schritt 7: Preferences prüfen

In After Effects:
```
Preferences > General > "Allow Scripts to Write Files and Access Network"
```
**MUSS aktiviert sein!**

### Schritt 8: Scripts ordner prüfen

```bash
# Host-Script muss lesbar sein
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/host/index.jsx
```

## Häufige Fehler

### "Cannot read property..."

- JavaScript-Fehler in main.js
- Console öffnen und Fehler ansehen
- Datei checken

### "CSInterface is not defined"

- CSInterface.js fehlt oder nicht geladen
- Datei vorhanden?
- Pfad in index.html korrekt?

### "Manifest parsing error"

- manifest.xml Format-Fehler
- xmllint prüfen
- XML-Struktur überprüfen

### Panel öffnet, aber leer/weiß

- CSS-Laden-Problem
- styles.css Pfad prüfen
- Browser-Console öffnen

## Quick Tests

```bash
# 1. Extension-Struktur prüfen
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# 2. Manifest validieren
xmllint --noout ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/CSXS/manifest.xml

# 3. HTML im Browser testen
open ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/client/index.html

# 4. Developer Console
# After Effects > Tools > Debug > CEP Extensions Console
```

## Alternative: Einfacher Workflow

Falls CEP weiterhin Probleme macht:

**Frontend nutzen** ✅

1. Browser öffnen
2. Frontend aufrufen (localhost:7011)
3. Nach Szenen suchen
4. Timecodes notieren
5. In AE manuell importieren

**Das funktioniert zuverlässig!**

