#!/bin/bash
# Setup script for VIDEON STORION integration
# This script:
# 1. Creates the videon schema in STORION database
# 2. Runs Prisma migrations
# 3. Verifies the setup

set -e

echo "🚀 Setting up VIDEON STORION integration..."

# Check if STORION_DATABASE_URL is set
if [ -z "$STORION_DATABASE_URL" ]; then
    echo "⚠️  STORION_DATABASE_URL not set. Using default..."
    export STORION_DATABASE_URL="postgresql+psycopg://unison:unison@localhost:7505/storion"
fi

export USE_STORION_DB=true
export DATABASE_URL="$STORION_DATABASE_URL"

echo "📦 Step 1: Creating videon schema in STORION database..."
cd "$(dirname "$0")/.."
./scripts/create_videon_schema.sh

echo ""
echo "📦 Step 2: Running Prisma migrations..."
cd packages/backend

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running migrations..."
npx prisma migrate dev --name init_videon_schema --create-only

# Apply migrations
echo "Applying migrations..."
npx prisma migrate deploy

echo ""
echo "✅ VIDEON STORION integration setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify schema: docker exec -it msqdx-unison-postgres-1 psql -U unison -d storion -c '\\dn'"
echo "2. Check tables: docker exec -it msqdx-unison-postgres-1 psql -U unison -d storion -c 'SET search_path = videon, public; \\dt'"
echo "3. Start services: docker compose up -d"
