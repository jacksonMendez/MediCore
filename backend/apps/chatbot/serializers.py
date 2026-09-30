from rest_framework import serializers
from .models import SesionChat, MensajeChat

class ChatMessageSerializer(serializers.Serializer):
    mensaje = serializers.CharField(min_length=1, max_length=2000)
    sesion_id = serializers.UUIDField(required=False, allow_null=True)


class ChatResponseSerializer(serializers.Serializer):
    respuesta = serializers.CharField()
    sesion_id = serializers.UUIDField()
    emisor = serializers.CharField(default='asistente')
    actualizo_citas = serializers.BooleanField(default=False)
    herramientas_usadas = serializers.ListField(child=serializers.CharField(), default=list)
    requiere_seleccion = serializers.ChoiceField(choices=['ninguna', 'dia', 'hora'], default='ninguna')
    dias_disponibles = serializers.ListField(child=serializers.CharField(), default=list)
    horarios = serializers.ListField(child=serializers.CharField(), default=list)
    especialidad = serializers.CharField(required=False, allow_null=True)


class MensajeChatResponseSerializer(serializers.ModelSerializer):
    sesion_id = serializers.UUIDField(source='sesion.id')
    dias_disponibles = serializers.SerializerMethodField()
    horarios = serializers.SerializerMethodField()
    especialidad = serializers.SerializerMethodField()

    class Meta:
        model = MensajeChat
        fields = [
            'id', 'sesion_id', 'emisor', 'contenido',
            'requiere_seleccion', 'dias_disponibles', 'horarios', 'especialidad',
            'creado_en'
        ]

    def get_dias_disponibles(self, obj):
        return obj.metadata_ui.get('dias_disponibles', []) if obj.metadata_ui else []

    def get_horarios(self, obj):
        return obj.metadata_ui.get('horarios', []) if obj.metadata_ui else []

    def get_especialidad(self, obj):
        return obj.metadata_ui.get('especialidad', None) if obj.metadata_ui else None


class SesionChatResponseSerializer(serializers.ModelSerializer):
    usuario_id = serializers.UUIDField(source='usuario.id')
    ultimo_mensaje = serializers.SerializerMethodField()
    titulo = serializers.SerializerMethodField()

    class Meta:
        model = SesionChat
        fields = ['id', 'usuario_id', 'rol_origen', 'resolucion_tipo', 'creado_en', 'ultimo_mensaje', 'titulo']

    def get_ultimo_mensaje(self, obj):
        ultimo = obj.mensajes.order_by('-creado_en').first()
        if ultimo and ultimo.contenido:
            return ultimo.contenido[:100]
        return None

    def get_titulo(self, obj):
        primero = obj.mensajes.filter(emisor='usuario').order_by('creado_en').first()
        if primero and primero.contenido:
            clean = primero.contenido.strip()
            return clean[:35] + ("..." if len(clean) > 35 else "")
        return "Nueva consulta"
