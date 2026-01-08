# TODO: AE UXP Plugin Vervollständigung

## Status

✅ **Fertiggestellt**:
- Plugin-Grundstruktur (manifest, HTML, CSS)
- API Client für Search-Endpoint
- After Effects Integration (Import, Trim)
- Backend-Erweiterung (videoFilePath, videoUrl)
- UI für Suche, Multi-Select, Insert-Options
- Settings-Panel
- Basic Error Handling

⏳ **Noch zu implementieren**:
- Build-System für .ccx Package
- Download-Flow für Remote-Videos
- Footage-Reuse-Logik
- FPS-Erkennung pro Clip
- Testing
- Dokumentation

## Aktuelle Blocker

### 1. UXP Build-System

**Problem**: Kein Build-Prozess vorhanden  
**Lösung**: Implementiere Vite/Rollup Build für UXP

```javascript
// vite.config.js (Beispiel)
export default {
  build: {
    target: 'uxp',
    outDir: 'dist',
    rollupOptions: {
      input: 'src/index.html',
      output: {
        format: 'iife',
      },
    },
  },
};
```

**Aktion**: Vite Setup erstellen, Build-Script implementieren

### 2. getVideoFilePath Implementation

**Problem**: Backend liefert jetzt videoFilePath, aber Plugin muss noch angepasst werden  
**Status**: ✅ Bereits implementiert in ae.ts

### 3. Footage Reuse

**Problem**: Aktuell wird immer neu importiert  
**Lösung**: Wiederverwendungs-Logik implementieren

```typescript
// In ae.ts - bereits vorhanden als findExistingFootage
// Muss in insertScene integriert werden
```

**Aktion**: Prüfe auf existierende Footage vor Import

### 4. FPS Handling

**Problem**: Aktuell Project-FPS verwendet  
**Lösung**: Clip-eigene FPS ermitteln

```typescript
async getFootageFPS(footageItem: FootageItem): Promise<number> {
  try {
    const mainSource = footageItem.mainSource;
    if (mainSource instanceof FileSource) {
      const interpretationOptions = mainSource.interpretationOptions;
      return interpretationOptions.frameRate || app.project.activeItem.frameRate;
    }
  } catch {
    return app.project.activeItem.frameRate;
  }
  return 25; // Fallback
}
```

**Aktion**: FPS-Erkennung implementieren und in insertScene nutzen

### 5. Sequential Placement

**Problem**: Aktuell basic, kann optimiert werden  
**Status**: ✅ Basis implementiert, Abstand in Frames

**Aktion**: Optional überprüfen/verbessern

### 6. Remote Video Download

**Problem**: Wenn videoUrl verwendet wird (Remote)  
**Lösung**: Download in Temp-Folder, dann Import

```typescript
async downloadVideo(videoUrl: string): Promise<string> {
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  const tempPath = ...;
  // Save to temp
  return tempPath;
}
```

**Aktion**: Download-Flow implementieren

### 7. Testing

**Benötigt**:
- Unit Tests (time conversion, API client)
- Integration Tests (Mock AE, Mock API)
- Manual Testing Guide

**Aktion**: Test-Setup erstellen

### 8. Package & Distribution

**Benötigt**:
- .ccx Package erstellen
- Install-Script
- Distribution über privates Repo

**Aktion**: Package-Script erstellen

## Nächste Schritte (Priorität)

1. **Hoch**: FPS-Erkennung (Clip individuell)
2. **Hoch**: Footage-Reuse (Performance)
3. **Mittel**: Build-System (Distribution)
4. **Mittel**: Remote-Download (Remote Storage)
5. **Niedrig**: Testing & Dokumentation

## Quick Wins

- ✅ Backend-Erweiterung (videoFilePath)
- ✅ Plugin-Grundstruktur
- ⏳ FPS-Erkennung
- ⏳ Footage-Reuse

## Konfiguration

### Environment

```bash
# .env im Backend sollte enthalten:
BACKEND_URL=http://localhost:4001
# oder auf Mac mini:
BACKEND_URL=http://192.168.50.111:4001
```

### Plugin Settings

```javascript
// Default Settings
{
  serverUrl: 'http://localhost:4001',
  apiToken: '',
  defaultComp: 'Search Results'
}
```

## Debugging

### After Effects

```javascript
// Console öffnen: Window > Developer Tools
console.log('Debug:', data);
```

### Backend

```bash
# Logs
docker logs -f backend-container

# Health Check
curl http://localhost:4001/api/health
```

## Files to Update

1. `src/index.js` - Panel Controller (✅ fertig)
2. `src/api.ts` - API Client (✅ fertig)
3. `src/ae.ts` - AE Integration (⏳ FPS, Reuse fehlt)
4. `src/utils.ts` - Utilities (✅ fertig)
5. Backend `search.service.ts` (✅ fertig)

## Deployment

Sobald Build-System funktioniert:

```bash
# Build
npm run build

# Package
npm run package

# Install
# .ccx file an Benutzer verteilen
```

