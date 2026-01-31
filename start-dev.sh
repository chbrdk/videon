#!/bin/bash

# VIDEON Development Services Starter
# Startet alle Services für lokale Entwicklung

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Dynamischer Projektpfad (Verzeichnis des Skripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$SCRIPT_DIR}"
PID_FILE="$PROJECT_ROOT/.dev-services.pid"

echo -e "${GREEN}🚀 Starting VIDEON Development Environment${NC}"
echo "=========================================="

# Funktion zum Service starten
start_service() {
    local service_name=$1
    local directory=$2
    local command=$3
    local port=$4
    
    echo -e "${YELLOW}→ Starting $service_name...${NC}"
    cd "$directory"
    
    # Starte den Service im Hintergrund und speichere PID
    nohup $command > "$PROJECT_ROOT/logs/${service_name}.log" 2>&1 &
    SERVICE_PID=$!
    echo $SERVICE_PID >> "$PID_FILE"
    echo -e "${GREEN}  ✓ $service_name started (PID: $SERVICE_PID) on port $port${NC}"
}

# Erstelle Logs-Verzeichnis
mkdir -p "$PROJECT_ROOT/logs"

# Lösche alte PID-Datei
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
fi

# Starte Backend (Node.js)
start_service "backend" "$PROJECT_ROOT/packages/backend" "npm run dev" "4001"

# Warte kurz, damit Backend initialisiert
sleep 2

# Starte Frontend (SvelteKit)
start_service "frontend" "$PROJECT_ROOT/packages/frontend" "npm run dev" "3000"

# Warte kurz, damit Frontend initialisiert
sleep 2

# Starte Analyzer (Python FastAPI)
if [ ! -d "$PROJECT_ROOT/packages/analyzer/venv" ]; then
    echo -e "${YELLOW}Creating Analyzer virtual environment...${NC}"
    python3 -m venv "$PROJECT_ROOT/packages/analyzer/venv"
    "$PROJECT_ROOT/packages/analyzer/venv/bin/pip" install -r "$PROJECT_ROOT/packages/analyzer/requirements.txt"
fi
start_service "analyzer" "$PROJECT_ROOT/packages/analyzer" "$PROJECT_ROOT/packages/analyzer/venv/bin/python -m uvicorn src.api.server:app --host 0.0.0.0 --port 5678 --reload" "5678"

# Starte Saliency Service (Python FastAPI)
if [ ! -d "$PROJECT_ROOT/packages/saliency-service/venv" ]; then
    echo -e "${YELLOW}Creating Saliency virtual environment...${NC}"
    python3 -m venv "$PROJECT_ROOT/packages/saliency-service/venv"
    "$PROJECT_ROOT/packages/saliency-service/venv/bin/pip" install -r "$PROJECT_ROOT/packages/saliency-service/requirements.txt"
fi
mkdir -p "$PROJECT_ROOT/storage/saliency"
mkdir -p "$PROJECT_ROOT/storage/models"
export PYTHONPATH="$PROJECT_ROOT/packages/saliency-service/src"
start_service "saliency" "$PROJECT_ROOT/packages/saliency-service" "$PROJECT_ROOT/packages/saliency-service/venv/bin/python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8002 --reload" "8002"

# Starte Audio Separation Service (Python FastAPI)
if [ ! -d "$PROJECT_ROOT/packages/audio-separation-service/venv" ]; then
    echo -e "${YELLOW}Creating Audio Separation virtual environment...${NC}"
    python3 -m venv "$PROJECT_ROOT/packages/audio-separation-service/venv"
    "$PROJECT_ROOT/packages/audio-separation-service/venv/bin/pip" install -r "$PROJECT_ROOT/packages/audio-separation-service/requirements.txt"
fi
export PYTHONPATH="$PROJECT_ROOT/packages/audio-separation-service/src:$PYTHONPATH"
start_service "audio-separation" "$PROJECT_ROOT/packages/audio-separation-service" "$PROJECT_ROOT/packages/audio-separation-service/venv/bin/python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8003 --reload" "8003"

# Starte Vision Service (native macOS Swift Service)
echo -e "${YELLOW}→ Starting Vision Service...${NC}"
"$PROJECT_ROOT/tools/vision-service.sh" start

# Starte Qwen VL Service (Python MLX)
if [ ! -d "$PROJECT_ROOT/packages/qwen-vl-service/.venv312" ]; then
    echo -e "${YELLOW}Creating Qwen VL virtual environment...${NC}"
    cd "$PROJECT_ROOT/packages/qwen-vl-service"
    python3.12 -m venv .venv312
    source .venv312/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi
start_service "qwen-vl" "$PROJECT_ROOT/packages/qwen-vl-service" "source .venv312/bin/activate && uvicorn src.api.server:app --host 0.0.0.0 --port 8081 --reload" "8081"

echo ""
echo -e "${GREEN}=========================================="
echo "✓ All services started successfully!"
echo "=========================================="
echo ""
echo "📊 Service URLs:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend:     http://localhost:4001"
echo "  Analyzer:    http://localhost:5678"
echo "  Saliency:    http://localhost:8002"
echo "  Audio Sep:   http://localhost:8003"
echo "  Vision:      http://localhost:8080"
echo "  Qwen VL:     http://localhost:8081"
echo ""
echo "📝 Logs: $PROJECT_ROOT/logs/"
echo "🛑 Stop: ./stop-dev.sh"
echo -e "${NC}"

