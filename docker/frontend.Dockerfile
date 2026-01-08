# Frontend Dockerfile für Svelte 5
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/frontend ./packages/frontend

# Build application
RUN pnpm --filter frontend build

# Production stage
FROM nginx:alpine AS production

# Copy built assets
COPY --from=base /app/packages/frontend/build /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
