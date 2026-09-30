from rest_framework import serializers
from .models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    usuario_correo = serializers.CharField(source='usuario.correo', read_only=True)

    class Meta:
        model = RegistroAuditoria
        fields = [
            'id',
            'usuario_id',
            'usuario_nombre',
            'usuario_correo',
            'rol_en_el_momento',
            'accion',
            'entidad_tipo',
            'entidad_id',
            'timestamp',
            'datos_cambio',
            'origen',
            'ip',
            'session_id',
        ]
        read_only_fields = fields
