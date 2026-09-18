from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import SesionChat, MensajeChat
from .serializers import (
    ChatMessageSerializer,
    ChatResponseSerializer,
    SesionChatResponseSerializer,
    MensajeChatResponseSerializer,
)
from .services.llm_orchestrator import LLMOrchestrator


class EnviarMensajeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChatMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Mensaje inválido", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        mensaje = data['mensaje']
        sesion_id = data.get('sesion_id')

        if sesion_id:
            try:
                sesion = SesionChat.objects.get(id=sesion_id, usuario=request.user)
            except SesionChat.DoesNotExist:
                return Response({"detail": "Sesión de chat no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        else:
            sesion = SesionChat.objects.create(
                usuario=request.user,
                rol_origen=request.user.rol,
            )

        # Save user message
        MensajeChat.objects.create(
            sesion=sesion,
            emisor="usuario",
            contenido=mensaje,
        )

        # Call orchestrator
        orchestrator = LLMOrchestrator()
        respuesta = orchestrator.chat(
            mensaje=mensaje,
            sesion_id=sesion.id,
            usuario=request.user,
        )

        # Save assistant message
        MensajeChat.objects.create(
            sesion=sesion,
            emisor="asistente",
            contenido=respuesta,
        )

        return Response({
            "respuesta": respuesta,
            "sesion_id": sesion.id,
            "emisor": "asistente",
        })


class ListarSesionesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sesiones = SesionChat.objects.filter(usuario=request.user).prefetch_related('mensajes').order_by('-creado_en')
        return Response(SesionChatResponseSerializer(sesiones, many=True).data)


class MensajesSesionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, sesion_id):
        try:
            sesion = SesionChat.objects.get(id=sesion_id, usuario=request.user)
        except SesionChat.DoesNotExist:
            return Response({"detail": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        mensajes = MensajeChat.objects.filter(sesion=sesion).order_by('creado_en')
        return Response(MensajeChatResponseSerializer(mensajes, many=True).data)

    def delete(self, request, sesion_id):
        try:
            sesion = SesionChat.objects.get(id=sesion_id, usuario=request.user)
        except SesionChat.DoesNotExist:
            return Response({"detail": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        sesion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
