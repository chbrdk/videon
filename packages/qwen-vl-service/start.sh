#!/bin/bash

# Start Script für Qwen VL Service
# Startet den Service mit Python 3.12 und aktiviert venv

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prüfe Python 3.12
if ! command -v python3.12 &> /dev/null; then
    echo "❌ Python 3.12 not found. Please install: brew install python@3.12"
    exit 1
fi

# Aktiviere venv oder erstelle es
if [ ! -d ".venv312" ]; then
    echo "📦 Creating Python 3.12 venv..."
    python3.12 -m venv .venv312
    
    echo "📦 Installing dependencies..."
    source .venv312/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv312/bin/activate
fi

# Port aus Environment oder Default
PORT="${QWEN_VL_PORT:-8081}"

echo "🚀 Starting Qwen VL Service on port $PORT"
echo "📍 Service URL: http://localhost:$PORT"
echo ""

# Starte Service
uvicorn src.api.server:app --host 0.0.0.0 --port "$PORT" --reload

