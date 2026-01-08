# Troubleshooting - CEP Extension

## Problem: Panel erscheint nicht in After Effects

### Schritt 1: Extension installieren

```bash
# Extension kopieren
cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

### Schritt 2: Verifizieren

```bash
ls ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

Sollte zeigen:
- .debug
- CSXS/manifest.xml
- client/
- host/

### Schritt 3: Preferences aktivieren

In After Effects:
```
Preferences > General > "Allow Scripts to Write Files and Access Network"
```
**MUSS aktiviert sein!**

### Schritt 4: After Effects neu starten

Kompletten Neustart, nicht nur Panel schließen.

### Schritt 5: Panel öffnen

```
Window > Extensions > PrismVid Scene Search
```

Falls immer noch nicht sichtbar:

## Debug-Modus aktivieren

CEP Extensions im Debug-Modus testen:

1. **Terminal öffnen**
2. **Extension-Ordner navigieren**
3. **Diese beiden Befehle ausführen**:

```bash
# Zum Extension-Ordner
cd ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# Debug-URL setzen (nach .debug Datei)
echo '<ExtensionList>
  <Extension Id="com.prismvid.sceneSearch">
    <HostList>
      <Host Name="AEFT" Port="8095"/>
    </HostList>
  </Extension>
</ExtensionList>' > .debug
```

## Alternative: UXP Developer Tool

Falls CEP nicht funktioniert, UXP Developer Tool für Debugging:

1. UXP Developer Tool öffnen
2. Extensions > Load Extensions
3. Extension-Ordner wählen

## Häufige Probleme

### "Panel erscheint nicht"

- Preferences aktiviert? (General > Allow Scripts...)
- Nach Neustart geprüft?
- Extension-Pfad korrekt?

### "Click on Extension does nothing"

- After Effects neu starten
- Preferences prüfen
- Extension-Ordner-Struktur prüfen

### "Network Error"

- Proxy läuft? (`curl http://localhost:8080/health`)
- Backend läuft? (`docker ps`)
- Firewall?

## Schneller Test

```bash
# 1. Extension installieren
cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# 2. Verifizieren
ls ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch

# 3. After Effects öffnen
# 4. Preferences > General > "Allow Scripts..." aktivieren
# 5. Window > Extensions > PrismVid Scene Search
```

## Logs prüfen

CEP Debug-Logs:
```bash
# macOS
~/Library/Logs/Adobe/AfterEffects/CEP/

# Oder
console.app  # Dann nach "CEP" suchen
```

## Alternative Installation

Falls CEP nicht funktioniert, die **bestehende Frontend-Suche** nutzen:

1. Browser öffnen
2. Frontend aufrufen (z.B. `http://localhost:7011`)
3. Nach Szenen suchen
4. Timecodes notieren
5. In After Effects manuell importieren

**Das Frontend funktioniert bereits!** ✅

