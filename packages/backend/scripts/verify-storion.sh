#!/bin/bash
# Verification script for VIDEON STORION integration
# Checks if everything is set up correctly

set -e

echo "🔍 Verifying VIDEON STORION integration..."

# Default values
POSTGRES_HOST="${POSTGRES_HOST:-msqdx-unison-postgres-1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-unison}"
POSTGRES_DB="${POSTGRES_DB:-storion}"

echo ""
echo "1. Checking if PostgreSQL container is running..."
if docker ps | grep -q "$POSTGRES_HOST"; then
    echo "   ✅ PostgreSQL container is running"
else
    echo "   ❌ PostgreSQL container not found: $POSTGRES_HOST"
    echo "   Make sure UNION/STORION is running: cd ../UNION/msqdx-unison && docker compose up -d"
    exit 1
fi

echo ""
echo "2. Checking if videon schema exists..."
SCHEMA_EXISTS=$(PGPASSWORD=unison docker exec -e PGPASSWORD=unison "$POSTGRES_HOST" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'videon');")

if [ "$SCHEMA_EXISTS" = "t" ]; then
    echo "   ✅ videon schema exists"
else
    echo "   ❌ videon schema not found"
    echo "   Run: ./scripts/create_videon_schema.sh"
    exit 1
fi

echo ""
echo "3. Checking schema permissions..."
PERMISSIONS=$(PGPASSWORD=unison docker exec -e PGPASSWORD=unison "$POSTGRES_HOST" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT has_schema_privilege('unison', 'videon', 'USAGE');")

if [ "$PERMISSIONS" = "t" ]; then
    echo "   ✅ unison user has permissions on videon schema"
else
    echo "   ❌ unison user missing permissions on videon schema"
    exit 1
fi

echo ""
echo "4. Checking for tables in videon schema..."
TABLES=$(PGPASSWORD=unison docker exec -e PGPASSWORD=unison "$POSTGRES_HOST" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'videon';")

if [ "$TABLES" -gt "0" ]; then
    echo "   ✅ Found $TABLES table(s) in videon schema"
    PGPASSWORD=unison docker exec -e PGPASSWORD=unison "$POSTGRES_HOST" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'videon' ORDER BY tablename LIMIT 15;" | head -20
else
    echo "   ⚠️  No tables found in videon schema (migrations may not have run yet)"
fi

echo ""
echo "5. Checking STORION service..."
if curl -s http://localhost:8003/health > /dev/null 2>&1; then
    echo "   ✅ STORION service is reachable"
else
    echo "   ⚠️  STORION service not reachable at http://localhost:8003"
    echo "   Make sure STORION is running"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "Environment variables to set:"
echo "  export USE_STORION_DB=true"
echo "  export STORION_DATABASE_URL=postgresql+psycopg://unison:unison@msqdx-unison-postgres-1:5432/storion"
echo "  export STORION_STORAGE_URL=http://storion:8003"
echo "  export REDIS_URL=redis://msqdx-unison-redis-1:6379/0"
