#!/bin/bash
# Script to create videon schema in STORION database
# Usage: ./create_videon_schema.sh

set -e

# Default values
POSTGRES_HOST="${POSTGRES_HOST:-msqdx-unison-postgres-1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-unison}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-unison}"
POSTGRES_DB="${POSTGRES_DB:-storion}"

echo "Creating videon schema in STORION database..."
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"

# Check if running in Docker or locally
if command -v docker &> /dev/null && docker ps | grep -q "$POSTGRES_HOST"; then
    echo "Running in Docker environment..."
    docker exec -i "$POSTGRES_HOST" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
        -- Create videon schema if it doesn't exist
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'videon') THEN
                CREATE SCHEMA videon;
                RAISE NOTICE 'Schema videon created';
            ELSE
                RAISE NOTICE 'Schema videon already exists';
            END IF;
        END \$\$;
        
        -- Grant privileges to unison user
        GRANT ALL ON SCHEMA videon TO unison;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA videon TO unison;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA videon TO unison;
        ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON TABLES TO unison;
        ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON SEQUENCES TO unison;
        
        -- Verify schema creation
        SELECT schema_name, schema_owner 
        FROM information_schema.schemata 
        WHERE schema_name = 'videon';
EOSQL
else
    echo "Running locally (requires psql)..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
        -- Create videon schema if it doesn't exist
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'videon') THEN
                CREATE SCHEMA videon;
                RAISE NOTICE 'Schema videon created';
            ELSE
                RAISE NOTICE 'Schema videon already exists';
            END IF;
        END \$\$;
        
        -- Grant privileges to unison user
        GRANT ALL ON SCHEMA videon TO unison;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA videon TO unison;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA videon TO unison;
        ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON TABLES TO unison;
        ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON SEQUENCES TO unison;
        
        -- Verify schema creation
        SELECT schema_name, schema_owner 
        FROM information_schema.schemata 
        WHERE schema_name = 'videon';
EOSQL
fi

echo "✅ videon schema created successfully!"
