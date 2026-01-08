# Multi-stage build for Swift vision service
FROM swift:5.9-focal AS base

WORKDIR /app

# Copy Package.swift and Package.resolved
COPY Package.swift Package.resolved ./

# Install dependencies
RUN swift package resolve

# Copy source code
COPY Sources ./Sources
COPY Tests ./Tests

# Build stage
FROM base AS build
RUN swift build -c release

# Production stage
FROM ubuntu:20.04 AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libatomic1 \
    libc6 \
    libcurl4 \
    libgcc-s1 \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built executable
COPY --from=build /app/.build/release/VisionService ./

# Create storage directories
RUN mkdir -p storage/videos storage/keyframes

# Expose port
EXPOSE 8080

# Start the application
CMD ["./VisionService", "serve", "--hostname", "0.0.0.0", "--port", "8080"]
