# Multi-stage build for SvelteKit frontend
FROM node:18-alpine AS base

# Copy package files
COPY frontend/package.json ./
COPY frontend/package-lock.json ./

# Install dependencies using npm install (more permissive than ci)
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
# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Run build and print logs on failure
RUN npm run build -- --logLevel info > build.log 2>&1 || (cat build.log && exit 1)

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
