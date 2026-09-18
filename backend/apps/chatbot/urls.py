from django.urls import path
from .views import EnviarMensajeView, ListarSesionesView, MensajesSesionView

urlpatterns = [
    path('mensaje', EnviarMensajeView.as_view(), name='chat-mensaje'),
    path('mensaje/', EnviarMensajeView.as_view(), name='chat-mensaje-slash'),
    path('sesiones', ListarSesionesView.as_view(), name='chat-sesiones'),
    path('sesiones/', ListarSesionesView.as_view(), name='chat-sesiones-slash'),
    path('sesiones/<uuid:sesion_id>/mensajes', MensajesSesionView.as_view(), name='chat-mensajes-sesion'),
    path('sesiones/<uuid:sesion_id>/mensajes/', MensajesSesionView.as_view(), name='chat-mensajes-sesion-slash'),
    path('sesiones/<uuid:sesion_id>', MensajesSesionView.as_view(), name='chat-eliminar-sesion'),
    path('sesiones/<uuid:sesion_id>/', MensajesSesionView.as_view(), name='chat-eliminar-sesion-slash'),
]
