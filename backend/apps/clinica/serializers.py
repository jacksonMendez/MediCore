from rest_framework import serializers
from .models import Sede, Especialidad, Medico, HorarioMedico

class SedeResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'direccion', 'telefono', 'activa']


class SedeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['nombre', 'direccion', 'telefono', 'activa']


class EspecialidadResponseSerializer(serializers.ModelSerializer):
    precio_base = serializers.FloatField()

    class Meta:
        model = Especialidad
        fields = ['id', 'nombre', 'descripcion', 'precio_base']


class EspecialidadCreateSerializer(serializers.ModelSerializer):
    precio_base = serializers.FloatField(default=0.0)

    class Meta:
        model = Especialidad
        fields = ['nombre', 'descripcion', 'precio_base']


class HorarioResponseSerializer(serializers.ModelSerializer):
    medico_id = serializers.UUIDField(source='medico.id')

    class Meta:
        model = HorarioMedico
        fields = ['id', 'medico_id', 'dia', 'hora_inicio', 'hora_fin']


class HorarioCreateSerializer(serializers.ModelSerializer):
    medico_id = serializers.UUIDField()

    class Meta:
        model = HorarioMedico
        fields = ['medico_id', 'dia', 'hora_inicio', 'hora_fin']


class MedicoResponseSerializer(serializers.ModelSerializer):
    usuario_id = serializers.UUIDField(source='usuario.id')
    especialidad_id = serializers.UUIDField(source='especialidad.id')
    sede_id = serializers.UUIDField(source='sede.id')
    nombre_completo = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    correo = serializers.CharField(source='usuario.correo', read_only=True)
    especialidad_nombre = serializers.CharField(source='especialidad.nombre', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)

    class Meta:
        model = Medico
        fields = [
            'id',
            'usuario_id',
            'especialidad_id',
            'sede_id',
            'tarjeta_profesional',
            'duracion_cita_minutos',
            'genero',
            'activo',
            'nombre_completo',
            'correo',
            'especialidad_nombre',
            'sede_nombre',
        ]


class MedicoCreateSerializer(serializers.Serializer):
    usuario_id = serializers.UUIDField(required=False, allow_null=True)
    nombre_completo = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    correo = serializers.EmailField(required=False, allow_null=True)
    password = serializers.CharField(required=False, allow_null=True, write_only=True)
    telefono = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    especialidad_id = serializers.UUIDField()
    sede_id = serializers.UUIDField()
    tarjeta_profesional = serializers.CharField()
    duracion_cita_minutos = serializers.IntegerField(default=30)
    genero = serializers.CharField(default='M', required=False)
