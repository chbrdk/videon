# VIDEON STORION Integration Scripts

## Scripts

### `create_videon_schema.sh`
Creates the `videon` schema in STORION database.

**Usage:**
```bash
./scripts/create_videon_schema.sh
```

**Environment variables:**
- `POSTGRES_HOST` - PostgreSQL host (default: msqdx-unison-postgres-1)
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)
- `POSTGRES_USER` - PostgreSQL user (default: unison)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: unison)
- `POSTGRES_DB` - Database name (default: storion)

### `create_videon_schema.sql`
SQL script to create the videon schema. Can be run directly in psql:

```bash
psql -h localhost -p 7505 -U unison -d storion -f scripts/create_videon_schema.sql
```

### `setup-storion.sh` (in packages/backend/scripts/)
Complete setup script that:
1. Creates the videon schema
2. Runs Prisma migrations
3. Verifies the setup

**Usage:**
```bash
cd packages/backend
./scripts/setup-storion.sh
```

### `verify-storion.sh` (in packages/backend/scripts/)
Verification script that checks:
1. PostgreSQL container is running
2. videon schema exists
3. Schema permissions are correct
4. Tables exist in videon schema
5. STORION service is reachable

**Usage:**
```bash
cd packages/backend
./scripts/verify-storion.sh
```

## Quick Start

1. **Make sure UNION/STORION is running:**
   ```bash
   cd ../UNION/msqdx-unison
   docker compose up -d
   ```

2. **Create videon schema:**
   ```bash
   cd ../../videon
   ./scripts/create_videon_schema.sh
   ```

3. **Run Prisma migrations:**
   ```bash
   cd packages/backend
   export STORION_DATABASE_URL="postgresql+psycopg://unison:unison@localhost:7505/storion"
   export USE_STORION_DB=true
   export DATABASE_URL="$STORION_DATABASE_URL"
   npx prisma migrate dev --name init_videon_schema
   ```

4. **Verify setup:**
   ```bash
   ./scripts/verify-storion.sh
   ```

5. **Start VIDEON services:**
   ```bash
   cd ../..
   docker compose up -d
   ```

## Troubleshooting

### Schema already exists
If the schema already exists, the script will skip creation. This is safe.

### Connection refused
Make sure UNION/STORION PostgreSQL is running:
```bash
docker ps | grep postgres
```

### Permission denied
Make sure the unison user has permissions:
```bash
docker exec -it msqdx-unison-postgres-1 psql -U unison -d storion -c "GRANT ALL ON SCHEMA videon TO unison;"
```

### Prisma migration fails
Make sure DATABASE_URL points to STORION:
```bash
export DATABASE_URL="postgresql+psycopg://unison:unison@localhost:7505/storion"
export USE_STORION_DB=true
```
