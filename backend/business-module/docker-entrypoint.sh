#!/bin/sh
set -e

echo "Running database migrations..."

# Prisma's migrate deploy takes its own Postgres-level advisory lock, so
# concurrent container instances on a multi-instance rolling deploy mostly
# fail-safe rather than double-applying a migration. But combined with
# set -e, a losing instance whose migrate deploy call times out waiting for
# that lock would previously crash the entire container immediately rather
# than simply waiting for the winning instance to finish and release it.
# Retry with backoff instead of failing on the first attempt.
MAX_ATTEMPTS=5
ATTEMPT=1
until npx prisma migrate deploy; do
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "Migration failed after $MAX_ATTEMPTS attempts — giving up."
        exit 1
    fi
    echo "Migration attempt $ATTEMPT failed (likely lock contention from a concurrent instance) — retrying in 5s..."
    ATTEMPT=$((ATTEMPT + 1))
    sleep 5
done

echo "Starting server..."
exec node -r tsconfig-paths/register dist/server.js