# After Effects UXP Plugin Implementation

## Übersicht

Implementierung eines After Effects UXP-Panels, das die PrismVid-Suchfunktion nutzt, um Szenen zu finden und in After Effects-Projekte einzufügen.

## Implementierter Stand

### ✅ Fertiggestellt

1. **Plugin-Grundstruktur**
   - UXP Manifest (`manifest.json`)
   - Panel UI (HTML/CSS)
   - TypeScript-Controller (`index.js`)
   - Settings-Panel

2. **API-Integration**
   - Search API Client (`api.ts`)
   - Backend-Integration mit `videoFilePath` und `videoUrl`
   - Config Management (Settings speichern/laden)
   - Health Check

3. **After Effects Integration**
   - Composition Management (list, create, find)
   - Footage Import (`importFootage`)
   - Scene Insertion mit Timecode-Trim
   - Sequential Placement Support
   - Gap-Frames-Funktionalität

4. **UI/UX**
   - Suchfeld mit Enter-Handler
   - Ergebnisliste mit Checkboxen
   - Multi-Select
   - Insert-Options (Target-Comp, Sequential, Gap)
   - Progress-Bar
   - Error-Handling mit User-Feedback
   - Settings Panel (ein-/ausklappbar)

5. **Backend-Erweiterungen**
   - `SearchResult` Interface erweitert um `videoFilePath` und `videoUrl`
   - Automatische Pfad-Konstruktion in SearchService
   - API-Endpunkte bleiben unverändert

### ⏳ Noch zu implementieren

1. **FPS-Erkennung**
   - Clip-individuelles FPS ermitteln
   - Timecode-Konvertierung pro Clip anpassen

2. **Footage-Reuse**
   - Bestehende Footage-Items wiederverwenden
   - Performanz-Optimierung

3. **Download-Flow**
   - Remote-Videos (videoUrl) herunterladen
   - Temp-Speicherung
   - Cleanup

4. **Build-System**
   - Vite/Rollup Setup
   - .ccx Package erstellen
   - Distribution

5. **Testing**
   - Unit Tests
   - Integration Tests
   - Manual Testing Guide

## Architektur

### Plugin-Struktur

```
tools/ae-uxp-plugin/
├── manifest.json          # UXP Config
├── package.json
├── README.md
├── INSTALLATION.md
├── TODO.md
└── src/
    ├── index.html         # Panel UI
    ├── index.js           # Controller
    ├── api.ts             # API Client
    ├── ae.ts              # AE Integration
    ├── utils.ts           # Utilities
    └── ui/
        └── styles.css     # Styling
```

### Datenfluss

```
User Input (Search)
    ↓
SearchApiClient.search()
    ↓
Backend /api/search
    ↓
SearchResult[] mit videoFilePath, videoUrl
    ↓
User selektiert Szenen
    ↓
AEIntegration.insertScenes()
    ↓
Für jede Szene:
  - getVideoFilePath()
  - importFootage()
  - insertScene() mit Trim
    ↓
Sequential Placement (optional)
    ↓
Done
```

### API-Modell

**SearchResult** (erweitert):
```typescript
{
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number;      // milliseconds
  endTime: number;       // milliseconds
  content: string;
  thumbnail?: string;
  score: number;
  videoFilePath?: string; // ✅ NEU
  videoUrl?: string;      // ✅ NEU
}
```

### Timecode-Handling

Aktuell:
- Millisekunden aus Backend
- Konvertierung zu Sekunden (`ms / 1000`)
- Layer In/Out Points setzen
- Optional: FPS-basierte Frame-Snap

Geplant:
- Clip-spezifisches FPS ermitteln
- Präzisere Timecode-Berechnung

## Backend-Änderungen

### `packages/backend/src/services/search.service.ts`

Erweitert um:
```typescript
videoFilePath: string  // Lokaler Pfad zum Video
videoUrl: string      // API-Endpoint für Video
```

Generiert aus:
- Video.filename + Storage-Pfad
- API-BASE-URL + /api/videos/{id}/file

## Verwendung

### Installation (wenn Build fertig)

1. After Effects öffnen
2. Fenster > Erweiterungen > PrismVid Scene Search
3. Settings öffnen, Server-URL prüfen
4. Suchen, Auswählen, Hinzufügen

### Konfiguration

```javascript
// Default Settings
{
  serverUrl: 'http://localhost:4001',
  apiToken: '',
  defaultComp: 'Search Results'
}
```

Über UI änderbar in Settings-Panel.

## Bekannte Einschränkungen

1. **Lokale Dateien**: Plugin benötigt Zugriff auf Storage-Ordner
2. **FPS**: Nutzt aktuell Project-FPS, nicht individuell pro Clip
3. **Remote**: Download-Flow für videoUrl noch nicht implementiert
4. **Thumbnails**: Thumbnail-Anzeige fehlt
5. **Build**: Kein .ccx Package bisher

## Nächste Schritte

Siehe `tools/ae-uxp-plugin/TODO.md`

Prioritäten:
1. FPS-Erkennung (Clip-individuell)
2. Footage-Reuse
3. Build-System
4. Download-Flow
5. Testing

## Dateien

### Plugin
- `tools/ae-uxp-plugin/manifest.json`
- `tools/ae-uxp-plugin/src/index.html`
- `tools/ae-uxp-plugin/src/index.js`
- `tools/ae-uxp-plugin/src/api.ts`
- `tools/ae-uxp-plugin/src/ae.ts`
- `tools/ae-uxp-plugin/src/utils.ts`
- `tools/ae-uxp-plugin/src/ui/styles.css`

### Backend
- `packages/backend/src/services/search.service.ts` (erweitert)

### Dokumentation
- `tools/ae-uxp-plugin/README.md`
- `tools/ae-uxp-plugin/INSTALLATION.md`
- `tools/ae-uxp-plugin/TODO.md`
- `docs/AE_PLUGIN_IMPLEMENTATION.md` (dieses Dokument)

## Testing

Aktuell noch nicht implementiert. Geplant:
- Unit Tests (utils, API)
- Integration Tests (Mock AE/API)
- Manual Testing Guide

## Support

Bei Fragen oder Problemen:
1. Backend-Logs prüfen
2. After Effects Developer Tools öffnen
3. Plugin-TODO prüfen
4. Issues erstellen mit Logs

