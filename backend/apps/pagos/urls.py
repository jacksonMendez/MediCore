from django.urls import path
from .views import SimularPagoView, WebhookPagoView, DetallePagoView

urlpatterns = [
    path('simular', SimularPagoView.as_view(), name='pagos-simular'),
    path('simular/', SimularPagoView.as_view(), name='pagos-simular-slash'),
    path('webhook', WebhookPagoView.as_view(), name='pagos-webhook'),
    path('webhook/', WebhookPagoView.as_view(), name='pagos-webhook-slash'),
    path('<uuid:cita_id>', DetallePagoView.as_view(), name='pagos-detalle'),
    path('<uuid:cita_id>/', DetallePagoView.as_view(), name='pagos-detalle-slash'),
]
