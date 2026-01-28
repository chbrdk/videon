# Multi-stage build for SvelteKit frontend
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY frontend/package.json ./
COPY frontend/pnpm-lock.yaml* frontend/package-lock.json* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Copy source code (exclude node_modules and build)
COPY frontend/src ./src
COPY frontend/static ./static
COPY frontend/svelte.config.js ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/postcss.config.js ./
COPY frontend/tailwind.config.mjs ./
COPY frontend/playwright.config.ts ./
COPY frontend/vitest.config.ts ./
# Copy MSQDX Design System (needed for tailwind.config.mjs)
# Note: Build context is from packages/ directory
COPY msqdx-design-system ./msqdx-design-system

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
