#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node -r tsconfig-paths/register dist/server.js