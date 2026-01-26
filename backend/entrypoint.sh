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

# Cron 작업 등록
echo "Registering cron jobs..."
python /app/backend/manage.py crontab add
echo "✅ Cron jobs registered!"

echo "Starting Django server..."
echo "========================================================"

exec "$@"
