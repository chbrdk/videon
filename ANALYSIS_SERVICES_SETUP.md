# Analyse-Services Setup

## 🔧 Build-Fehler behoben

Die Dockerfiles wurden aktualisiert, um fehlende Build-Dependencies hinzuzufügen:

### ✅ Änderungen

1. **audio-separation-service/Dockerfile**:
   - `gcc`, `g++`, `python3-dev`, `curl` hinzugefügt
   - Benötigt für `psutil` und andere native Python-Pakete

2. **analyzer/Dockerfile**:
   - `gcc`, `g++`, `python3-dev` hinzugefügt
   - Für native Python-Dependencies

3. **saliency-service/Dockerfile**:
   - `gcc`, `g++`, `python3-dev` hinzugefügt
   - Für native Python-Dependencies

## 🚀 Services starten

Die Services werden im Hintergrund gebaut. Um sie zu starten:

```bash
cd /Users/m4-dev/Development/videon

# Services bauen (kann einige Minuten dauern)
docker compose build analyzer saliency-service audio-separation-service

# Services starten
docker compose up -d analyzer saliency-service audio-separation-service

# Status prüfen
docker compose ps | grep -E "analyzer|saliency|audio-separation"
```

## 📋 Services

1. **Analyzer Service** (`analyzer:8001`):
   - Standard Video Analysis (Scenes, Transcription)
   - Audio Separation

2. **Saliency Service** (`saliency-service:8002`):
   - Visual Attention Maps
   - Important Regions Detection

3. **Audio Separation Service** (`audio-separation-service:8003`):
   - Audio-Track Extraction
   - Stem Separation

## 🎯 Nach dem Start

Sobald die Services laufen, wird das bereits hochgeladene Video automatisch analysiert:

- Video ID: `cmk5exwm20001dtbjyrblxwos`
- Status: `ANALYZING`
- Die Analyse-Jobs wurden bereits gestartet und warten auf die Services

## ⚠️ Hinweis

Die Builds können einige Minuten dauern, da viele Python-Dependencies installiert werden müssen.
