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
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src ./src

# Create storage directories
RUN mkdir -p storage/videos storage/keyframes

# Expose port
EXPOSE 8001

# Start the application
CMD ["python", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8001"]
