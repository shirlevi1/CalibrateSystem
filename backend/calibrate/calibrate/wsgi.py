import os
import sys

from django.core.wsgi import get_wsgi_application

SERVER_BASE = '/var/www/calibrate/server'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'calibrate.settings')

sys.path.append(SERVER_BASE)
sys.path.append(f'{SERVER_BASE}/calibrate')

application = get_wsgi_application()


