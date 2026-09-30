"""
MediCore OS — URL Routing Configuration
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings

def root_health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "MediCore OS API",
        "version": "1.0.0",
    })

def api_health_check(request):
    return JsonResponse({
        "status": "ok",
        "database": "connected",
        "llm": "configured" if bool(settings.GROQ_API_KEY) else "not_configured",
    })

urlpatterns = [
    path('', root_health_check, name='root-health'),
    path('api/health', api_health_check, name='api-health'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/', include('apps.clinica.urls')),
    path('api/citas/', include('apps.citas.urls')),
    path('api/pagos/', include('apps.pagos.urls')),
    path('api/chat/', include('apps.chatbot.urls')),
    path('api/auditoria/', include('apps.auditoria.urls')),
]
