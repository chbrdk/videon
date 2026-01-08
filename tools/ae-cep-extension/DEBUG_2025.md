# Debugging für After Effects 2025.5

## Problem: Extension sichtbar, aber Panel öffnet sich nicht

### Option 1: Console.app prüfen

1. **Terminal öffnen**
2. **Extension anklicken** in After Effects
3. **Diese beiden Befehle ausführen**:

```bash
# Console-Logs prüfen
console  # Öffnet Console.app

# Dann in Console nach "CEP" oder "PrismVid" suchen
```

Oder:

```bash
# Logs direkt ansehen
tail -20 ~/Library/Logs/Adobe/AfterEffects/CEP/*.log
```

### Option 2: HTML-Datei testen

```bash
# HTML im Browser öffnen
open ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/client/index.html
```

Wenn HTML im Browser nicht funktioniert → Problem gefunden!

### Option 3: Extension neu installieren

```bash
# Alte Version entfernen
rm -rf ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Neu installieren
cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Verifizieren
ls ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

## Einfache Überprüfung

### Extension-Struktur prüfen

```bash
cd ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Alle Dateien anzeigen
ls -R

# Sollte enthalten:
# .debug
# CSXS/manifest.xml
# client/index.html
# client/styles.css
# client/main.js
# client/CSInterface.js
# host/index.jsx
```

### Manifest validieren

```bash
# XML-Syntax prüfen (falls xmllint installiert)
xmllint --noout CSXS/manifest.xml
```

### .debug-Datei prüfen

```bash
cat .debug
```

Sollte zeigen:
```xml
<ExtensionList>
  <Extension Id="com.prismvid.sceneSearch">
    <HostList>
      <Host Name="AEFT" Port="8095"/>
    </HostList>
  </Extension>
</ExtensionList>
```

## Häufige Ursachen

### 1. Extension nicht korrekt installiert

```bash
# Manuell installieren
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions

cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

### 2. Preferences nicht aktiviert

In After Effects:
```
Preferences > General > "Allow Scripts to Write Files and Access Network"
```
**MUSS aktiviert sein!**

### 3. After Effects nicht neu gestartet

Nach Installation **komplett** neu starten!

### 4. CEP-Extensions nicht erlaubt

Manche Organisationen blockieren CEP-Extensions.

## Test-Script

```bash
#!/bin/bash

# Extension-Installation testen
echo "=== PrismVid CEP Extension Test ==="
echo ""

# 1. Extension-Ordner prüfen
if [ -d ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch ]; then
    echo "✅ Extension installiert"
    ls ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
else
    echo "❌ Extension NICHT installiert"
    echo "Installiere jetzt..."
    cp -r tools/ae-cep-extension \
       ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
fi

# 2. HTML testen
echo ""
echo "=== HTML-Test ==="
open ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch/client/index.html

# 3. Logs
echo ""
echo "=== Logs ==="
ls ~/Library/Logs/Adobe/AfterEffects/CEP/ 2>/dev/null || echo "Keine Logs gefunden"
```

## Wenn gar nichts funktioniert

**Frontend nutzen** ✅

Die Frontend-Suchfunktion funktioniert bereits und ist getestet:

1. Browser öffnen
2. Frontend: `http://localhost:7011`
3. Nach Szenen suchen  
4. In After Effects manuell importieren

**Das ist die zuverlässigste Lösung!**


