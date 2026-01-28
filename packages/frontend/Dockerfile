# Multi-stage build for SvelteKit frontend
FROM node:18-alpine AS base

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

# Install dependencies fresh with legacy peer deps AND explicitly include dev dependencies
RUN npm install --legacy-peer-deps --include=dev --loglevel verbose

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
# Debug: Print versions
RUN node -v && npm -v

# Debug: Verify vite installation
RUN npm list vite || true
RUN ls -la node_modules/.bin || echo "node_modules/.bin missing"

# Debug: List ALL files in current directory to verify COPY worked
RUN ls -la

# Debug: Print config files (if they exist)
RUN cat svelte.config.js || echo "svelte.config.js missing"
RUN cat vite.config.ts || echo "vite.config.ts missing"

# Debug: Verify vite package exists on disk
RUN ls -la node_modules/vite/bin/vite.js || echo "vite.js missing"

# Debug: Run vite version directly via node (bypassing symlinks)
RUN node node_modules/vite/bin/vite.js --version || echo "Failed to run vite via node"

# Ensure SvelteKit types are generated
RUN npx svelte-kit sync || echo "svelte-kit sync failed"

# Run build using npm script (standard method)
RUN npm run build -- --debug

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
