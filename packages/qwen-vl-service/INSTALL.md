# MLX Installation Guide

## Problem

MLX unterstützt aktuell **Python 3.9-3.12**, aber das System hat Python 3.14.

## Lösungen

### Option 1: Python 3.12 venv (Empfohlen)

```bash
# Python 3.12 venv erstellen
python3.12 -m venv .venv312
source .venv312/bin/activate

# Dependencies installieren
pip install --upgrade pip
pip install mlx mlx-lm mlx-vlm
pip install fastapi uvicorn[standard] pydantic loguru pillow numpy transformers
```

### Option 2: Pyenv verwenden

```bash
# Pyenv installieren (falls nicht vorhanden)
brew install pyenv

# Python 3.12 installieren
pyenv install 3.12.8

# In diesem Verzeichnis verwenden
pyenv local 3.12.8

# Venv erstellen
python -m venv .venv
source .venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt
```

### Option 3: Docker Container

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir mlx mlx-lm mlx-vlm fastapi uvicorn pydantic loguru pillow numpy transformers

COPY . .
CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8081"]
```

## Nach Installation

```bash
# Test ausführen
python test_qwen.py

# Oder Service starten
uvicorn src.api.server:app --host 0.0.0.0 --port 8081
```

## Model Download

Beim ersten Start wird automatisch das Model `mlx-community/Qwen3-VL-8B-Instruct-3bit` (~3GB) von Hugging Face heruntergeladen.

