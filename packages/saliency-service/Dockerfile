# Saliency Detection Service Dockerfile - Apple Silicon optimiert
FROM python:3.11-slim AS base

# System dependencies für Video Processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY packages/saliency-service/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
# Copy source code
COPY packages/saliency-service/src ./src
# Copy shared config
COPY config/ ./config/

# Set PYTHONPATH
ENV PYTHONPATH=/app
COPY packages/saliency-service/tests ./tests
COPY packages/saliency-service/pytest.ini ./

# Create storage directories
RUN mkdir -p storage/saliency storage/models storage/temp

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
