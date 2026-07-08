#!/bin/sh
set -e

mkdir -p /app/data

cd /app/backend
echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] starting backend on :8090..."
npx tsx src/index.ts &

echo "[entrypoint] starting nginx on :9080..."
exec nginx -g "daemon off;"
