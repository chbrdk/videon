# Qwen VL Service Dockerfile
# MLX-basiert für Apple Silicon

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# Note: MLX might need special handling for Apple Silicon
RUN pip install --no-cache-dir -r requirements.txt

# Try to install MLX (might fail on non-Apple Silicon systems)
# If running on Apple Silicon with Docker Desktop, this should work
RUN pip install --no-cache-dir mlx mlx-lm --index-url https://mlx.github.io/MLX/releases/python/ || echo "MLX installation skipped (not Apple Silicon or needs manual install)"

# Copy source code
COPY src/ ./src/
COPY start.sh ./

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "from httpx import get; get('http://localhost:8081/health').raise_for_status()" || exit 1

# Start command
CMD ["python", "-m", "src.api.server"]
