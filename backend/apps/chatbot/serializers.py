from rest_framework import serializers
from .models import SesionChat, MensajeChat

class ChatMessageSerializer(serializers.Serializer):
    mensaje = serializers.CharField(min_length=1, max_length=2000)
    sesion_id = serializers.UUIDField(required=False, allow_null=True)


class ChatResponseSerializer(serializers.Serializer):
    respuesta = serializers.CharField()
    sesion_id = serializers.UUIDField()
    emisor = serializers.CharField(default='asistente')


class MensajeChatResponseSerializer(serializers.ModelSerializer):
    sesion_id = serializers.UUIDField(source='sesion.id')

    class Meta:
        model = MensajeChat
        fields = ['id', 'sesion_id', 'emisor', 'contenido', 'creado_en']


class SesionChatResponseSerializer(serializers.ModelSerializer):
    usuario_id = serializers.UUIDField(source='usuario.id')
    ultimo_mensaje = serializers.SerializerMethodField()
    titulo = serializers.SerializerMethodField()

    class Meta:
        model = SesionChat
        fields = ['id', 'usuario_id', 'rol_origen', 'creado_en', 'ultimo_mensaje', 'titulo']

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
