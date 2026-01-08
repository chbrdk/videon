#!/bin/bash

# Download Script für empfohlene Core ML Models
# Lädt die am besten verfügbaren Models herunter und konvertiert sie

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

echo -e "${BLUE}📥 Core ML Models Download & Konvertierung${NC}"
echo "=========================================="
echo ""

# Prüfe ob Models-Verzeichnis existiert
mkdir -p "$MODELS_DIR"

# Prüfe ob coremltools installiert ist
CONVERT_AVAILABLE=false
if command -v python3 &> /dev/null; then
    if python3 -c "import coremltools" 2>/dev/null; then
        CONVERT_AVAILABLE=true
        echo -e "${GREEN}✅ coremltools gefunden${NC}"
    else
        echo -e "${YELLOW}⚠️  coremltools nicht installiert${NC}"
        echo "   Models werden nur heruntergeladen, nicht konvertiert"
        echo "   Konvertierung später mit: pip install coremltools"
        echo ""
        echo -e "${YELLOW}ℹ️  Download wird fortgesetzt...${NC}"
    fi
else
    echo -e "${RED}❌ python3 nicht gefunden${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Verfügbare Models:${NC}"
echo "1) Age-Gender-Net (Person Attributes) - ONNX"
echo "2) YOLOv8 Nano (Vehicle Detection) - ONNX"
echo "3) Beide Models"
echo ""
read -p "Wähle Option (1-3): " option

download_age_gender() {
    echo ""
    echo -e "${BLUE}⬇️  Lade Age-Gender-Net...${NC}"
    
    # ONNX Model Zoo - Age-Gender-Net
    URL="https://github.com/onnx/models/raw/main/vision/body_analysis/age_gender_net/model/age_gender_net.onnx"
    OUTPUT="$MODELS_DIR/age_gender_net.onnx"
    
    if [ -f "$OUTPUT" ]; then
        echo -e "${YELLOW}⚠️  age_gender_net.onnx bereits vorhanden${NC}"
        read -p "Überschreiben? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    if command -v curl &> /dev/null; then
        curl -L -o "$OUTPUT" "$URL" || {
            echo -e "${RED}❌ Download fehlgeschlagen${NC}"
            return 1
        }
    elif command -v wget &> /dev/null; then
        wget -O "$OUTPUT" "$URL" || {
            echo -e "${RED}❌ Download fehlgeschlagen${NC}"
            return 1
        }
    else
        echo -e "${RED}❌ curl oder wget benötigt${NC}"
        return 1
    fi
    
    if [ -f "$OUTPUT" ]; then
        echo -e "${GREEN}✅ Age-Gender-Net heruntergeladen${NC}"
        
        # Konvertierung zu Core ML
        if [ "$CONVERT_AVAILABLE" = true ]; then
            echo -e "${BLUE}🔄 Konvertiere zu Core ML...${NC}"
            python3 "$SCRIPT_DIR/convert_to_coreml.py" \
                "$OUTPUT" \
                -o "$MODELS_DIR/PersonAttributes.mlmodel" \
                -n PersonAttributes \
                --input-shape 1 3 224 224
            
            if [ -f "$MODELS_DIR/PersonAttributes.mlmodel" ]; then
                echo -e "${GREEN}✅ PersonAttributes.mlmodel erstellt${NC}"
                # Optional: ONNX-Datei löschen
                read -p "ONNX-Datei löschen? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm "$OUTPUT"
                fi
            else
                echo -e "${YELLOW}⚠️  Konvertierung fehlgeschlagen${NC}"
            fi
        else
            echo -e "${YELLOW}ℹ️  Konvertierung übersprungen (coremltools nicht verfügbar)${NC}"
            echo "   Manuell konvertieren mit:"
            echo "   python3 tools/convert_to_coreml.py $OUTPUT -o Models/PersonAttributes.mlmodel"
        fi
    fi
}

download_yolov8() {
    echo ""
    echo -e "${BLUE}⬇️  Lade YOLOv8 Nano...${NC}"
    
    # Ultralytics YOLOv8 Nano (ONNX)
    URL="https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx"
    OUTPUT="$MODELS_DIR/yolov8n.onnx"
    
    if [ -f "$OUTPUT" ]; then
        echo -e "${YELLOW}⚠️  yolov8n.onnx bereits vorhanden${NC}"
        read -p "Überschreiben? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    if command -v curl &> /dev/null; then
        curl -L -o "$OUTPUT" "$URL" || {
            echo -e "${RED}❌ Download fehlgeschlagen${NC}"
            return 1
        }
    elif command -v wget &> /dev/null; then
        wget -O "$OUTPUT" "$URL" || {
            echo -e "${RED}❌ Download fehlgeschlagen${NC}"
            return 1
        }
    else
        echo -e "${RED}❌ curl oder wget benötigt${NC}"
        return 1
    fi
    
    if [ -f "$OUTPUT" ]; then
        echo -e "${GREEN}✅ YOLOv8 Nano heruntergeladen${NC}"
        
        # Konvertierung zu Core ML
        if [ "$CONVERT_AVAILABLE" = true ]; then
            echo -e "${BLUE}🔄 Konvertiere zu Core ML...${NC}"
            echo -e "${YELLOW}⚠️  Hinweis: YOLOv8 benötigt Input-Shape 640x640${NC}"
            
            python3 "$SCRIPT_DIR/convert_to_coreml.py" \
                "$OUTPUT" \
                -o "$MODELS_DIR/VehicleDetector.mlmodel" \
                -n VehicleDetector \
                --input-shape 1 3 640 640
            
            if [ -f "$MODELS_DIR/VehicleDetector.mlmodel" ]; then
                echo -e "${GREEN}✅ VehicleDetector.mlmodel erstellt${NC}"
                # Optional: ONNX-Datei löschen
                read -p "ONNX-Datei löschen? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm "$OUTPUT"
                fi
            else
                echo -e "${YELLOW}⚠️  Konvertierung fehlgeschlagen${NC}"
                echo -e "${YELLOW}ℹ️  YOLOv8 ist komplex - möglicherweise manuelle Anpassung nötig${NC}"
            fi
        else
            echo -e "${YELLOW}ℹ️  Konvertierung übersprungen (coremltools nicht verfügbar)${NC}"
            echo "   Manuell konvertieren mit:"
            echo "   python3 tools/convert_to_coreml.py $OUTPUT -o Models/VehicleDetector.mlmodel --input-shape 1 3 640 640"
        fi
    fi
}

# Ausführung basierend auf Auswahl
case $option in
    1)
        download_age_gender
        ;;
    2)
        download_yolov8
        ;;
    3)
        download_age_gender
        download_yolov8
        ;;
    *)
        echo "Ungültige Option"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Download abgeschlossen${NC}"
echo ""
echo "📁 Models-Verzeichnis: $MODELS_DIR"
echo ""
echo "💡 Nächste Schritte:"
echo "   1. Vision Service neu starten: tools/vision-service.sh restart"
echo "   2. Model-Status prüfen: curl http://localhost:8080/models"
echo "   3. Integration testen: ./tools/test_coreml_integration.sh"

