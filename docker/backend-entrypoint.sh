#!/bin/sh
set -e

echo "Waiting for database..."
cd /app/packages/backend
until npx prisma migrate deploy 2>&1; do
  echo "Database migration failed, retrying in 2 seconds..."
  sleep 2
done

echo "Database migrations applied successfully!"
cd /app
exec tsx packages/backend/src/app.ts

