# Saliency Detection Service Integration Test
# Testet den Service lokal ohne Docker

# Service-Verzeichnis
cd /Volumes/DOCKER_EXTERN/prismvid/packages/saliency-service

# Python Virtual Environment erstellen
python3 -m venv venv
source venv/bin/activate

# Dependencies installieren
pip install --upgrade pip
pip install -r requirements.txt

# Storage-Verzeichnisse erstellen
mkdir -p /Volumes/DOCKER_EXTERN/prismvid/storage/saliency
mkdir -p /Volumes/DOCKER_EXTERN/prismvid/storage/models
mkdir -p /Volumes/DOCKER_EXTERN/prismvid/storage/temp

# Service starten
export PYTHONPATH=/Volumes/DOCKER_EXTERN/prismvid/packages/saliency-service/src
export LOG_LEVEL=INFO
export BACKEND_URL=http://localhost:3001

python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8002 --reload
