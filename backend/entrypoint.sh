#!/bin/bash
set -e

echo "==================== Django Startup ===================="

# Migration 실행
echo "Running database migrations..."
python /app/backend/manage.py migrate --noinput
echo "✅ Migrations completed!"

# Static 파일 수집
echo "Collecting static files..."
python /app/backend/manage.py collectstatic --noinput --clear || true
echo "✅ Static files collected!"

echo "Starting Django server..."
echo "========================================================"

exec "$@"
