import uuid
from django.db import models
from django.utils import timezone


class Pago(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cita = models.OneToOneField(
        'citas.Cita',
        on_delete=models.CASCADE,
        related_name='pago',
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=5, default='COP')
    referencia = models.CharField(max_length=100, unique=True)
    metodo_pago = models.CharField(max_length=50, default='sandbox')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    actualizado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f"Pago {self.referencia} - {self.monto} {self.moneda} ({self.estado})"
