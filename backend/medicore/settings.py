"""
MediCore OS — Django Settings
Modular configuration for MediCore OS backend API.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add apps directory to sys.path
sys.path.insert(0, str(BASE_DIR / 'apps'))

# Load environment variables
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-medicore-secret-key-super-secure-dev')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',
    'drf_spectacular',

    # Local apps
    'apps.authentication',
    'apps.clinica',
    'apps.citas',
    'apps.pagos',
    'apps.chatbot',
    'apps.core',
    'apps.auditoria',
]

AUTH_USER_MODEL = 'authentication.Usuario'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'medicore.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'medicore.wsgi.application'
ASGI_APPLICATION = 'medicore.asgi.application'

# Database
# Default to SQLite medicore.db in backend folder
DATABASE_URL = os.getenv('DATABASE_URL', '')
if 'postgresql' in DATABASE_URL:
    import urllib.parse
    url = urllib.parse.urlparse(DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:],
            'USER': url.username,
            'PASSWORD': url.password,
            'HOST': url.hostname,
            'PORT': url.port or '5432',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'medicore.db',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
]

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.BCryptPasswordHasher',
]

# Internationalization
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4200",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4200",
    "http://127.0.0.1:3000",
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
    'DATE_FORMAT': '%Y-%m-%d',
    'TIME_FORMAT': '%H:%M:%S',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'MediCore OS — API Clínica Inteligente',
    'DESCRIPTION': (
        'Documentación OpenAPI / Swagger oficial de MediCore OS. '
        'Plataforma integral de gestión hospitalaria, agendamiento de citas, '
        'copiloto clínico con IA (Groq failover), pasarela de pagos, PQR y auditoría inmutable.'
    ),
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'SECURITY': [{'BearerAuth': []}],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'BearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
                'description': 'Ingresa tu token JWT obtenido en /api/auth/login/. Ejemplo: "Bearer <token>" o solo "<token>"',
            }
        }
    },
    'TAGS': [
        {'name': 'Auth', 'description': 'Autenticación JWT, verificación de sesión y roles.'},
        {'name': 'Chatbot LLM', 'description': 'Asistente conversacional clínico con orquestación Groq y failover.'},
        {'name': 'Citas', 'description': 'Disponibilidad médica, creación, consulta y cancelación de citas.'},
        {'name': 'Pagos', 'description': 'Simulación de pagos, webhooks y transacciones.'},
        {'name': 'PQR & Reembolsos', 'description': 'Gestión de Peticiones, Quejas, Reclamos y solicitudes de reembolso.'},
        {'name': 'Médicos', 'description': 'Gestión del cuerpo médico, agenda clínica y turnos.'},
        {'name': 'Sedes', 'description': 'Sedes físicas e infraestructura de atención.'},
        {'name': 'Especialidades', 'description': 'Catálogo de especialidades médicas y tarifas base.'},
        {'name': 'Auditoría', 'description': 'Trazabilidad inmutable de eventos clínicos, REST y bot_llm (Admin).'},
    ],
}

# JWT Settings
JWT_SECRET = os.getenv('JWT_SECRET', 'medicore-dev-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_MINUTES = 480  # 8 hours

# Groq Cloud LLM
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'qwen/qwen3.8-27b')
