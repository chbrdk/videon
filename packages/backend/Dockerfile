# Multi-stage build for Node.js backend
FROM node:20-bookworm AS base

# Install system dependencies needed for build and runtime
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies using npm (fresh install, no lockfile)
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY prisma ./prisma

# Build stage
FROM base AS build
WORKDIR /app

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-bookworm AS production
WORKDIR /app

# Install system dependencies
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

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built application and prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Copy JavaScript service files
COPY --from=base /app/src/services/*.js ./dist/services/

# Generate Prisma client for production
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Expose port
EXPOSE 4001

# Start the application
CMD ["sh", "-c", "npx prisma generate --schema=./prisma/schema.prisma && npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma && node dist/app.js"]
