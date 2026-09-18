import uuid
from django.db import models
from django.conf import settings

class Sede(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=300)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'sedes'
        verbose_name = 'Sede'
        verbose_name_plural = 'Sedes'

    def __str__(self):
        return self.nombre


class Especialidad(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'especialidades'
        verbose_name = 'Especialidad'
        verbose_name_plural = 'Especialidades'

    def __str__(self):
        return self.nombre


class Paciente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='paciente',
    )
    documento_tipo = models.CharField(max_length=10, default='CC')
    documento_numero = models.CharField(max_length=30, unique=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    contacto_emergencia = models.CharField(max_length=200, null=True, blank=True)
    telefono_emergencia = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'pacientes'
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'

    def __str__(self):
        return f"{self.usuario.nombre_completo} ({self.documento_numero})"


class Medico(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medico',
    )
    especialidad = models.ForeignKey(
        Especialidad,
        on_delete=models.CASCADE,
        related_name='medicos',
    )
    sede = models.ForeignKey(
        Sede,
        on_delete=models.CASCADE,
        related_name='medicos',
    )
    tarjeta_profesional = models.CharField(max_length=50, unique=True)
    duracion_cita_minutos = models.IntegerField(default=30)
    genero = models.CharField(max_length=10, default='M', null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'medicos'
        verbose_name = 'Médico'
        verbose_name_plural = 'Médicos'

    def __str__(self):
        return f"{self.usuario.nombre_completo} - {self.especialidad.nombre}"


class HorarioMedico(models.Model):
    DIA_CHOICES = [
        ('lunes', 'Lunes'),
        ('martes', 'Martes'),
        ('miercoles', 'Miércoles'),
        ('jueves', 'Jueves'),
        ('viernes', 'Viernes'),
        ('sabado', 'Sábado'),
        ('domingo', 'Domingo'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medico = models.ForeignKey(
        Medico,
        on_delete=models.CASCADE,
        related_name='horarios',
    )
    dia = models.CharField(max_length=15, choices=DIA_CHOICES)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    class Meta:
        db_table = 'horarios_medico'
        verbose_name = 'Horario Médico'
        verbose_name_plural = 'Horarios Médicos'

    def __str__(self):
        return f"{self.medico.usuario.nombre_completo} ({self.dia} {self.hora_inicio}-{self.hora_fin})"
