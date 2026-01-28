# Multi-stage build for SvelteKit frontend
FROM node:20-alpine AS base
WORKDIR /app

# Copy package files
COPY frontend/package.json ./
COPY frontend/package-lock.json ./

# Delete package-lock.json to avoid conflicts and force fresh install
RUN rm -f package-lock.json

# Force development environment to ensure devDependencies (vite, tailwind) are installed
ENV NODE_OPTIONS="--max-old-space-size=4096"
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

# Run Type Checks (Fail fast on code errors)
RUN npx svelte-check --tsconfig ./tsconfig.json --threshold error

# Run build and capture logs to ensure visibility on failure
RUN npm run build > build.log 2>&1 || { cat build.log; exit 1; }

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
