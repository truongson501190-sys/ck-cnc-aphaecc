#!/bin/bash
set -e

echo "Starting Backend AI Gateway..."

# Chờ redis sẵn sàng nếu có
if [ -n "$REDIS_URL" ]; then
    echo "Waiting for Redis..."
    until nc -z redis 6379; do
        sleep 1
    done
    echo "Redis ready"
fi

# Chạy migrations nếu có
# python manage.py migrate

# Chạy ứng dụng
exec "$@"