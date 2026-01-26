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

# Supercronic으로 cron 시작 (백그라운드)
if [ -f /app/backend/crontab ]; then
    echo "Starting cron jobs with supercronic..."
    supercronic /app/backend/crontab &
    echo "✅ Cron jobs started!"
fi

echo "Starting Django server..."
echo "========================================================"

exec "$@"
