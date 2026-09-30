import uuid
from django.db import models
from django.utils import timezone


class MetodoPago(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'metodos_pago'
        verbose_name = 'Método de Pago'
        verbose_name_plural = 'Métodos de Pago'

    def __str__(self):
        return self.nombre


class EstadoPago(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'estados_pago'
        verbose_name = 'Estado de Pago'
        verbose_name_plural = 'Estados de Pago'

    def __str__(self):
        return self.nombre


class Pago(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('completado', 'Completado'),
        ('rechazado', 'Rechazado'),
        ('reembolsado', 'Reembolsado'),
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
    metodo_pago = models.ForeignKey(
        MetodoPago,
        on_delete=models.PROTECT,
        db_column='metodo_pago',
        default='sandbox',
        related_name='pagos',
    )
    estado = models.ForeignKey(
        EstadoPago,
        on_delete=models.PROTECT,
        db_column='estado',
        default='pendiente',
        related_name='pagos',
    )
    actualizado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        indexes = [
            models.Index(fields=['estado', 'cita'], name='idx_pagos_estado_cita'),
            models.Index(fields=['referencia'], name='idx_pagos_referencia'),
        ]

    def __str__(self):
        return f"Pago {self.referencia} - {self.monto} {self.moneda} ({self.estado_id})"
