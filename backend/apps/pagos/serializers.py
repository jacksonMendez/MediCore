from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Pago

class PagoSimularSerializer(serializers.Serializer):
    cita_id = serializers.UUIDField()
    metodo_pago = serializers.CharField(default='sandbox', required=False)


class PagoResponseSerializer(serializers.ModelSerializer):
    cita_id = serializers.UUIDField(source='cita.id')
    monto = serializers.FloatField()
    concepto = serializers.SerializerMethodField()
    fecha = serializers.DateTimeField(source='actualizado_en', read_only=True)
    metodo_pago = serializers.SlugRelatedField(read_only=True, slug_field='codigo')
    estado = serializers.SlugRelatedField(read_only=True, slug_field='codigo')

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
            'concepto',
            'fecha',
            'actualizado_en',
        ]

    @extend_schema_field(serializers.CharField())
    def get_concepto(self, obj):
        try:
            return f"{obj.cita.medico.especialidad.nombre} - {obj.cita.medico.usuario.nombre_completo}"
        except Exception:
            return "Consulta médica MediCore"



class WebhookPagoSerializer(serializers.Serializer):
    referencia = serializers.CharField()
    estado = serializers.ChoiceField(choices=['aprobado', 'rechazado'])
