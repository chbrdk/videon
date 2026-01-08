# Multi-stage build for SvelteKit frontend
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml* package-lock.json* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Copy source code (exclude node_modules and build)
COPY src ./src
COPY static ./static
COPY svelte.config.js ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY playwright.config.ts ./
COPY vitest.config.ts ./

# Build stage
FROM base AS build
WORKDIR /app
# Allow PUBLIC_BACKEND_URL to be passed at build time
ARG PUBLIC_BACKEND_URL=http://192.168.50.101:4001
ENV PUBLIC_BACKEND_URL=$PUBLIC_BACKEND_URL
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built application
COPY --from=build /app/build ./build

# Verify build directory exists
RUN ls -la build || echo "Build directory check"

# Expose port
EXPOSE 3003

# Start the application
CMD ["serve", "-s", "build", "-l", "3003"]
