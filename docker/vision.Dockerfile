# Vision Service Dockerfile für Swift + Vapor
FROM swift:5.9-focal

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    libz-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Package files
COPY packages/vision-service/Package.swift ./
COPY packages/vision-service/Sources ./Sources
COPY packages/vision-service/Tests ./Tests

# Build the application
RUN swift build -c release

# Create storage directory
RUN mkdir -p /app/storage/videos /app/storage/keyframes

# Create entrypoint script
RUN echo '#!/bin/bash\nset -e\ncd /app\n.exec swift run -c release VisionService' > /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
