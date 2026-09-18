import uuid
from django.db import models
from django.utils import timezone


class Cita(models.Model):
    ESTADO_CHOICES = [
        ('pendiente_pago', 'Pendiente de Pago'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('atendida', 'Atendida'),
        ('no_asistio', 'No Asistió'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paciente = models.ForeignKey(
        'clinica.Paciente',
        on_delete=models.CASCADE,
        related_name='citas',
    )
    medico = models.ForeignKey(
        'clinica.Medico',
        on_delete=models.CASCADE,
        related_name='citas',
    )
    sede = models.ForeignKey(
        'clinica.Sede',
        on_delete=models.CASCADE,
        related_name='citas',
    )
    fecha_hora = models.DateTimeField()
    duracion_minutos = models.IntegerField(default=30)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente_pago')
    motivo = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'citas'
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        indexes = [
            models.Index(fields=['fecha_hora', 'medico'], name='idx_citas_fecha_medico'),
            models.Index(fields=['paciente'], name='idx_citas_paciente'),
        ]

    def __str__(self):
        return f"Cita {self.id} - {self.paciente.usuario.nombre_completo} con {self.medico.usuario.nombre_completo} ({self.fecha_hora})"


class ConsultaNota(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cita = models.OneToOneField(
        Cita,
        on_delete=models.CASCADE,
        related_name='notas',
    )
    diagnostico = models.TextField(null=True, blank=True)
    tratamiento = models.TextField(null=True, blank=True)
    receta_medica = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'consultas_notas'
        verbose_name = 'Nota de Consulta'
        verbose_name_plural = 'Notas de Consultas'

    def __str__(self):
        return f"Nota Cita {self.cita_id}"
