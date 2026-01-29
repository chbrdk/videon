# Multi-stage build for Node.js backend
FROM node:18-bullseye AS base

# Install system dependencies needed for build and runtime (openssl for Prisma, procps for signals)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
# Ignore lockfile to ensure fresh install matching package.json
RUN pnpm install

# Copy source code (exclude node_modules and dist)
COPY src ./src
COPY tsconfig.json ./
COPY prisma ./prisma
# Copy root tsconfig if needed (but we'll comment out extends in backend tsconfig)

# Build stage
FROM base AS build
WORKDIR /app
# Generate Prisma client before building TypeScript
RUN ls -la prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm run build

# Production stage
FROM node:18-bullseye AS production
WORKDIR /app

# Install system dependencies for Prisma, Python3, FFmpeg, and PySceneDetect
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    python3 \
    python3-pip \
    ffmpeg \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install PySceneDetect
RUN pip3 install --no-cache-dir --break-system-packages scenedetect[opencv]

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Copy JavaScript service files that are required at runtime
COPY --from=base /app/src/services/*.js ./dist/services/

# Install production dependencies (including prisma for generate)
RUN pnpm install --prod

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Expose port
EXPOSE 4001

# Start the application
# Start the application with auto DB push
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma && node dist/app.js"]
