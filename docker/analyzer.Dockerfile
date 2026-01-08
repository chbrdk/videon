# Analyzer Dockerfile für Python + OpenCV + FFmpeg
FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY packages/analyzer/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY packages/analyzer/src ./src

# Create storage directories
RUN mkdir -p /app/storage/videos /app/storage/keyframes

EXPOSE 5000

CMD ["python", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "5000"]
