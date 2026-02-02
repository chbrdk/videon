# Multi-stage build for Python analyzer
FROM python:3.9-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    gcc \
    g++ \
    python3-dev \
    curl \
    libgl1 \
    git \
    libsndfile1 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY packages/analyzer/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# Copy source code
COPY packages/analyzer/src ./src
# Copy shared config
COPY config/ ./config/

# Set PYTHONPATH
ENV PYTHONPATH=/app

# Create storage and model directories
RUN mkdir -p storage/videos storage/keyframes storage/audio_stems storage/saliency models storage/temp

# Download SAM model (vit_b) - Required for saliency detection
RUN curl -L -o models/sam_vit_b_01ec64.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth

# Expose port
EXPOSE 8001

# Start the application
CMD ["python", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8001"]
