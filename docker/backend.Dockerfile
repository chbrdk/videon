# Backend Dockerfile für Node.js + TypeScript
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend

# Copy root tsconfig
COPY tsconfig.json ./

# Generate Prisma client
RUN pnpm --filter backend prisma generate

# Build application
RUN pnpm --filter backend build

# Production stage
FROM node:18-alpine AS production

# Install OpenSSL 3 for Prisma + pnpm + tsx
RUN apk add --no-cache openssl
RUN npm install -g pnpm tsx

WORKDIR /app

# Copy workspace configuration
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy built application
COPY --from=base /app/packages/backend ./packages/backend
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/tsconfig.json ./tsconfig.json

# Generate Prisma Client
RUN cd /app/packages/backend && npx prisma generate

# Create storage directory
RUN mkdir -p /app/storage/videos /app/storage/keyframes

# Copy entrypoint script
COPY docker/backend-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/entrypoint.sh"]
