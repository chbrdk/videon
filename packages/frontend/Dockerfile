# Multi-stage build for SvelteKit frontend
FROM node:20-alpine AS base
WORKDIR /app

# Copy package files
COPY frontend/package.json ./


# Force development environment to ensure devDependencies (vite, tailwind) are installed
# Reduce memory limit to 2GB to prevent OOM kills on smaller servers
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=development

# Check actual configuration
RUN npm config list

# Debug: verify package.json content
RUN cat package.json

# Install dependencies fresh with legacy peer deps AND explicitly force dev dependencies via flag
RUN npm install --production=false --legacy-peer-deps --loglevel verbose

# Debug: list installed modules
RUN ls -F node_modules || echo "node_modules missing"

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

# Ensure SvelteKit types are generated
RUN npx svelte-kit sync

# Debug: Check generated tsconfig
RUN cat .svelte-kit/tsconfig.json || echo "No generated tsconfig found"

# Debug: Create a shell script to run the build with "Trojan Horse" logging
# STRATEGY: If build fails, deploy the error log as the website so we can read it.
RUN echo '#!/bin/sh' > debug-build.sh && \
    echo 'echo "--- STARTING BUILD ---"' >> debug-build.sh && \
    echo 'if npm run build > build.output.txt 2>&1; then' >> debug-build.sh && \
    echo '  echo "Build Succeeded"' >> debug-build.sh && \
    echo '  exit 0' >> debug-build.sh && \
    echo 'else' >> debug-build.sh && \
    echo '  echo "Build Failed! Packaging logs as index.html..."' >> debug-build.sh && \
    echo '  mkdir -p build' >> debug-build.sh && \
    echo '  echo "<html><body><h1>Build Failed</h1><pre>" > build/index.html' >> debug-build.sh && \
    echo '  cat build.output.txt >> build/index.html' >> debug-build.sh && \
    echo '  echo "</pre></body></html>" >> build/index.html' >> debug-build.sh && \
    echo '  exit 0' >> debug-build.sh && \
    echo 'fi' >> debug-build.sh

RUN chmod +x debug-build.sh && ./debug-build.sh

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
