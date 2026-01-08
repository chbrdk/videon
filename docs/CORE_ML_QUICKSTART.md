# Core ML Models - Quick Start Guide

Schnellstart-Anleitung für die Integration von Core ML Models in PrismVid.

## ✅ Was wurde implementiert

1. **Core ML Analyzer** - Unterstützt 4 Model-Typen (optional, graceful degradation)
2. **Vision Analyzer Integration** - Automatische Verwendung von Models bei Bedarf
3. **Tools** - Download, Konvertierung und Testing
4. **API Endpoints** - Model-Status und Performance-Metriken

## 🚀 Quick Start (5 Minuten)

### Schritt 1: Vision Service starten

```bash
cd /Users/m4-dev/Development/prismvid
tools/vision-service.sh start
```

### Schritt 2: Model-Status prüfen

```bash
curl http://localhost:8080/models | python3 -m json.tool
```

Erwartete Antwort (ohne Models):
```json
{
  "models": [
    {
      "name": "PersonAttributes",
      "description": "Person attributes detection (age, gender, ethnicity)",
      "inputSize": {"width": 224, "height": 224},
      "outputLabels": ["age", "gender", "ethnicity"],
      "loaded": false
    },
    ...
  ]
}
```

### Schritt 3: Model hinzufügen (optional)

**Option A: Direktes Download (.mlmodel)**
```bash
cd packages/vision-service
./tools/download_models.sh
# Option 1 wählen: Model von URL herunterladen
```

**Option B: Model konvertieren**
```bash
# Voraussetzung: coremltools installieren
pip install coremltools

# ONNX/PyTorch/TFLite zu Core ML konvertieren
python3 tools/convert_to_coreml.py model.onnx \
    -o Models/PersonAttributes.mlmodel \
    -n PersonAttributes
```

### Schritt 4: Vision Service neu starten

```bash
tools/vision-service.sh restart
```

### Schritt 5: Testen

```bash
cd packages/vision-service
./tools/test_coreml_integration.sh
```

## 📊 API-Verwendung

### Model-Status abfragen

```bash
# Alle Models
curl http://localhost:8080/models

# Einzelnes Model
curl http://localhost:8080/models/PersonAttributes
```

### Vision Analysis mit Core ML

```bash
curl -X POST http://localhost:8080/analyze/vision \
  -H "Content-Type: application/json" \
  -d '{
    "sceneId": "test-123",
    "keyframePath": "/path/to/keyframe.jpg"
  }' | python3 -m json.tool
```

**Response mit Core ML**:
```json
{
  "objects": [...],
  "faces": [...],
  "personAttributes": [
    {
      "ageRange": "middle-aged",
      "estimatedAge": 45,
      "gender": "female",
      "ethnicity": "asian",
      "confidence": 0.87,
      "boundingBox": [0.2, 0.3, 0.4, 0.5]
    }
  ],
  "vehicleAttributes": [
    {
      "brand": "Porsche",
      "model": "911",
      "vehicleType": "car",
      "color": "Red",
      "confidence": 0.92,
      "boundingBox": [0.1, 0.2, 0.3, 0.4]
    }
  ],
  ...
}
```

### Performance-Metriken

```bash
curl http://localhost:8080/performance | python3 -m json.tool
```

## 🔍 Model-Quellen

### 1. Apple Core ML Models (empfohlen)

- **URL**: https://developer.apple.com/machine-learning/models/
- **Vorteil**: Direkt .mlmodel Format, keine Konvertierung
- **Nachteil**: Begrenzte Auswahl

### 2. Hugging Face (Konvertierung nötig)

1. Model suchen: https://huggingface.co/models
   - Suche: "person attributes", "age gender", "vehicle detection"
2. Model herunterladen (ONNX/PyTorch)
3. Mit `convert_to_coreml.py` konvertieren

### 3. Core ML Model Store (Community)

- **URL**: https://coreml.store
- **Vorteil**: Vorgefertigte .mlmodel Files
- **Nachteil**: Qualität variiert

## 📝 Beispiel-Workflow

### Beispiel: Person Attributes Model hinzufügen

```bash
# 1. Model von Hugging Face herunterladen
wget https://example.com/person_attributes.onnx -O /tmp/person_attributes.onnx

# 2. Zu Core ML konvertieren
cd packages/vision-service
python3 tools/convert_to_coreml.py /tmp/person_attributes.onnx \
    -o Models/PersonAttributes.mlmodel \
    -n PersonAttributes \
    --input-shape 1 3 224 224

# 3. Vision Service neu starten
cd ../../..
tools/vision-service.sh restart

# 4. Testen
cd packages/vision-service
./tools/test_coreml_integration.sh
```

## ⚙️ Konfiguration

### Models-Verzeichnis anpassen

Standard: `packages/vision-service/Models/`

Mit Environment-Variable:
```bash
export CORE_ML_MODELS_PATH=/custom/path/to/models
tools/vision-service.sh restart
```

### Model-Namen

**Wichtig**: Model-Dateien müssen exakt benannt sein:

- `PersonAttributes.mlmodel`
- `VehicleDetector.mlmodel`
- `SceneClassifier.mlmodel`
- `CustomObjectDetector.mlmodel`

## 🐛 Troubleshooting

### Model wird nicht geladen

**Symptom**: `loaded: false` im `/models` Response

**Prüfen**:
1. Model-Datei existiert? `ls packages/vision-service/Models/`
2. Exakter Dateiname? `PersonAttributes.mlmodel` (nicht `person_attributes.mlmodel`)
3. Vision Service neu gestartet?

### Model lädt, aber keine Ergebnisse

**Symptom**: Model ist geladen, aber `personAttributes` ist `null`

**Ursachen**:
1. Model erkennt nichts im Bild
2. Model-Output-Labels stimmen nicht überein
3. Confidence zu niedrig

**Lösung**:
- Teste mit verschiedenen Bildern
- Prüfe Model-Output-Labels (müssen erwarteten Labels entsprechen)
- Siehe `docs/CORE_ML_MODELS_INTEGRATION.md` für Label-Konventionen

### Konvertierung schlägt fehl

**Problem**: `coremltools` Fehler

**Lösung**:
```bash
pip install --upgrade coremltools
```

**Problem**: Input-Format nicht unterstützt

**Lösung**: Format explizit angeben:
```bash
python3 tools/convert_to_coreml.py model.pt -f pytorch
```

## 📚 Weitere Dokumentation

- **Detaillierte Integration**: `docs/CORE_ML_MODELS_INTEGRATION.md`
- **Tools-Dokumentation**: `packages/vision-service/tools/README.md`
- **Apple Intelligence**: `docs/APPLE_INTELLIGENCE_VS_CORE_ML.md`

## ✅ Nächste Schritte

1. ✅ Core ML Integration implementiert
2. ✅ Tools erstellt
3. ⏳ Models von externen Quellen beschaffen
4. ⏳ Models konvertieren und testen
5. ⏳ Performance optimieren

## 💡 Tipps

- **Models sind optional**: System funktioniert auch ohne sie
- **Testen vor Production**: Immer `test_coreml_integration.sh` ausführen
- **Versionierung**: Models mit Versionsnummern versehen (z.B. `PersonAttributes_v1.mlmodel`)
- **Backup**: Models vor Updates sichern

## 🎯 Zusammenfassung

Die Core ML Integration ist **vollständig funktionsfähig** und bereit für den Einsatz. Models können optional hinzugefügt werden, um die Erkennungsgenauigkeit zu verbessern. Das System funktioniert auch ohne Models (Graceful Degradation).

**Wichtig**: Models müssen nicht selbst trainiert werden - vorgefertigte Models können verwendet werden!

