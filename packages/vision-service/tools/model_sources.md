# Core ML Model Sources - Konkrete Downloads

Liste von konkreten, herunterladbaren Models für PrismVid Vision Service.

## 📦 Person Attributes Detection

### Option 1: FairFace (Hugging Face) - Empfohlen
**Model**: FairFace - Age, Gender, Race Classification
- **URL**: https://huggingface.co/models?search=fairface
- **Format**: PyTorch/ONNX
- **Klassen**: 
  - Age: 0-2, 3-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70+
  - Gender: Male, Female
  - Race: White, Black, Indian, East Asian, Southeast Asian, Middle Eastern, Latino
- **Download**:
```bash
# Mit Hugging Face CLI
pip install huggingface_hub
huggingface-cli download <model-id> --local-dir ./models/fairface

# Oder direkt über Python
python3 << EOF
from huggingface_hub import hf_hub_download
model_path = hf_hub_download(repo_id="<model-id>", filename="model.onnx")
print(f"Model downloaded to: {model_path}")
EOF
```

### Option 2: UTKFace Dataset-based Models
**GitHub**: https://github.com/yu4u/age-estimation
- **Format**: Keras/TensorFlow
- **Konvertierung**: TensorFlow → ONNX → Core ML
- **Download**:
```bash
git clone https://github.com/yu4u/age-estimation.git
cd age-estimation
# Models sind im Repository
```

### Option 3: Gender Classification (Lightweight)
**GitHub**: https://github.com/yu4u/gender-classification
- **Format**: Keras
- **Größe**: Klein (gut für Edge Devices)
- **Klassen**: Male, Female

### Option 4: Age-Gender-Net (ONNX Model Zoo)
**Quelle**: ONNX Model Zoo
- **URL**: https://github.com/onnx/models/tree/main/vision/body_analysis/age_gender_net
- **Format**: ONNX (bereits konvertiert)
- **Download**:
```bash
wget https://github.com/onnx/models/raw/main/vision/body_analysis/age_gender_net/model/age_gender_net.onnx
```

## 🚗 Vehicle Detection

### Option 1: YOLOv8 Vehicle Detection
**Quelle**: Ultralytics
- **URL**: https://github.com/ultralytics/ultralytics
- **Format**: PyTorch → ONNX
- **Klassen**: Car, Truck, Bus, Motorcycle
- **Download**:
```bash
pip install ultralytics
python3 << EOF
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # Nano version (kleinste)
model.export(format='onnx')  # Exportiert zu yolov8n.onnx
EOF
```

### Option 2: Vehicle Detection (COCO-trained)
**Model**: YOLOv5/YOLOv8 auf COCO Dataset
- **Format**: ONNX
- **Klassen**: Car, Truck, Bus, Motorcycle (von COCO)
- **Download**:
```bash
# YOLOv8 mit ultralytics (Python)
pip install ultralytics
python3 << EOF
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # Download und Export
model.export(format='onnx')  # Erstellt yolov8n.onnx
EOF

# Alternative: Direkt von Hugging Face
pip install huggingface_hub
python3 << EOF
from huggingface_hub import hf_hub_download
model_path = hf_hub_download(repo_id="ultralytics/yolov8", filename="yolov8n.onnx")
EOF
```

### Option 3: Car Make/Model Recognition
**GitHub**: https://github.com/marcdacosta/automotive-cnn
- **Format**: TensorFlow/Keras
- **Klassen**: Verschiedene Auto-Marken und -Modelle
- **Download**: Im Repository verfügbar

### Option 4: CompCars Dataset-based Models
**Dataset**: CompCars (Comprehensive Car Dataset)
- **URL**: https://github.com/yangxue0827/CompCars
- **Klassen**: Viele Marken und Modelle
- **Format**: Verschiedene (oft PyTorch)

## 🎨 Scene Classification

### Option 1: Places365 (Standard)
**Quelle**: MIT Places Dataset
- **URL**: https://github.com/CSAILVision/places365
- **Format**: PyTorch/Caffe
- **Klassen**: 365 Szenen-Kategorien
- **Download**:
```bash
wget http://places2.csail.mit.edu/models_places365/resnet18_places365.pth.tar
```

### Option 2: ImageNet-pretrained Models
**Quelle**: PyTorch Vision Models
- **Format**: PyTorch (leicht zu ONNX)
- **Klassen**: 1000 Klassen (inkl. viele Szenen)
- **Download**:
```python
import torchvision.models as models
model = models.resnet18(pretrained=True)
torch.onnx.export(model, dummy_input, "resnet18.onnx")
```

## 🔧 Konvertierung zu Core ML

### Beispiel 1: ONNX zu Core ML
```bash
cd packages/vision-service
python3 tools/convert_to_coreml.py age_gender_net.onnx \
    -o Models/PersonAttributes.mlmodel \
    -n PersonAttributes \
    --input-shape 1 3 224 224
```

### Beispiel 2: PyTorch zu Core ML
```bash
# Zuerst zu ONNX konvertieren
python3 << EOF
import torch
import torchvision.models as models

# Model laden
model = models.resnet18(pretrained=True)
model.eval()

# Dummy Input
dummy_input = torch.randn(1, 3, 224, 224)

# Export zu ONNX
torch.onnx.export(model, dummy_input, "model.onnx", 
                  input_names=['image'], output_names=['output'])
EOF

# Dann zu Core ML
python3 tools/convert_to_coreml.py model.onnx \
    -o Models/SceneClassifier.mlmodel \
    -n SceneClassifier
```

### Beispiel 3: TensorFlow zu Core ML
```bash
# TensorFlow → ONNX (mit tf2onnx)
pip install tf2onnx
python3 -m tf2onnx.convert --saved-model model_dir --output model.onnx

# ONNX → Core ML
python3 tools/convert_to_coreml.py model.onnx -o Models/model.mlmodel
```

## 📥 Automatische Downloads

### Script für alle empfohlenen Models

```bash
#!/bin/bash
# downloads_recommended_models.sh

MODELS_DIR="packages/vision-service/Models"
mkdir -p "$MODELS_DIR"

echo "📥 Lade empfohlene Models herunter..."

# 1. Age-Gender-Net (ONNX Model Zoo) - Person Attributes
echo "⬇️  Age-Gender-Net..."
wget -q https://github.com/onnx/models/raw/main/vision/body_analysis/age_gender_net/model/age_gender_net.onnx \
    -O "$MODELS_DIR/age_gender_net.onnx"

# 2. YOLOv8 Nano (Vehicle Detection) - klein und schnell
echo "⬇️  YOLOv8 Nano..."
wget -q https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx \
    -O "$MODELS_DIR/yolov8n.onnx"

# Konvertierung zu Core ML
if command -v python3 &> /dev/null && python3 -c "import coremltools" 2>/dev/null; then
    echo "🔄 Konvertiere zu Core ML..."
    
    # Age-Gender-Net → PersonAttributes
    python3 packages/vision-service/tools/convert_to_coreml.py \
        "$MODELS_DIR/age_gender_net.onnx" \
        -o "$MODELS_DIR/PersonAttributes.mlmodel" \
        -n PersonAttributes \
        --input-shape 1 3 224 224
    
    # YOLOv8 → VehicleDetector
    python3 packages/vision-service/tools/convert_to_coreml.py \
        "$MODELS_DIR/yolov8n.onnx" \
        -o "$MODELS_DIR/VehicleDetector.mlmodel" \
        -n VehicleDetector \
        --input-shape 1 3 640 640
    
    echo "✅ Konvertierung abgeschlossen"
else
    echo "⚠️  coremltools nicht installiert - Models müssen manuell konvertiert werden"
fi
```

## 🎯 Empfohlene Kombination für PrismVid

### Minimal (klein, schnell):
1. **Age-Gender-Net** (ONNX) → PersonAttributes.mlmodel
2. **YOLOv8 Nano** (ONNX) → VehicleDetector.mlmodel

### Erweitert (höhere Genauigkeit):
1. **FairFace** (PyTorch → ONNX) → PersonAttributes.mlmodel
2. **YOLOv8 Small** oder **Medium** → VehicleDetector.mlmodel
3. **Places365 ResNet18** → SceneClassifier.mlmodel

## 📝 Nächste Schritte

1. **Models herunterladen**: Verwende die Download-Links oben
2. **Konvertieren**: Mit `convert_to_coreml.py`
3. **Platzieren**: In `packages/vision-service/Models/`
4. **Testen**: Mit `test_coreml_integration.sh`

## 🔗 Nützliche Links

- **ONNX Model Zoo**: https://github.com/onnx/models
- **Hugging Face**: https://huggingface.co/models
- **Ultralytics YOLO**: https://github.com/ultralytics/ultralytics
- **Awesome CoreML Models**: https://github.com/likedan/Awesome-CoreML-Models

