#!/bin/bash

# Vollständiges Setup-Script für Core ML Models
# Installiert Dependencies und konvertiert Models

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$(cd "$SCRIPT_DIR/../Models" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Core ML Models Setup${NC}"
echo "=========================="
echo ""

# Prüfe Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ python3 nicht gefunden${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ Python gefunden: $PYTHON_VERSION${NC}"
echo ""

# Erstelle venv falls nicht vorhanden
VENV_DIR="$SCRIPT_DIR/../.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${BLUE}🐍 Erstelle virtuelles Environment...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}✅ venv erstellt${NC}"
fi

# Aktiviere venv
source "$VENV_DIR/bin/activate"
echo -e "${GREEN}✅ venv aktiviert${NC}"
echo ""

# Installiere ultralytics für YOLOv8
echo -e "${BLUE}📦 Installiere ultralytics...${NC}"
if python3 -c "import ultralytics" 2>/dev/null; then
    echo -e "${GREEN}✅ ultralytics bereits installiert${NC}"
else
    echo "Installiere ultralytics..."
    pip install --quiet ultralytics 2>&1 | grep -E "(Requirement|Successfully|error|Collecting)" | head -5 || true
    if python3 -c "import ultralytics" 2>/dev/null; then
        echo -e "${GREEN}✅ ultralytics installiert${NC}"
    else
        echo -e "${YELLOW}⚠️  ultralytics Installation fehlgeschlagen${NC}"
        echo "   Bitte manuell installieren: pip install ultralytics"
    fi
fi
echo ""

# Installiere coremltools
echo -e "${BLUE}📦 Installiere coremltools...${NC}"
if python3 -c "import coremltools" 2>/dev/null; then
    echo -e "${GREEN}✅ coremltools bereits installiert${NC}"
else
    echo "Installiere coremltools..."
    pip install --quiet coremltools 2>&1 | grep -E "(Requirement|Successfully|error|Collecting)" | head -5 || true
    if python3 -c "import coremltools" 2>/dev/null; then
        echo -e "${GREEN}✅ coremltools installiert${NC}"
    else
        echo -e "${YELLOW}⚠️  coremltools Installation fehlgeschlagen${NC}"
        echo "   Bitte manuell installieren: pip install coremltools"
    fi
fi
echo ""

# YOLOv8 herunterladen und zu ONNX konvertieren
echo -e "${BLUE}🚗 YOLOv8 Download & Konvertierung...${NC}"
if [ -f "$MODELS_DIR/yolov8n.onnx" ] && [ -s "$MODELS_DIR/yolov8n.onnx" ]; then
    echo -e "${GREEN}✅ yolov8n.onnx bereits vorhanden${NC}"
else
    if python3 -c "import ultralytics" 2>/dev/null; then
        echo "Lade YOLOv8 Nano herunter und konvertiere zu ONNX..."
        cd "$MODELS_DIR"
        python3 << 'EOF'
from ultralytics import YOLO
import os

print("⬇️  Lade YOLOv8 Nano herunter...")
model = YOLO('yolov8n.pt')  # Lädt automatisch herunter falls nicht vorhanden
print("🔄 Konvertiere zu ONNX...")
model.export(format='onnx', imgsz=640)
print("✅ YOLOv8 Nano zu ONNX konvertiert")
EOF
        if [ -f "$MODELS_DIR/yolov8n.onnx" ] && [ -s "$MODELS_DIR/yolov8n.onnx" ]; then
            echo -e "${GREEN}✅ yolov8n.onnx erstellt${NC}"
        else
            echo -e "${YELLOW}⚠️  YOLOv8 Konvertierung fehlgeschlagen${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  ultralytics nicht verfügbar - YOLOv8 übersprungen${NC}"
    fi
fi
echo ""

# Konvertiere Age-Gender-Net zu Core ML
echo -e "${BLUE}🔄 Konvertiere Age-Gender-Net zu Core ML...${NC}"
if [ -f "$MODELS_DIR/PersonAttributes.mlmodel" ]; then
    echo -e "${GREEN}✅ PersonAttributes.mlmodel bereits vorhanden${NC}"
elif [ -f "$MODELS_DIR/age_gender_net.onnx" ]; then
    if python3 -c "import coremltools" 2>/dev/null; then
        echo "Konvertiere age_gender_net.onnx → PersonAttributes.mlmodel..."
        python3 "$SCRIPT_DIR/convert_to_coreml.py" \
            "$MODELS_DIR/age_gender_net.onnx" \
            -o "$MODELS_DIR/PersonAttributes.mlmodel" \
            -n PersonAttributes \
            --input-shape 1 3 224 224
        
        if [ -f "$MODELS_DIR/PersonAttributes.mlmodel" ]; then
            echo -e "${GREEN}✅ PersonAttributes.mlmodel erstellt${NC}"
        else
            echo -e "${YELLOW}⚠️  Konvertierung fehlgeschlagen${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  coremltools nicht verfügbar - Konvertierung übersprungen${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  age_gender_net.onnx nicht gefunden${NC}"
    echo "   Lade erst herunter mit: ./tools/download_recommended_models.sh"
fi
echo ""

# Konvertiere YOLOv8 zu Core ML
echo -e "${BLUE}🔄 Konvertiere YOLOv8 zu Core ML...${NC}"
if [ -f "$MODELS_DIR/VehicleDetector.mlmodel" ]; then
    echo -e "${GREEN}✅ VehicleDetector.mlmodel bereits vorhanden${NC}"
elif [ -f "$MODELS_DIR/yolov8n.onnx" ] && [ -s "$MODELS_DIR/yolov8n.onnx" ]; then
    if python3 -c "import coremltools" 2>/dev/null; then
        echo "Konvertiere yolov8n.onnx → VehicleDetector.mlmodel..."
        echo -e "${YELLOW}⚠️  Hinweis: YOLOv8-Konvertierung kann komplex sein${NC}"
        python3 "$SCRIPT_DIR/convert_to_coreml.py" \
            "$MODELS_DIR/yolov8n.onnx" \
            -o "$MODELS_DIR/VehicleDetector.mlmodel" \
            -n VehicleDetector \
            --input-shape 1 3 640 640 2>&1 || {
            echo -e "${YELLOW}⚠️  YOLOv8 Konvertierung fehlgeschlagen${NC}"
            echo "   YOLOv8 kann komplexe Operatoren enthalten, die Core ML nicht unterstützt"
            echo "   Alternative: Model als ONNX verwenden (benötigt ONNX Runtime)"
        }
        
        if [ -f "$MODELS_DIR/VehicleDetector.mlmodel" ]; then
            echo -e "${GREEN}✅ VehicleDetector.mlmodel erstellt${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  coremltools nicht verfügbar - Konvertierung übersprungen${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  yolov8n.onnx nicht gefunden${NC}"
fi
echo ""

# Zusammenfassung
echo -e "${BLUE}📊 Zusammenfassung${NC}"
echo "=============="
echo ""

models_found=0
if [ -f "$MODELS_DIR/PersonAttributes.mlmodel" ]; then
    echo -e "${GREEN}✅ PersonAttributes.mlmodel${NC}"
    models_found=$((models_found + 1))
else
    echo -e "${YELLOW}⚠️  PersonAttributes.mlmodel${NC}"
fi

if [ -f "$MODELS_DIR/VehicleDetector.mlmodel" ]; then
    echo -e "${GREEN}✅ VehicleDetector.mlmodel${NC}"
    models_found=$((models_found + 1))
else
    echo -e "${YELLOW}⚠️  VehicleDetector.mlmodel${NC}"
fi

echo ""
if [ $models_found -eq 2 ]; then
    echo -e "${GREEN}✅ Alle Models bereit!${NC}"
elif [ $models_found -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Ein Model bereit${NC}"
else
    echo -e "${YELLOW}⚠️  Keine Core ML Models gefunden${NC}"
fi

echo ""
echo "💡 Nächste Schritte:"
echo "   1. Vision Service neu starten: tools/vision-service.sh restart"
echo "   2. Model-Status prüfen: curl http://localhost:8080/models"
echo "   3. Integration testen: ./tools/test_coreml_integration.sh"

