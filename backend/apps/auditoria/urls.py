from django.urls import path
from .views import ListarAuditoriaView

urlpatterns = [
    path('', ListarAuditoriaView.as_view(), name='auditoria-list'),
    path('registros', ListarAuditoriaView.as_view(), name='auditoria-registros'),
    path('registros/', ListarAuditoriaView.as_view(), name='auditoria-registros-slash'),
]
