#!/bin/bash

# VIDEON Development Services Stopper
# Stoppt alle gestarteten Services

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

echo -e "${YELLOW}🛑 Stopping VIDEON Development Services${NC}"
echo "=========================================="

if [ ! -f "$PID_FILE" ]; then
    echo -e "${RED}No running services found.${NC}"
    exit 0
fi

# Lese PIDs und stoppe Services
while read -r pid; do
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping process $pid...${NC}"
        kill $pid 2>/dev/null || true
    fi
done < "$PID_FILE"

# Lösche PID-Datei
rm -f "$PID_FILE"

echo -e "${GREEN}✓ All services stopped${NC}"
echo ""

# Optional: Stoppe auch manuell nach Prozess-Namen (Falls PIDs nicht funktionieren)
echo -e "${YELLOW}Cleaning up remaining processes...${NC}"
pkill -f "tsx watch src/app.ts" 2>/dev/null || true
pkill -f "vite dev" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "analyzer" 2>/dev/null || true
pkill -f "saliency" 2>/dev/null || true
pkill -f "audio-separation" 2>/dev/null || true

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

