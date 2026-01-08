# Core ML Models Integration

## Übersicht

Das PrismVid Vision Service unterstützt optionale Core ML Models für erweiterte Erkennungsfunktionen. Diese Models können vorgefertigt (ohne Training) integriert werden und erweitern die Standard Vision Framework-Funktionen um:

- **Person Attributes Detection**: Alter, Geschlecht, Ethnie
- **Vehicle Detection**: Marke, Modell, Fahrzeugtyp, Farbe
- **Scene Classification**: Detaillierte Szenen-Klassifizierung
- **Custom Object Detection**: Spezielle Objekt-Erkennung

## Funktionsweise

Die Core ML Models sind **vollständig optional**. Das System funktioniert auch ohne sie (Graceful Degradation):

- ✅ Wenn Models vorhanden sind → Erweiterte Erkennung aktiviert
- ✅ Wenn Models fehlen → Standard Vision Framework wird verwendet
- ✅ Keine Fehler oder Abstürze ohne Models

## Unterstützte Models

### 1. PersonAttributes.mlmodel
**Zweck**: Detaillierte Person-Attribute-Erkennung

**Erkannte Attribute**:
- Alter (Altersgruppe: young, middle-aged, senior)
- Geschätztes Alter (in Jahren)
- Geschlecht (male, female, unknown)
- Ethnie (asian, caucasian, african, hispanic, indian, middle eastern, unknown)

**Input**: 224x224 Pixel (CVPixelBuffer)
**Output**: Classification mit Labels für Age, Gender, Ethnicity

### 2. VehicleDetector.mlmodel
**Zweck**: Fahrzeug-Erkennung mit Marke und Modell

**Erkannte Attribute**:
- Marke (z.B. Porsche, BMW, Mercedes, Audi, Tesla)
- Modell (z.B. 911, X5, C-Class, Model S)
- Fahrzeugtyp (car, truck, suv, motorcycle, bus)
- Farbe (dominante Farbe des Fahrzeugs)

**Input**: 416x416 Pixel (CVPixelBuffer)
**Output**: Classification mit Labels für Brand, Model, Type, Color

### 3. SceneClassifier.mlmodel
**Zweck**: Detaillierte Szenen-Klassifizierung

**Kategorien**: indoor, outdoor, nature, urban, water, sky

**Input**: 224x224 Pixel (CVPixelBuffer)

### 4. CustomObjectDetector.mlmodel
**Zweck**: Spezielle Objekt-Erkennung für benutzerdefinierte Use Cases

**Kategorien**: person, vehicle, animal, building, sign

**Input**: 416x416 Pixel (CVPixelBuffer)

## Installation von Models

### Schritt 1: Models-Verzeichnis erstellen

Das Models-Verzeichnis kann über die Environment-Variable `CORE_ML_MODELS_PATH` konfiguriert werden:

```bash
export CORE_ML_MODELS_PATH=/path/to/models
```

**Standard-Pfad** (falls nicht gesetzt):
- Bei Development: `packages/vision-service/Models/`
- Bei Bundle: `.app/Contents/Resources/Models/`

### Schritt 2: Models herunterladen/bereitstellen

#### Option A: Vorgefertigte Models von Apple Create ML

1. **Create ML App** öffnen (im Xcode Developer Tools)
2. Modell-Typ wählen (z.B. "Image Classification")
3. Training-Daten verwenden (kann mit öffentlichen Datasets wie ImageNet erstellt werden)
4. Export als `.mlmodel`

#### Option B: Hugging Face Core ML Models

Hugging Face bietet einige Core ML-kompatible Models:

```bash
# Beispiel: Model von Hugging Face konvertieren
# (Hinweis: Meistens müssen PyTorch/ONNX Models zu Core ML konvertiert werden)
```

#### Option C: Core ML Model Hub

- **Apple Machine Learning**: https://developer.apple.com/machine-learning/models/
- **Core ML Community**: https://coreml.store/

### Schritt 3: Models platzieren

```bash
# Models-Verzeichnis erstellen
mkdir -p packages/vision-service/Models

# Models kopieren
cp PersonAttributes.mlmodel packages/vision-service/Models/
cp VehicleDetector.mlmodel packages/vision-service/Models/
cp SceneClassifier.mlmodel packages/vision-service/Models/
cp CustomObjectDetector.mlmodel packages/vision-service/Models/
```

## Model-Format Anforderungen

### Input/Output Format

**Image Classification Models** (PersonAttributes, SceneClassifier):
```
Input: CVPixelBuffer (224x224 oder 416x416)
Output: VNClassificationObservation
  - identifier: String (Label)
  - confidence: Float (0.0-1.0)
```

**Object Detection Models** (VehicleDetector, CustomObjectDetector):
```
Input: CVPixelBuffer (416x416)
Output: VNRecognizedObjectObservation
  - labels: [VNClassificationObservation]
  - boundingBox: CGRect (normalized 0.0-1.0)
```

### Label-Konventionen

#### Person Attributes Labels

Das Model sollte Labels in folgendem Format ausgeben:

**Age Labels**:
- `young`, `teen`, `child` → Altersgruppe: "young"
- `middle-aged`, `adult`, `middle` → Altersgruppe: "middle-aged"
- `senior`, `old`, `elderly` → Altersgruppe: "senior"

**Gender Labels**:
- `male`, `man`, `gentleman` → "male"
- `female`, `woman`, `lady` → "female"

**Ethnicity Labels**:
- `asian`, `east asian`, `southeast asian` → "asian"
- `caucasian`, `white`, `european` → "caucasian"
- `african`, `black`, `afro` → "african"
- `hispanic`, `latino`, `latin` → "hispanic"
- `indian`, `south asian` → "indian"
- `middle eastern`, `arab` → "middle eastern"

#### Vehicle Labels

**Brand Labels**: `porsche`, `bmw`, `mercedes`, `audi`, `volkswagen`, `ford`, `toyota`, `honda`, `tesla`, `ferrari`, `lamborghini`

**Model Labels**: `911`, `718`, `panamera`, `cayenne`, `x5`, `x3`, `x7`, `3-series`, `5-series`, `c-class`, `e-class`, `s-class`, `a4`, `a6`, `q5`, `q7`

**Type Labels**: `car`, `truck`, `suv`, `motorcycle`, `bus`, `van`

**Color Labels**: `red`, `blue`, `green`, `yellow`, `white`, `black`, `gray`, `grey`, `silver`, `orange`

## Empfohlene Model-Quellen

### 1. Apple Create ML (Offiziell)

**Vorteile**:
- ✅ Offiziell von Apple unterstützt
- ✅ Optimiert für Core ML
- ✅ Keine Konvertierung nötig

**Nachteile**:
- ⚠️ Man muss selbst trainieren (mit eigenen Daten)
- ⚠️ Benötigt Training-Daten

### 2. Hugging Face Transformers → Core ML

**Vorgehensweise**:
1. PyTorch/ONNX Model von Hugging Face herunterladen
2. Mit `coremltools` zu Core ML konvertieren:

```python
import coremltools as ct

# ONNX zu Core ML
model = ct.convert(
    "model.onnx",
    source="onnx",
    inputs=[ct.TensorType(name="image", shape=(1, 3, 224, 224))]
)

model.save("PersonAttributes.mlmodel")
```

### 3. TensorFlow Lite → Core ML

```python
import coremltools as ct

# TensorFlow Lite zu Core ML
model = ct.convert(
    "model.tflite",
    source="tflite",
    inputs=[ct.TensorType(name="image", shape=(1, 3, 224, 224))]
)

model.save("PersonAttributes.mlmodel")
```

### 4. Vorgefertigte Core ML Models (Community)

**Quellen für vorgefertigte Models**:
- **coreml.store**: Community-geführte Core ML Model Collection
- **GitHub**: Suche nach "coreml model person attributes" oder "coreml vehicle detection"
- **Apple Developer Forums**: Community-geteilte Models

## Verwendung in der API

### API Response mit Core ML

Wenn Models geladen sind, enthält die Vision Analysis Response zusätzliche Felder:

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
  "sceneClassification": [
    {
      "label": "outdoor",
      "confidence": 0.95,
      "category": "outdoor"
    }
  ],
  "customObjects": [...],
  "aiDescription": {...}
}
```

### Model-Status prüfen

**Health Endpoint** (zeigt geladene Models):

```bash
curl http://localhost:8080/health
```

**Models Endpoint** (zeigt verfügbare Models):

```bash
curl http://localhost:8080/models
```

Response:
```json
{
  "models": [
    {
      "name": "PersonAttributes",
      "description": "Person attributes detection (age, gender, ethnicity)",
      "inputSize": {"width": 224, "height": 224},
      "outputLabels": ["age", "gender", "ethnicity"],
      "loaded": true
    },
    {
      "name": "VehicleDetector",
      "description": "Vehicle brand and model detection",
      "inputSize": {"width": 416, "height": 416},
      "outputLabels": ["brand", "model", "vehicleType", "color"],
      "loaded": false
    }
  ]
}
```

## Troubleshooting

### Model wird nicht geladen

**Symptom**: `ℹ️ Model PersonAttributes not found at ... - skipping (optional)`

**Lösung**:
1. Prüfen, ob Model-Datei existiert: `ls -la packages/vision-service/Models/`
2. Prüfen `CORE_ML_MODELS_PATH` Environment-Variable
3. Prüfen, ob Model korrekt benannt ist (exakt: `PersonAttributes.mlmodel`)

### Model lädt, aber keine Ergebnisse

**Symptom**: Model ist geladen (`✅ Loaded Person Attributes model`), aber `personAttributes` ist `null` in der Response

**Mögliche Ursachen**:
1. Model erkennt keine Personen im Bild
2. Model-Output-Labels stimmen nicht mit erwarteten Labels überein
3. Confidence-Threshold zu hoch

**Lösung**:
1. Testbild mit klarer Person verwenden
2. Model-Output in Logs prüfen (Label-Namen)
3. Labels im Code anpassen (siehe `CoreMLAnalyzer.swift`)

### Performance-Probleme

**Symptom**: Analyse dauert sehr lange mit Models

**Lösung**:
1. Models werden parallel ausgeführt, aber große Models können langsamer sein
2. Optional: Kleinere Models verwenden (z.B. MobileNet-basierte Models)
3. Optional: Models nur bei Bedarf laden (Lazy Loading)

## Best Practices

1. **Models sind optional**: System funktioniert auch ohne sie
2. **Qualität über Quantität**: Lieber 1-2 gut trainierte Models als viele schlechte
3. **Label-Konventionen einhalten**: Models sollten Labels in erwartetem Format ausgeben
4. **Testen mit verschiedenen Bildern**: Models können unterschiedlich performen je nach Bildqualität
5. **Versionierung**: Models versionieren (z.B. `PersonAttributes_v2.mlmodel`)

## Nächste Schritte

1. ✅ Core ML Integration implementiert (ohne Training)
2. ⏳ Models von externen Quellen beschaffen/konvertieren
3. ⏳ Models im `packages/vision-service/Models/` Verzeichnis platzieren
4. ⏳ System testen mit/ohne Models
5. ⏳ Performance optimieren

## Weitere Ressourcen

- [Apple Core ML Documentation](https://developer.apple.com/documentation/coreml)
- [Create ML Documentation](https://developer.apple.com/documentation/createml)
- [coremltools Documentation](https://coremltools.readme.io/)
- [Core ML Model Store](https://coreml.store/)

