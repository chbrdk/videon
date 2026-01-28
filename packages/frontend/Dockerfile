# Multi-stage build for SvelteKit frontend
FROM node:18-alpine AS base

# Copy package files
COPY frontend/package.json ./
COPY frontend/package-lock.json ./

# Force development environment to ensure devDependencies (vite, tailwind) are installed
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

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
# Build stage
FROM base AS build
WORKDIR /app
# Allow PUBLIC_BACKEND_URL to be passed at build time
ARG PUBLIC_BACKEND_URL=http://192.168.50.101:4001
ENV PUBLIC_BACKEND_URL=$PUBLIC_BACKEND_URL
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
# Debug: List installed packages to verify vite is present
RUN npm list --depth=0 || true

# Run build directly using npx to ensure we use the local binary
RUN npx vite build --logLevel info

# Production stage
# Production stage
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built application to Nginx web root
COPY --from=build /app/build /usr/share/nginx/html

# Copy Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
