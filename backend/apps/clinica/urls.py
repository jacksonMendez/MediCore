from django.urls import path
from .views import (
    SedeListCreateView,
    SedeDetailView,
    EspecialidadListCreateView,
    EspecialidadDetailView,
    MedicoListCreateView,
    MedicoDetailView,
    HorariosMedicoView,
    CrearHorarioView,
)

urlpatterns = [
    path('sedes', SedeListCreateView.as_view(), name='sedes-list-create'),
    path('sedes/', SedeListCreateView.as_view(), name='sedes-list-create-slash'),
    path('sedes/<uuid:sede_id>', SedeDetailView.as_view(), name='sede-detail'),
    path('sedes/<uuid:sede_id>/', SedeDetailView.as_view(), name='sede-detail-slash'),
    path('especialidades', EspecialidadListCreateView.as_view(), name='especialidades-list-create'),
    path('especialidades/', EspecialidadListCreateView.as_view(), name='especialidades-list-create-slash'),
    path('especialidades/<uuid:especialidad_id>', EspecialidadDetailView.as_view(), name='especialidad-detail'),
    path('especialidades/<uuid:especialidad_id>/', EspecialidadDetailView.as_view(), name='especialidad-detail-slash'),
    path('medicos', MedicoListCreateView.as_view(), name='medicos-list-create'),
    path('medicos/', MedicoListCreateView.as_view(), name='medicos-list-create-slash'),
    path('medicos/<uuid:medico_id>', MedicoDetailView.as_view(), name='medico-detail'),
    path('medicos/<uuid:medico_id>/', MedicoDetailView.as_view(), name='medico-detail-slash'),
    path('medicos/<uuid:medico_id>/horarios', HorariosMedicoView.as_view(), name='medico-horarios'),
    path('medicos/<uuid:medico_id>/horarios/', HorariosMedicoView.as_view(), name='medico-horarios-slash'),
    path('medicos/horarios', CrearHorarioView.as_view(), name='crear-horario'),
    path('medicos/horarios/', CrearHorarioView.as_view(), name='crear-horario-slash'),
]

