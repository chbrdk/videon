#!/bin/bash

# Core ML Models Download Script für PrismVid
# Lädt vorgefertigte Models herunter oder konvertiert vorhandene Models

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$(cd "$SCRIPT_DIR/../Models" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "📦 PrismVid Core ML Models Setup"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob Models-Verzeichnis existiert
mkdir -p "$MODELS_DIR"

echo "📁 Models-Verzeichnis: $MODELS_DIR"
echo ""

# Funktion zum Download von Models
download_model() {
    local model_name=$1
    local model_url=$2
    local output_file="$MODELS_DIR/$model_name.mlmodel"
    
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}⚠️  $model_name.mlmodel bereits vorhanden${NC}"
        read -p "Überschreiben? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    echo -e "${GREEN}⬇️  Lade $model_name herunter...${NC}"
    
    if command -v curl &> /dev/null; then
        curl -L -o "$output_file" "$model_url"
    elif command -v wget &> /dev/null; then
        wget -O "$output_file" "$model_url"
    else
        echo -e "${RED}❌ curl oder wget benötigt für Downloads${NC}"
        return 1
    fi
    
    if [ -f "$output_file" ]; then
        echo -e "${GREEN}✅ $model_name heruntergeladen${NC}"
    else
        echo -e "${RED}❌ Download fehlgeschlagen${NC}"
        return 1
    fi
}

# Funktion zum Konvertieren von Models
convert_model() {
    local model_name=$1
    local input_file=$2
    local output_file="$MODELS_DIR/$model_name.mlmodel"
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}❌ Input-File nicht gefunden: $input_file${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🔄 Konvertiere $model_name...${NC}"
    
    # Verwende Python-Converter
    if [ -f "$SCRIPT_DIR/convert_to_coreml.py" ]; then
        python3 "$SCRIPT_DIR/convert_to_coreml.py" "$input_file" -o "$output_file" -n "$model_name"
    else
        echo -e "${RED}❌ convert_to_coreml.py nicht gefunden${NC}"
        return 1
    fi
}

# Menü
echo "Wählen Sie eine Option:"
echo ""
echo "1) Model von URL herunterladen (.mlmodel)"
echo "2) Model konvertieren (ONNX/PyTorch/TFLite → Core ML)"
echo "3) Beispiel-Modelle-Info anzeigen"
echo "4) Models-Verzeichnis öffnen"
echo "5) Model-Status prüfen"
echo ""
read -p "Option (1-5): " option

case $option in
    1)
        echo ""
        echo "📥 Model-Download"
        echo "================"
        read -p "Model-Name (z.B. PersonAttributes): " model_name
        read -p "URL zum .mlmodel File: " model_url
        
        download_model "$model_name" "$model_url"
        ;;
    
    2)
        echo ""
        echo "🔄 Model-Konvertierung"
        echo "======================"
        read -p "Input-File (ONNX/PyTorch/TFLite): " input_file
        read -p "Model-Name (z.B. PersonAttributes): " model_name
        
        # Prüfe ob coremltools installiert ist
        if ! python3 -c "import coremltools" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  coremltools nicht installiert${NC}"
            echo "Installieren mit: pip install coremltools"
            exit 1
        fi
        
        convert_model "$model_name" "$input_file"
        ;;
    
    3)
        echo ""
        echo "📚 Beispiel-Modelle-Informationen"
        echo "=================================="
        echo ""
        echo "🔍 Verfügbare Model-Quellen:"
        echo ""
        echo "1. Apple Core ML Models:"
        echo "   https://developer.apple.com/machine-learning/models/"
        echo ""
        echo "2. Hugging Face (konvertieren zu Core ML):"
        echo "   https://huggingface.co/models"
        echo "   - Suche nach: 'person attributes', 'age gender', 'vehicle detection'"
        echo ""
        echo "3. Core ML Model Store (Community):"
        echo "   https://coreml.store"
        echo ""
        echo "4. GitHub Repositories:"
        echo "   - Suche nach: 'coreml person attributes'"
        echo "   - Suche nach: 'coreml vehicle detection'"
        echo ""
        echo "💡 Tipp: Models können mit convert_to_coreml.py konvertiert werden"
        echo ""
        ;;
    
    4)
        echo ""
        echo "📁 Öffne Models-Verzeichnis..."
        open "$MODELS_DIR" 2>/dev/null || xdg-open "$MODELS_DIR" 2>/dev/null || echo "Verzeichnis: $MODELS_DIR"
        ;;
    
    5)
        echo ""
        echo "🔍 Model-Status"
        echo "=============="
        echo ""
        
        models=("PersonAttributes" "VehicleDetector" "SceneClassifier" "CustomObjectDetector")
        
        for model in "${models[@]}"; do
            model_file="$MODELS_DIR/$model.mlmodel"
            if [ -f "$model_file" ]; then
                size=$(du -h "$model_file" | cut -f1)
                echo -e "${GREEN}✅ $model.mlmodel${NC} ($size)"
            else
                echo -e "${YELLOW}⚠️  $model.mlmodel${NC} (nicht vorhanden)"
            fi
        done
        
        echo ""
        echo "💡 Models-Verzeichnis: $MODELS_DIR"
        ;;
    
    *)
        echo "Ungültige Option"
        exit 1
        ;;
esac

echo ""
echo "✅ Fertig!"

