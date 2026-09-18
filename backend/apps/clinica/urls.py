from django.urls import path
from .views import (
    SedeListCreateView,
    EspecialidadListCreateView,
    MedicoListCreateView,
    HorariosMedicoView,
    CrearHorarioView,
)

urlpatterns = [
    path('sedes', SedeListCreateView.as_view(), name='sedes-list-create'),
    path('sedes/', SedeListCreateView.as_view(), name='sedes-list-create-slash'),
    path('especialidades', EspecialidadListCreateView.as_view(), name='especialidades-list-create'),
    path('especialidades/', EspecialidadListCreateView.as_view(), name='especialidades-list-create-slash'),
    path('medicos', MedicoListCreateView.as_view(), name='medicos-list-create'),
    path('medicos/', MedicoListCreateView.as_view(), name='medicos-list-create-slash'),
    path('medicos/<uuid:medico_id>/horarios', HorariosMedicoView.as_view(), name='medico-horarios'),
    path('medicos/<uuid:medico_id>/horarios/', HorariosMedicoView.as_view(), name='medico-horarios-slash'),
    path('medicos/horarios', CrearHorarioView.as_view(), name='crear-horario'),
    path('medicos/horarios/', CrearHorarioView.as_view(), name='crear-horario-slash'),
]
