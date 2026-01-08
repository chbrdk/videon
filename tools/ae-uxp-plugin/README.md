# PrismVid After Effects Scene Search Plugin

Ein UXP-Panel für Adobe After Effects, das die PrismVid-Suchfunktion nutzt, um passende Szenen zu finden und direkt in After Effects-Projekten zu platzieren.

## Features

- **Suchfunktion**: Suche nach Szenen basierend auf Transkriptionen und Analyse-Daten
- **Szenen-Auswahl**: Multi-Select für mehrere Szenen gleichzeitig
- **Automatisches Einfügen**: Importiert Original-Footage und trimmt Clips anhand der Timecodes
- **Sequenzielles Platzieren**: Optional hintereinander mit einstellbarem Abstand
- **Einheitenverwaltung**: Unterstützt verschiedene FPS und konvertiert automatisch

## Installation

### Voraussetzungen

- Adobe After Effects 2023 oder neuer
- UXP Developer Tool
- PrismVid Backend (laufend auf http://localhost:4001 oder konfigurierbar)

### Installation

1. **UXP-Panel erstellen**: Diese Dateien in ein UXP-Plugin-Verzeichnis kopieren
2. **Build-Prozess**: `.ccx` Package mit dem UXP Developer Tool erstellen
3. **Installation**: Das `.ccx` Package in Adobe After Effects installieren

### Manuelle Installation (Entwicklung)

```bash
# 1. UXP Developer Tool öffnen
# 2. In After Effects: Fenster > Erweiterungen > PrismVid Scene Search
```

## Konfiguration

### Server-Einstellungen

Das Panel bietet Einstellungen für:

- **Server URL**: Backend-URL (Standard: http://localhost:4001)
- **API Token**: Optional für Authentifizierung
- **Standard Komposition**: Name für neue Kompositionen

### Backend-Integration

Das Plugin nutzt die bestehende Search API:

```typescript
GET /api/search?q=<query>&limit=<number>
```

## Verwendung

1. **Panel öffnen**: Fenster > Erweiterungen > PrismVid Scene Search
2. **Suchen**: Suchbegriff eingeben und auf "Suchen" klicken
3. **Szenen auswählen**: Checkboxen für gewünschte Szenen aktivieren
4. **Einstellungen wählen**:
   - Ziel-Komposition (bestehend oder neu)
   - Hintereinander platzieren (optional)
   - Abstand in Frames
5. **Einfügen**: "Szenen zu AE hinzufügen" klicken

## Technische Details

### Architektur

- **Frontend**: UXP Panel (HTML/CSS/JavaScript)
- **API Client**: TypeScript-basierter Client für Search API
- **AE Integration**: UXP Scripting API für Import und Trim

### Dateistruktur

```
tools/ae-uxp-plugin/
├── manifest.json          # UXP Manifest
├── package.json
├── README.md
└── src/
    ├── index.html         # Panel UI
    ├── index.js           # Main controller
    ├── api.ts             # API client
    ├── ae.ts              # AE integration
    ├── utils.ts           # Utilities
    └── ui/
        └── styles.css     # Styling
```

### API-Modell

**SearchResult**:
```typescript
{
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number;  // milliseconds
  endTime: number;    // milliseconds
  content: string;
  thumbnail?: string;
  score: number;
}
```

**InsertOptions**:
```typescript
{
  targetComp: string;
  sequential: boolean;
  gapFrames: number;
}
```

## Entwicklung

### Build

```bash
npm run build
```

### Testing

Das Plugin sollte in einer After Effects-Instanz mit aktivem Backend getestet werden.

## Bekannte Einschränkungen

1. **Dateipfade**: Die Funktion `getVideoFilePath()` muss noch implementiert werden, um die tatsächlichen Video-Pfade vom Backend zu erhalten
2. **Download-Flow**: Remote-Videos müssen lokal heruntergeladen werden
3. **Offline-Support**: Aktuell keine Offline-Funktionalität

## Roadmap

- [ ] Video-Pfad-Rückgabe im Backend
- [ ] Download-Flow für Remote-Videos
- [ ] Thumbnail-Anzeige in Ergebnissen
- [ ] Drag & Drop aus Ergebnisliste
- [ ] Batch-Render-Funktionen
- [ ] Offline-Caching

## Unterstützung

Bei Problemen oder Fragen wenden Sie sich an das PrismVid-Entwicklungsteam.

