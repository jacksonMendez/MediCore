import uuid
from django.db import models
from django.utils import timezone


class EstadoCita(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'estados_cita'
        verbose_name = 'Estado de Cita'
        verbose_name_plural = 'Estados de Citas'

    def __str__(self):
        return self.nombre

    def __eq__(self, other):
        if isinstance(other, str):
            return self.codigo == other
        return super().__eq__(other)

    def __hash__(self):
        return super().__hash__()


class TipoPQR(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'tipos_pqr'
        verbose_name = 'Tipo de PQR'
        verbose_name_plural = 'Tipos de PQR'

    def __str__(self):
        return self.nombre


class EstadoPQR(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'estados_pqr'
        verbose_name = 'Estado de PQR'
        verbose_name_plural = 'Estados de PQR'

    def __str__(self):
        return self.nombre


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
    estado = models.ForeignKey(
        EstadoCita,
        on_delete=models.PROTECT,
        db_column='estado',
        default='pendiente_pago',
        related_name='citas',
    )
    motivo = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'citas'
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        indexes = [
            models.Index(fields=['fecha_hora', 'medico'], name='idx_citas_fecha_medico'),
            models.Index(fields=['paciente'], name='idx_citas_paciente'),
            models.Index(fields=['estado', 'fecha_hora'], name='idx_citas_estado_fecha'),
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
    archivo_adjunto = models.TextField(null=True, blank=True, help_text='Documento clínico adjunto en Base64 (PDF o Word)')
    archivo_nombre = models.CharField(max_length=255, null=True, blank=True, help_text='Nombre original del documento')
    archivo_tipo = models.CharField(max_length=100, null=True, blank=True, help_text='Tipo MIME del archivo adjunto')
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'consultas_notas'
        verbose_name = 'Nota de Consulta'
        verbose_name_plural = 'Notas de Consultas'

    def __str__(self):
        return f"Nota Cita {self.cita_id}"


class PQRSolicitud(models.Model):
    ESTADO_CHOICES = [
        ('pendiente_revision', 'Pendiente de Revisión'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cita = models.ForeignKey(
        Cita,
        on_delete=models.CASCADE,
        related_name='pqr_solicitudes',
    )
    paciente = models.ForeignKey(
        'clinica.Paciente',
        on_delete=models.CASCADE,
        related_name='pqr_solicitudes',
    )
    tipo = models.ForeignKey(
        TipoPQR,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        default='reembolso',
        related_name='pqr_solicitudes',
    )
    motivo = models.TextField()
    estado = models.ForeignKey(
        EstadoPQR,
        on_delete=models.PROTECT,
        db_column='estado',
        default='pendiente_revision',
        related_name='pqr_solicitudes',
    )
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'pqr_solicitudes'
        verbose_name = 'Solicitud PQR'
        verbose_name_plural = 'Solicitudes PQR'
        indexes = [
            models.Index(fields=['paciente', 'estado'], name='idx_pqr_paciente_estado'),
        ]

    def __str__(self):
        return f"PQR {self.id} - Cita {self.cita_id} ({self.estado_id})"
