# Video Analysis Status

## ✅ Video Upload erfolgreich

**Video Details:**
- ID: `cmk5exwm20001dtbjyrblxwos`
- Filename: `1767874682379_Design_explained_EN_1.mp4`
- Original Name: `Design_explained_EN_1.mp4`
- File Size: 16.3 MB
- Status: `ANALYZING`
- Uploaded: 2026-01-08T12:18:04.249Z

## ⚠️ Analyse-Services nicht verfügbar

Das Video wurde hochgeladen und der Status ist auf `ANALYZING` gesetzt, aber die Analyse-Services laufen nicht:

1. **Analyzer Service** (`analyzer:8001`): ❌ Nicht erreichbar
2. **Saliency Service** (`saliency-service:8002`): ❌ Nicht erreichbar
3. **Audio Separation Service** (`audio-separation-service:8003`): ❌ Nicht erreichbar

**Fehler in Logs:**
- `getaddrinfo ENOTFOUND analyzer`
- `getaddrinfo ENOTFOUND saliency-service`
- `getaddrinfo ENOTFOUND audio-separation-service`

## 🔧 Lösung

Die Analyse-Services müssen gestartet werden:

```bash
cd /Users/m4-dev/Development/videon
docker compose up -d analyzer saliency-service audio-separation-service
```

## 📋 Was passiert nach dem Start?

Nach dem Start der Services wird das Video automatisch analysiert:

1. **Standard Video Analysis** (analyzer):
   - Scene Detection
   - Transcription
   - Metadata Extraction

2. **Audio Separation** (analyzer):
   - Audio-Track Extraction
   - Stem Separation

3. **Saliency Analysis** (saliency-service):
   - Visual Attention Maps
   - Important Regions Detection

## 🎯 Aktueller Status

- ✅ Video hochgeladen
- ✅ In STORION Database gespeichert
- ✅ Status: ANALYZING
- ⚠️ Analyse-Services müssen gestartet werden
- ⚠️ Analyse-Jobs warten auf Services
