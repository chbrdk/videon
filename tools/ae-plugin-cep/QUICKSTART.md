# PrismVid CEP Plugin - Quick Start

## Schnellstart (5 Schritte)

### 1. Dependencies installieren

```bash
cd tools/ae-plugin-cep
npm install
```

### 2. Build erstellen

```bash
npm run build
```

### 3. Debug Mode aktivieren (einmalig)

```bash
npm run enable-debug:mac
```

Nachfrage mit `Return` bestätigen.

### 4. Plugin installieren

**Option A: Symlink (Development)**
```bash
npm run symlink:mac
```

**Option B: Installation (Production)**
```bash
./install.sh
```

### 5. In After Effects testen

1. **After Effects 2025 starten**
2. **Window > Extensions (Legacy) > PrismVid Search**
3. Panel sollte sich öffnen

## Development Workflow

### Watch Mode (automatisches Rebuild)

```bash
npm run dev
```

Dann in separatem Terminal:
```bash
# Symlink muss nur einmal erstellt werden
npm run symlink:mac
```

### Chrome DevTools öffnen

Wenn Panel geöffnet ist:
- Browser: `http://localhost:8088`
- Oder in After Effects: Tools > Debug > CEP Extensions Console

### Backend verbinden

1. Im Panel: Settings (⚙️) klicken
2. Server URL: `http://localhost:4001` (oder `http://192.168.50.111:4001`)
3. "Test Connection" klicken
4. "Save Settings" klicken

## Troubleshooting

### Panel öffnet sich nicht?

1. **Debug-Mode prüfen:**
```bash
npm run check-debug:mac
# Sollte "1" zurückgeben
```

2. **Symlink prüfen:**
```bash
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/prismvid-search
```

3. **After Effects neu starten**

### "Backend nicht erreichbar"

- Backend läuft? `curl http://localhost:4001/api/health`
- Server URL in Settings prüfen
- Firewall/Network Issues?

### Build-Fehler?

```bash
# Clean & Rebuild
npm run clean
npm install
npm run build
```

## Nützliche Commands

```bash
# Development
npm run dev              # Watch Mode
npm run build            # Production Build
npm run clean            # Clean dist/

# Installation
npm run symlink:mac      # Symlink (Dev)
./install.sh             # Installation (Prod)

# Debug
npm run enable-debug:mac # Debug aktivieren
npm run check-debug:mac  # Debug prüfen
```

## Next Steps

1. Backend starten (falls nicht läuft)
2. Plugin in AE öffnen
3. Verbindung testen
4. Erste Suche durchführen
5. Szenen importieren testen

Viel Erfolg! 🚀

