from django.urls import path
from .views import (
    DisponibilidadView,
    DiasDisponiblesView,
    CitaCreateView,
    MisCitasView,
    AgendaHoyView,
    CambiarEstadoCitaView,
)

urlpatterns = [
    path('disponibilidad', DisponibilidadView.as_view(), name='citas-disponibilidad'),
    path('disponibilidad/', DisponibilidadView.as_view(), name='citas-disponibilidad-slash'),
    path('dias-disponibles', DiasDisponiblesView.as_view(), name='citas-dias-disponibles'),
    path('dias-disponibles/', DiasDisponiblesView.as_view(), name='citas-dias-disponibles-slash'),
    path('', CitaCreateView.as_view(), name='citas-create'),
    path('mis-citas', MisCitasView.as_view(), name='citas-mis-citas'),
    path('mis-citas/', MisCitasView.as_view(), name='citas-mis-citas-slash'),
    path('agenda-hoy/<uuid:medico_id>', AgendaHoyView.as_view(), name='citas-agenda-hoy'),
    path('agenda-hoy/<uuid:medico_id>/', AgendaHoyView.as_view(), name='citas-agenda-hoy-slash'),
    path('<uuid:cita_id>/estado', CambiarEstadoCitaView.as_view(), name='citas-cambiar-estado'),
    path('<uuid:cita_id>/estado/', CambiarEstadoCitaView.as_view(), name='citas-cambiar-estado-slash'),
]
