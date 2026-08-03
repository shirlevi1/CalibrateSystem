from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
API_PREFIX = os.getenv('API_PREFIX')

DB_HOST = os.getenv('DB_HOST', 'localhost')
SECRET_KEY = os.getenv('SECRET_KEY')
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / "static"]


ALLOWED_HOSTS = [
    'localhost',
    'aspis.sapir.ac.il',
    '127.0.0.1',
    '51.17.218.66'
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'calibrate',
    'rest_framework',
]

AUTH_USER_MODEL = 'calibrate.CustomUser'


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',


]

ROOT_URLCONF = 'calibrate.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'calibrate.wsgi.application'

DEBUG = os.getenv('DEBUG')

DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')

DATABASES = {
    "default": {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'calibrate_schema',
        'USER': 'calibrate_db_user',
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': '3306',
    }
}


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "calibrate.authentication.CookieJWTAuthentication",
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

CRM_PROXY_URL = os.getenv("CRM_PROXY_URL")
CRM_PROXY_API_KEY = os.getenv("CRM_PROXY_API_KEY")
MONDAY_BOARD_ID = os.getenv("MONDAY_BOARD_ID", "5090828016")
EXPONET_API_BASE_URL = os.getenv("EXPONET_API_BASE_URL")
EXPONET_API_KEY = os.getenv("EXPONET_API_KEY")
# Frontend URLs
# FRONTEND_URL is the base frontend address.
# It is used for dynamic frontend links, such as password reset links:
# http://localhost:5173/reset-password/<uid>/<token>
#
# FRONTEND_LOGIN_URL points directly to the login page.
# Keep it because it may be used by existing email flows,
# such as sending a login link when a new user is created.
#
# In production/Docker, both values should be configured through environment variables
# and must not point to localhost.

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

FRONTEND_LOGIN_URL = os.getenv(
    "FRONTEND_LOGIN_URL",
    f"{FRONTEND_URL}/login",
)


# Default primary key field type

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email configuration
# This project uses Brevo SMTP.
#
# Local development:
# Make sure BREVO_SMTP_USER and BREVO_SMTP_KEY exist in your local .env
# if you want real emails to be sent.
#
# Production/Docker:
# Make sure the following environment variables are configured:
# FRONTEND_URL, FRONTEND_LOGIN_URL, BREVO_SMTP_USER, BREVO_SMTP_KEY,
# DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, and ADMIN_EMAIL.
#
# Do not define DEFAULT_FROM_EMAIL twice, because the second definition overrides the first.

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp-relay.brevo.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"

EMAIL_HOST_USER = os.getenv("BREVO_SMTP_USER")
EMAIL_HOST_PASSWORD = os.getenv("BREVO_SMTP_KEY")

DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "Calibrate")

DEFAULT_FROM_EMAIL_ADDRESS = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "no-reply@calibrate.local",
)

DEFAULT_FROM_EMAIL = f"{DEFAULT_FROM_NAME} <{DEFAULT_FROM_EMAIL_ADDRESS}>"

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
