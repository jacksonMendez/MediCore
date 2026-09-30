import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import PermissionDenied


class RegistroAuditoria(models.Model):
    ORIGEN_CHOICES = [
        ('bot_llm', 'Asistente IA (Groq / Failover)'),
        ('humano_paciente', 'Paciente Humano (Web/App)'),
        ('humano_medico', 'Médico Humano (Portal Doctor)'),
        ('humano_admin', 'Administrador Humano (Backoffice)'),
        ('humano_agente', 'Agente de Atención al Cliente'),
        ('sistema', 'Proceso Automatizado del Sistema'),
    ]

    ACCION_CHOICES = [
        ('cita_creada', 'Cita Creada'),
        ('cita_cancelada', 'Cita Cancelada'),
        ('cita_reagendada', 'Cita Reagendada'),
        ('cita_estado_cambiado', 'Estado de Cita Actualizado'),
        ('pqr_radicada', 'PQR / Reembolso Radicado'),
        ('pqr_aprobada', 'PQR Aprobada'),
        ('pqr_rechazada', 'PQR Rechazada'),
        ('pago_simulado', 'Pago Simulado'),
        ('pago_confirmado', 'Pago Confirmado'),
        ('medico_creado', 'Médico Creado'),
        ('medico_editado', 'Médico Editado'),
        ('sede_creada', 'Sede Creada'),
        ('sede_editada', 'Sede Editada'),
        ('especialidad_creada', 'Especialidad Creada'),
        ('especialidad_editada', 'Especialidad Editada'),
        ('login_exitoso', 'Inicio de Sesión Exitoso'),
        ('login_fallido', 'Intento de Inicio de Sesión Fallido'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        'authentication.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_auditoria',
    )
    rol_en_el_momento = models.CharField(max_length=40, null=True, blank=True)
    accion = models.CharField(max_length=60, choices=ACCION_CHOICES, db_index=True)
    entidad_tipo = models.CharField(max_length=60, db_index=True)
    entidad_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    datos_cambio = models.JSONField(default=dict, blank=True)
    origen = models.CharField(max_length=40, choices=ORIGEN_CHOICES, default='sistema', db_index=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    session_id = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        db_table = 'auditoria_registros'
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['usuario', 'timestamp'], name='idx_audit_user_time'),
            models.Index(fields=['entidad_tipo', 'entidad_id'], name='idx_audit_entity'),
            models.Index(fields=['accion', 'origen'], name='idx_audit_action_origin'),
        ]

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.accion} ({self.origen}) por {self.usuario or 'Anónimo'}"

    def save(self, *args, **kwargs):
        # Inmutability guarantee: can only insert, never update!
        if not self._state.adding and self.pk:
            raise PermissionDenied("Los registros de auditoría son inmutables y no pueden modificarse.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Inmutability guarantee: can never delete!
        raise PermissionDenied("Los registros de auditoría son inmutables y no pueden eliminarse.")
