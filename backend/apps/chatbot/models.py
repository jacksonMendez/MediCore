import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class SesionChat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sesiones_chat',
    )
    rol_origen = models.CharField(max_length=20, default='paciente')
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'sesiones_chat'
        verbose_name = 'Sesión de Chat'
        verbose_name_plural = 'Sesiones de Chat'

    def __str__(self):
        return f"Sesión {self.id} ({self.usuario.nombre_completo})"


class MensajeChat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sesion = models.ForeignKey(
        SesionChat,
        on_delete=models.CASCADE,
        related_name='mensajes',
    )
    emisor = models.CharField(max_length=20)  # 'usuario' | 'asistente'
    contenido = models.TextField()
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'mensajes_chat'
        verbose_name = 'Mensaje de Chat'
        verbose_name_plural = 'Mensajes de Chat'
        indexes = [
            models.Index(fields=['sesion', 'creado_en'], name='idx_mensajes_sesion'),
        ]

    def __str__(self):
        return f"[{self.emisor}] {self.contenido[:40]}..."
