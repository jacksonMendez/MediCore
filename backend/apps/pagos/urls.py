from django.urls import path
from .views import SimularPagoView, WebhookPagoView, DetallePagoView, MisPagosView

urlpatterns = [
    path('', MisPagosView.as_view(), name='pagos-list'),
    path('mis-pagos', MisPagosView.as_view(), name='pagos-mis-pagos'),
    path('mis-pagos/', MisPagosView.as_view(), name='pagos-mis-pagos-slash'),
    path('simular', SimularPagoView.as_view(), name='pagos-simular'),
    path('simular/', SimularPagoView.as_view(), name='pagos-simular-slash'),
    path('webhook', WebhookPagoView.as_view(), name='pagos-webhook'),
    path('webhook/', WebhookPagoView.as_view(), name='pagos-webhook-slash'),
    path('<uuid:cita_id>', DetallePagoView.as_view(), name='pagos-detalle'),
    path('<uuid:cita_id>/', DetallePagoView.as_view(), name='pagos-detalle-slash'),
]

