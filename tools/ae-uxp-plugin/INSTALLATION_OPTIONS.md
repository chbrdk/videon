# Installation-Optionen für After Effects Extension

## Übersicht

Es gibt **drei Hauptwege**, um das PrismVid-Plugin in After Effects zu installieren:

## Option 1: UXP Developer Tool (Empfohlen für Entwicklung) ⚡

**Vorteile**:
- Schnelles Laden während der Entwicklung
- Direkte Reload-Möglichkeit ohne Neustart
- Live-Editing möglich

**Nachteile**:
- Erfordert UXP Developer Tool
- Nicht für Endnutzer gedacht
- Müssen Ordner-Pfad kennen

**Schritte**:

1. **UXP Developer Tool installieren**:
   - Adobe Creative Cloud Desktop öffnen
   - Suche: "UXP Developer Tool"
   - Installieren

2. **Plugin laden**:
   ```
   Tool öffnen → File > Add Extension
   Ordner auswählen: /Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin
   ```

3. **In After Effects verwenden**:
   - Fenster > Erweiterungen > PrismVid Scene Search

## Option 2: Entwicklungspfad (Manuell) 📁

**Vorteile**:
- Keine zusätzlichen Tools nötig
- Direkter Zugriff auf Dateien
- Gute für schnelle Tests

**Nachteile**:
- Muss manuell kopiert werden
- Keine Update-Mechanismus
- Plugin muss manuell in Extensions-Ordner

**Schritte**:

1. **Plugin in Extensions-Ordner kopieren**:

   **macOS**:
   ```bash
   cp -r tools/ae-uxp-plugin ~/Library/Application\ Support/Adobe/After\ Effects/2025/UXP/Panels/
   ```

   **Windows**:
   ```cmd
   xcopy /E /I tools\ae-uxp-plugin "%APPDATA%\Adobe\After Effects\2025\UXP\Panels\prismvid-scene-search"
   ```

2. **After Effects neu starten**

3. **Panel öffnen**:
   - Fenster > Erweiterungen > PrismVid Scene Search

## Option 3: .ccx Package (Empfohlen für Production) 📦

**Vorteile**:
- Einfache Distribution
- Professional für Endnutzer
- Kann signiert werden
- Update-Mechanismus möglich

**Nachteile**:
- Build-System noch zu implementieren
- Erfordert UXP Packaging

**Schritte (sobald Build implementiert ist)**:

1. **Package erstellen**:
   ```bash
   cd tools/ae-uxp-plugin
   npm run build
   npm run package  # Erstellt .ccx Datei
   ```

2. **Package installieren**:
   - Double-Click auf `.ccx` Datei
   - Oder: UXP Developer Tool → File > Install Extension

3. **In After Effects verwenden**:
   - Fenster > Erweiterungen > PrismVid Scene Search

## Vergleich

| Methode | Entwicklung | Production | Updates | Setup-Zeit |
|---------|-------------|------------|---------|------------|
| Developer Tool | ✅ Ideal | ❌ | ❌ | ⚡ Schnell |
| Manuell | ✅ Ok | ⚠️ Möglich | ❌ | ⚡ Schnell |
| .ccx Package | ⚠️ Aufwendig | ✅ Ideal | ✅ | 🐢 Langsam |

## Empfehlung

- **Für Entwicklung**: Option 1 (Developer Tool)
- **Für Testing**: Option 2 (Manuell kopieren)
- **Für Production**: Option 3 (.ccx Package)

## Alternative: CEP Extension (Alt, aber stabiler)

Falls UXP Probleme macht, gibt es noch die **CEP** (Common Extensibility Platform) Methode:

**CEP ist älter, aber**:
- ✅ Sehr stabil und bewährt
- ✅ Bessere Dokumentation
- ✅ Mehr Beispiele verfügbar
- ❌ Aber nicht mehr aktiv entwickelt von Adobe

Für CEP müsste das Plugin neu strukturiert werden (HTML/JS statt UXP).

## Schnellstart

### Entwicklung (Jetzt möglich)

```bash
# 1. Plugin ist bereits erstellt in tools/ae-uxp-plugin/

# 2. UXP Developer Tool öffnen und Add Extension klicken

# 3. Ordner auswählen:
# /Volumes/DOCKER_EXTERN/prismvid/tools/ae-uxp-plugin

# 4. In After Effects:
# Fenster > Erweiterungen > PrismVid Scene Search
```

### Manueller Test (Ohne Tools)

```bash
# macOS
mkdir -p ~/Library/Application\ Support/Adobe/After\ Effects/2024/UXP/Panels/
cp -r tools/ae-uxp-plugin ~/Library/Application\ Support/Adobe/After\ Effects/2024/UXP/Panels/prismvid-scene-search

# Nach AE-Neustart ist Plugin verfügbar
```

## Troubleshooting

### "Extension not found in After Effects"

- Prüfen, ob Pfad korrekt ist
- Nach AE-Neustart prüfen
- Developer Tools öffnen (Cmd/Ctrl + Shift + Opt/Alt + J)

### "Cannot load extension"

- Prüfen manifest.json Syntax
- Prüfen, ob alle Dateien vorhanden sind
- Logs in Developer Tools prüfen

### "Network error"

- Backend-URL in Settings prüfen
- CORS im Backend aktiviert?
- Firewall-Settings prüfen

## Nächste Schritte

Um das Build-System für .ccx zu implementieren, siehe `TODO.md`.

