#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Automatically create a superuser on the free tier of Render
python manage.py shell -c "from django.contrib.auth.models import User; import os; User.objects.filter(username=os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')).exists() or User.objects.create_superuser(os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin'), os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com'), os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123'))"

