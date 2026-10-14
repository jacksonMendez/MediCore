from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Cita, ConsultaNota, PQRSolicitud

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
    precio = serializers.SerializerMethodField()
    tiene_comprobante = serializers.SerializerMethodField()
    pago_referencia = serializers.SerializerMethodField()
    nota_clinica = serializers.SerializerMethodField()

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
            'precio',
            'tiene_comprobante',
            'pago_referencia',
            'nota_clinica',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_pago_estado(self, obj):
        try:
            return str(obj.pago.estado_id) if hasattr(obj, 'pago') and obj.pago else None
        except Exception:
            return None

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_precio(self, obj):
        try:
            if hasattr(obj, 'pago') and obj.pago and obj.pago.monto:
                return float(obj.pago.monto)
            if obj.medico and obj.medico.especialidad and obj.medico.especialidad.precio_base:
                return float(obj.medico.especialidad.precio_base)
            return 50000.0
        except Exception:
            return 50000.0

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_pago_monto(self, obj):
        return self.get_precio(obj)

    @extend_schema_field(serializers.BooleanField())
    def get_tiene_comprobante(self, obj):
        try:
            if hasattr(obj, 'pago') and obj.pago:
                has_file = bool(obj.pago.comprobante_archivo)
                is_manual_ref = bool(obj.pago.referencia and not str(obj.pago.referencia).startswith('MED-'))
                return has_file or is_manual_ref or str(obj.pago.estado_id) == 'pendiente'
            return False
        except Exception:
            return False

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_pago_referencia(self, obj):
        try:
            return str(obj.pago.referencia) if hasattr(obj, 'pago') and obj.pago and obj.pago.referencia else None
        except Exception:
            return None

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_nota_clinica(self, obj):
        try:
            if hasattr(obj, 'notas') and obj.notas:
                return {
                    'id': str(obj.notas.id),
                    'diagnostico': obj.notas.diagnostico or '',
                    'tratamiento': obj.notas.tratamiento or '',
                    'receta_medica': obj.notas.receta_medica or '',
                    'archivo_adjunto': obj.notas.archivo_adjunto or None,
                    'archivo_nombre': obj.notas.archivo_nombre or None,
                    'archivo_tipo': obj.notas.archivo_tipo or None,
                    'creado_en': obj.notas.creado_en.isoformat() if obj.notas.creado_en else None,
                }
        except Exception:
            pass
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


class NotaCreateSerializer(serializers.Serializer):
    diagnostico = serializers.CharField(required=True)
    tratamiento = serializers.CharField(required=False, allow_blank=True, default='')
    receta_medica = serializers.CharField(required=False, allow_blank=True, default='')
    archivo_adjunto = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    archivo_nombre = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    archivo_tipo = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')


class NotaResponseSerializer(serializers.ModelSerializer):
    cita_id = serializers.UUIDField(source='cita.id')

    class Meta:
        model = ConsultaNota
        fields = [
            'id',
            'cita_id',
            'diagnostico',
            'tratamiento',
            'receta_medica',
            'archivo_adjunto',
            'archivo_nombre',
            'archivo_tipo',
            'creado_en',
        ]


class PQRCreateSerializer(serializers.Serializer):
    cita_id = serializers.UUIDField(help_text='UUID de la cita médica objeto del reclamo')
    tipo = serializers.CharField(required=False, default='reembolso', help_text='Tipo de PQR (reembolso, peticion, queja, reclamo)')
    motivo = serializers.CharField(required=True, help_text='Motivo o justificación detallada de la solicitud')


class PQRSolicitudResponseSerializer(serializers.ModelSerializer):
    paciente_id = serializers.UUIDField(source='paciente.id')
    cita_id = serializers.UUIDField(source='cita.id')
    paciente_nombre = serializers.CharField(source='paciente.usuario.nombre_completo', read_only=True)
    tipo = serializers.SlugRelatedField(read_only=True, slug_field='codigo')
    estado = serializers.SlugRelatedField(read_only=True, slug_field='codigo')

    class Meta:
        model = PQRSolicitud
        fields = [
            'id',
            'cita_id',
            'paciente_id',
            'paciente_nombre',
            'tipo',
            'motivo',
            'estado',
            'creado_en',
        ]
