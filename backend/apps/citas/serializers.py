from rest_framework import serializers
from .models import Cita, ConsultaNota

class CitaCreateSerializer(serializers.Serializer):
    medico_id = serializers.UUIDField()
    fecha_hora = serializers.DateTimeField()
    motivo = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CitaResponseSerializer(serializers.ModelSerializer):
    paciente_id = serializers.UUIDField(source='paciente.id')
    medico_id = serializers.UUIDField(source='medico.id')
    sede_id = serializers.UUIDField(source='sede.id')
    paciente_nombre = serializers.CharField(source='paciente.usuario.nombre_completo', read_only=True)
    medico_nombre = serializers.CharField(source='medico.usuario.nombre_completo', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    especialidad_nombre = serializers.CharField(source='medico.especialidad.nombre', read_only=True)
    estado = serializers.SlugRelatedField(read_only=True, slug_field='codigo')
    pago_estado = serializers.SerializerMethodField()
    pago_monto = serializers.SerializerMethodField()

    class Meta:
        model = Cita
        fields = [
            'id',
            'paciente_id',
            'medico_id',
            'sede_id',
            'fecha_hora',
            'duracion_minutos',
            'estado',
            'motivo',
            'creado_en',
            'paciente_nombre',
            'medico_nombre',
            'sede_nombre',
            'especialidad_nombre',
            'pago_estado',
            'pago_monto',
        ]

    def get_pago_estado(self, obj):
        try:
            return obj.pago.estado_id if hasattr(obj, 'pago') and obj.pago else None
        except Exception:
            return None

    def get_pago_monto(self, obj):
        try:
            return float(obj.pago.monto) if hasattr(obj, 'pago') and obj.pago else None
        except Exception:
            return None


class SlotDisponibleSerializer(serializers.Serializer):
    medico_id = serializers.UUIDField()
    medico_nombre = serializers.CharField()
    especialidad = serializers.CharField()
    sede = serializers.CharField()
    fecha = serializers.DateField()
    hora_inicio = serializers.TimeField()
    hora_fin = serializers.TimeField()
    duracion_minutos = serializers.IntegerField()
    precio = serializers.FloatField()


class DisponibilidadResponseSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    especialidad = serializers.CharField()
    slots = SlotDisponibleSerializer(many=True)
    total_slots = serializers.IntegerField()


class NotaResponseSerializer(serializers.ModelSerializer):
    cita_id = serializers.UUIDField(source='cita.id')

    class Meta:
        model = ConsultaNota
        fields = ['id', 'cita_id', 'diagnostico', 'tratamiento', 'receta_medica', 'creado_en']
