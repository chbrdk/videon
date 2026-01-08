# Core ML Models Tools

Tools für das Management von Core ML Models im PrismVid Vision Service.

## Verfügbare Tools

### 1. `download_models.sh`
Interaktives Script zum Herunterladen und Konvertieren von Core ML Models.

**Verwendung:**
```bash
cd packages/vision-service
./tools/download_models.sh
```

**Optionen:**
- Model von URL herunterladen (.mlmodel)
- Model konvertieren (ONNX/PyTorch/TFLite → Core ML)
- Beispiel-Modelle-Info anzeigen
- Models-Verzeichnis öffnen
- Model-Status prüfen

### 2. `convert_to_coreml.py`
Python-Script zur Konvertierung von ML Models zu Core ML Format.

**Voraussetzungen:**
```bash
pip install coremltools
```

**Verwendung:**
```bash
# ONNX zu Core ML
python3 tools/convert_to_coreml.py model.onnx -o PersonAttributes.mlmodel -n PersonAttributes

# PyTorch zu Core ML
python3 tools/convert_to_coreml.py model.pt -f pytorch -o PersonAttributes.mlmodel

# TensorFlow Lite zu Core ML
python3 tools/convert_to_coreml.py model.tflite -f tflite -o VehicleDetector.mlmodel

# Mit benutzerdefiniertem Input-Shape
python3 tools/convert_to_coreml.py model.onnx --input-shape 1 3 416 416 -o model.mlmodel
```

**Parameter:**
- `input`: Pfad zum Input-Model (erforderlich)
- `-o, --output`: Output-Pfad (.mlmodel, optional)
- `-n, --name`: Model-Name für Metadaten (optional)
- `-f, --format`: Input-Format (onnx, pytorch, tflite, auto, default: auto)
- `--input-shape`: Input Shape [batch, channels, height, width] (default: 1 3 224 224)

### 3. `test_coreml_integration.sh`
Test-Script zur Überprüfung der Core ML Integration.

**Verwendung:**
```bash
cd packages/vision-service
./tools/test_coreml_integration.sh
```

**Was wird getestet:**
- Vision Service Status
- Model-Status (geladene Models)
- Models im Verzeichnis
- Vision Analysis mit Core ML Features

## Model-Quellen

### 1. Apple Core ML Models
- **URL**: https://developer.apple.com/machine-learning/models/
- **Format**: Direkt .mlmodel (keine Konvertierung nötig)

### 2. Hugging Face
- **URL**: https://huggingface.co/models
- **Suche nach**: "person attributes", "age gender", "vehicle detection"
- **Format**: PyTorch/ONNX (benötigt Konvertierung)

### 3. Core ML Model Store
- **URL**: https://coreml.store
- **Format**: Direkt .mlmodel (Community-Models)

### 4. GitHub
- **Suche nach**: "coreml person attributes", "coreml vehicle detection"
- **Format**: Verschieden (oft .mlmodel oder benötigt Konvertierung)

## Konvertierungs-Beispiele

### Beispiel 1: ONNX Model (Person Attributes)

```bash
# Model von Hugging Face herunterladen
wget https://example.com/person_attributes.onnx

# Zu Core ML konvertieren
python3 tools/convert_to_coreml.py person_attributes.onnx \
    -o packages/vision-service/Models/PersonAttributes.mlmodel \
    -n PersonAttributes \
    --input-shape 1 3 224 224

# Vision Service neu starten
tools/vision-service.sh restart
```

### Beispiel 2: PyTorch Model (Vehicle Detection)

```bash
# Model herunterladen
wget https://example.com/vehicle_detector.pt

# Zu Core ML konvertieren
python3 tools/convert_to_coreml.py vehicle_detector.pt \
    -f pytorch \
    -o packages/vision-service/Models/VehicleDetector.mlmodel \
    -n VehicleDetector \
    --input-shape 1 3 416 416
```

## Model-Validierung

Nach der Konvertierung sollten Models validiert werden:

```bash
# Model-Status prüfen
./tools/download_models.sh
# Option 5 auswählen: Model-Status prüfen

# Oder direkt Vision Service Models-Endpoint
curl http://localhost:8080/models | python3 -m json.tool
```

## Troubleshooting

### Konvertierung schlägt fehl

**Problem**: "coremltools nicht installiert"
**Lösung**: 
```bash
pip install coremltools
```

**Problem**: "Input format not supported"
**Lösung**: Format explizit mit `-f` angeben:
```bash
python3 tools/convert_to_coreml.py model.pt -f pytorch
```

### Model wird nicht geladen

**Problem**: Model erscheint nicht in `/models` Response
**Lösung**: 
1. Prüfe ob Model im richtigen Verzeichnis liegt: `packages/vision-service/Models/`
2. Prüfe Model-Namen (exakt: `PersonAttributes.mlmodel`)
3. Vision Service neu starten: `tools/vision-service.sh restart`

### Model lädt, aber keine Ergebnisse

**Problem**: Model ist geladen, aber `personAttributes` ist `null`
**Lösung**:
1. Prüfe Model-Output-Labels (müssen erwarteten Labels entsprechen)
2. Teste mit verschiedenen Bildern
3. Prüfe Confidence-Thresholds im Code

## Best Practices

1. **Models versionieren**: `PersonAttributes_v1.mlmodel`, `PersonAttributes_v2.mlmodel`
2. **Metadaten setzen**: Model-Name, Version, Beschreibung in convert Script
3. **Testing**: Immer nach Konvertierung testen mit `test_coreml_integration.sh`
4. **Backup**: Models vor Updates sichern

## Nächste Schritte

1. ✅ Tools erstellt
2. ⏳ Models von externen Quellen beschaffen
3. ⏳ Models konvertieren und testen
4. ⏳ Integration validieren
5. ⏳ Performance optimieren

