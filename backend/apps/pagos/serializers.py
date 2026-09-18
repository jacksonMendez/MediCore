from rest_framework import serializers
from .models import Pago

class PagoSimularSerializer(serializers.Serializer):
    cita_id = serializers.UUIDField()
    metodo_pago = serializers.CharField(default='sandbox', required=False)


class PagoResponseSerializer(serializers.ModelSerializer):
    cita_id = serializers.UUIDField(source='cita.id')
    monto = serializers.FloatField()

    class Meta:
        model = Pago
        fields = [
            'id',
            'cita_id',
            'monto',
            'moneda',
            'referencia',
            'metodo_pago',
            'estado',
            'actualizado_en',
        ]


class WebhookPagoSerializer(serializers.Serializer):
    referencia = serializers.CharField()
    estado = serializers.ChoiceField(choices=['aprobado', 'rechazado'])
