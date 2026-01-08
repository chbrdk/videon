# Troubleshooting - CEP Plugin

## Panel öffnet sich nicht

### 1. Debug-Mode prüfen

```bash
npm run check-debug:mac
# Sollte "1" sein
```

Falls nicht:
```bash
npm run enable-debug:mac
# After Effects NEU STARTEN
```

### 2. Chrome DevTools öffnen

Wenn Panel-Menüpunkt geklickt wird aber nichts passiert:

1. In After Effects: **Tools > Debug > CEP Extensions Console**
2. Oder Browser öffnen: `http://localhost:8088`
3. DevTools (F12) → Console Tab
4. Nach Fehlern suchen

### 3. Struktur prüfen

```bash
ls -R ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
```

Sollte enthalten:
```
.ddebug/
CSXS/manifest.xml
index.html
js/
  - bundle.js
  - CSInterface.js
jsx/
  - hostscript.jsx
```

### 4. Manifest validieren

```bash
cd ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
xmllint --noout CSXS/manifest.xml
```

### 5. HTML direkt testen

```bash
open ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search/index.html
```

Falls im Browser Fehler → Problem in HTML/JS

### 6. AE Preferences prüfen

**After Effects:**
- Preferences > General > **"Allow Scripts to Write Files and Access Network"** ✅
- Preferences > General > **"Enable JavaScript Debugger"** ✅ (optional)

### 7. Console.app Logs

```bash
# Console.app öffnen
open -a Console

# Filter: "CEP" oder "PrismVid"
# Nach Fehlermeldungen suchen
```

### 8. Rebuild & Reinstall

```bash
cd tools/ae-plugin-cep
npm run clean
npm run build
npm run symlink:mac

# After Effects neu starten
```

## Häufige Fehler

### "CSInterface is not defined"

**Ursache:** CSInterface.js wird nicht vor bundle.js geladen

**Lösung:**
1. Prüfen: `dist/js/CSInterface.js` existiert?
2. Prüfen: In `index.html` vor `bundle.js`?
3. Rebuild: `npm run build`

### "Cannot read property 'evalScript'"

**Ursache:** CSInterface nicht richtig initialisiert

**Lösung:**
- CSInterface.js muss `window.__adobe_cep__` nutzen
- Überprüfe CSInterface.js Implementation

### "Panel nicht sichtbar"

**Ursache:** AutoVisible im Manifest

**Lösung:**
- Manifest prüfen: `<AutoVisible>true</AutoVisible>`
- Manuell öffnen: Window > Extensions > PrismVid Search

### "Backend nicht erreichbar"

**Ursache:** Network/URL Problem

**Lösung:**
1. Backend läuft? `curl http://localhost:4001/api/health`
2. Server URL in Settings prüfen
3. Für Mac mini: `http://192.168.50.111:4001`
4. CORS-Problem? → Proxy-Server nutzen

## Debug Workflow

1. **Build checken:**
```bash
ls -la dist/
```

2. **Symlink checken:**
```bash
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
```

3. **Debug-Mode:**
```bash
defaults read com.adobe.CSXS.11 PlayerDebugMode
```

4. **DevTools öffnen:**
- Browser: `http://localhost:8088`
- Oder AE: Tools > Debug > CEP Extensions Console

5. **Console Output prüfen:**
- Browser DevTools Console
- AE CEP Console
- Console.app

## Quick Fixes

### Plugin komplett neu installieren

```bash
cd tools/ae-plugin-cep
npm run clean
npm run build
rm -rf ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
npm run symlink:mac
```

### Debug-Mode zurücksetzen

```bash
defaults delete com.adobe.CSXS.11 PlayerDebugMode
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

### Alle CEP Extensions neu laden

In After Effects:
1. Alle Panels schließen
2. After Effects komplett beenden
3. Neu starten

## Wenn nichts hilft

1. **Extension-Ordner komplett löschen:**
```bash
rm -rf ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
```

2. **Neu installieren:**
```bash
cd tools/ae-plugin-cep
npm run build
npm run symlink:mac
```

3. **After Effects Preferences zurücksetzen:**
- Preferences exportieren
- Preferences löschen
- Nach Start neu konfigurieren

4. **CEP Cache löschen:**
```bash
rm -rf ~/Library/Caches/com.adobe.*
```

## Support

Bei anhaltenden Problemen:
- GitHub Issues erstellen
- Backend-Logs bereitstellen
- AE-Console-Output bereitstellen
- Screenshots von Fehlermeldungen

