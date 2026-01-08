#!/bin/bash

# Test Script für Core ML Integration
# Testet ob Models korrekt geladen werden und Vision Service sie verwendet

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$(cd "$SCRIPT_DIR/../Models" && pwd)"
VISION_SERVICE_URL="${VISION_SERVICE_URL:-http://localhost:8080}"

echo "🧪 Core ML Integration Test"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prüfe Vision Service Status
echo -e "${BLUE}1. Vision Service Status prüfen...${NC}"
if curl -s -f "$VISION_SERVICE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Vision Service läuft${NC}"
else
    echo -e "${RED}❌ Vision Service nicht erreichbar unter $VISION_SERVICE_URL${NC}"
    echo "💡 Starte Vision Service mit: tools/vision-service.sh start"
    exit 1
fi

echo ""

# Prüfe Model-Status
echo -e "${BLUE}2. Model-Status abfragen...${NC}"
models_response=$(curl -s "$VISION_SERVICE_URL/models" 2>/dev/null || echo "")

if [ -n "$models_response" ]; then
    echo "Response:"
    echo "$models_response" | python3 -m json.tool 2>/dev/null || echo "$models_response"
    
    # Parse loaded models
    loaded_count=$(echo "$models_response" | grep -o '"loaded": true' | wc -l || echo "0")
    echo ""
    echo -e "${GREEN}✅ $loaded_count Model(s) geladen${NC}"
else
    echo -e "${YELLOW}⚠️  Models-Endpoint nicht verfügbar oder leer${NC}"
fi

echo ""

# Prüfe Models im Verzeichnis
echo -e "${BLUE}3. Models im Verzeichnis prüfen...${NC}"
models=("PersonAttributes" "VehicleDetector" "SceneClassifier" "CustomObjectDetector")

found_count=0
for model in "${models[@]}"; do
    model_file="$MODELS_DIR/$model.mlmodel"
    if [ -f "$model_file" ]; then
        size=$(du -h "$model_file" | cut -f1)
        echo -e "${GREEN}✅ $model.mlmodel${NC} ($size)"
        found_count=$((found_count + 1))
    else
        echo -e "${YELLOW}⚠️  $model.mlmodel${NC} (nicht vorhanden)"
    fi
done

echo ""
if [ $found_count -eq 0 ]; then
    echo -e "${YELLOW}ℹ️  Keine Models gefunden. Models sind optional.${NC}"
    echo "💡 Models können mit tools/download_models.sh hinzugefügt werden"
elif [ $found_count -gt 0 ]; then
    echo -e "${GREEN}✅ $found_count Model(s) im Verzeichnis gefunden${NC}"
fi

echo ""

# Test Vision Analysis (wenn Test-Keyframe vorhanden)
echo -e "${BLUE}4. Vision Analysis Test...${NC}"

# Suche nach einem Test-Keyframe
test_keyframe=""
if [ -d "$(dirname "$SCRIPT_DIR")/../../storage/keyframes" ]; then
    test_keyframe=$(find "$(dirname "$SCRIPT_DIR")/../../storage/keyframes" -name "*.jpg" -o -name "*.png" | head -1)
fi

if [ -n "$test_keyframe" ] && [ -f "$test_keyframe" ]; then
    echo "Test-Keyframe gefunden: $test_keyframe"
    echo ""
    echo "Führe Vision Analysis aus..."
    
    analysis_response=$(curl -s -X POST "$VISION_SERVICE_URL/analyze/vision" \
        -H "Content-Type: application/json" \
        -d "{\"sceneId\": \"test-coreml\", \"keyframePath\": \"$test_keyframe\"}" 2>/dev/null || echo "")
    
    if [ -n "$analysis_response" ]; then
        echo ""
        echo "Analysis Response (gekürzt):"
        
        # Prüfe auf Core ML Felder
        if echo "$analysis_response" | grep -q "personAttributes"; then
            echo -e "${GREEN}✅ personAttributes gefunden${NC}"
        else
            echo -e "${YELLOW}⚠️  personAttributes nicht in Response${NC}"
        fi
        
        if echo "$analysis_response" | grep -q "vehicleAttributes"; then
            echo -e "${GREEN}✅ vehicleAttributes gefunden${NC}"
        else
            echo -e "${YELLOW}⚠️  vehicleAttributes nicht in Response${NC}"
        fi
        
        if echo "$analysis_response" | grep -q "sceneClassification"; then
            echo -e "${GREEN}✅ sceneClassification gefunden${NC}"
        else
            echo -e "${YELLOW}⚠️  sceneClassification nicht in Response${NC}"
        fi
        
        echo ""
        echo "Vollständige Response:"
        echo "$analysis_response" | python3 -m json.tool 2>/dev/null | head -50 || echo "$analysis_response" | head -50
    else
        echo -e "${RED}❌ Vision Analysis fehlgeschlagen${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Kein Test-Keyframe gefunden${NC}"
    echo "💡 Lade ein Video hoch, um Keyframes zu generieren"
fi

echo ""
echo -e "${GREEN}✅ Test abgeschlossen${NC}"

