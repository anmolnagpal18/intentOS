#!/usr/bin/env bash
set -e

echo "Applying database migrations..."
python manage.py migrate --no-input

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Starting Daphne server..."
exec daphne intentos.asgi:application --port 8000 --bind 0.0.0.0
