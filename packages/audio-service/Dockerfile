FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY packages/audio-service/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# Copy source code
COPY packages/audio-service/src/ ./src/
# Copy shared config
COPY config/ ./config/

# Set PYTHONPATH to include /app so we can import config
ENV PYTHONPATH=/app

# Create storage directory
RUN mkdir -p /app/storage/audio_stems

# Expose port
EXPOSE 5679

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://0.0.0.0:5679/health || exit 1

# Run the service
CMD ["python3", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "5679"]
