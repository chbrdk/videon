# Zentrale Konfiguration

Diese Konfiguration zentralisiert alle localhost und Port-Angaben für das gesamte PrismVid-System.

## Struktur

- `environment.json` - Zentrale Konfigurationsdatei mit allen Service-URLs und Ports
- `environment.ts` - TypeScript-Interface und Hilfsfunktionen
- `environment.py` - Python-Interface und Hilfsfunktionen
- `index.js` - Node.js-Interface und Hilfsfunktionen

## Umgebungen

### Development
- Host: `localhost`
- Alle Services laufen auf localhost mit verschiedenen Ports
- Storage-Pfade zeigen auf lokale Verzeichnisse

### Production
- Host: `0.0.0.0`
- Services verwenden Docker-Service-Namen für interne Kommunikation
- Storage-Pfade zeigen auf Container-Verzeichnisse

### Docker
- Host: `0.0.0.0`
- Services verwenden Docker-Service-Namen
- Optimiert für Docker-Container-Umgebung

## Verwendung

### TypeScript/JavaScript
```typescript
import { getServiceUrl, getServicePort, getStoragePath } from '../config/environment';

const backendUrl = getServiceUrl('backend');
const frontendPort = getServicePort('frontend');
const videoStorage = getStoragePath('videos');
```

### Python
```python
from config.environment import get_service_url, get_service_port, get_storage_path

backend_url = get_service_url('backend')
frontend_port = get_service_port('frontend')
video_storage = get_storage_path('videos')
```

## Service-Ports

| Service | Port | Beschreibung |
|---------|------|--------------|
| backend | 4001 | Haupt-API-Service |
| frontend | 3003 | Svelte-Frontend |
| analyzer | 8001 | Video-Analyse-Service |
| audioService | 5679 | Audio-Verarbeitung |
| audioSeparationService | 8003 | Audio-Trennung |
| saliencyService | 8002 | Saliency-Analyse |
| visionService | 8004 | Vision-Service |

## Umgebungsvariablen

Setze `NODE_ENV` oder `ENVIRONMENT` auf:
- `development` - Lokale Entwicklung
- `production` - Produktionsumgebung
- `docker` - Docker-Container

## Migration

Alle hardcodierten localhost und Port-Angaben wurden durch zentrale Konfiguration ersetzt:

1. ✅ Backend Service
2. ✅ Frontend Service
3. ✅ Audio Service
4. ✅ Audio Separation Service
5. ✅ Docker-Konfigurationen

## Vorteile

- **Zentrale Verwaltung**: Alle URLs und Ports an einem Ort
- **Umgebungswechsel**: Einfacher Wechsel zwischen Development/Production/Docker
- **Wartbarkeit**: Änderungen müssen nur an einer Stelle gemacht werden
- **Konsistenz**: Alle Services verwenden die gleichen Konfigurationswerte
- **Typsicherheit**: TypeScript-Interfaces für bessere Entwicklererfahrung