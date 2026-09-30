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
        result = orchestrator.chat(
            mensaje=mensaje,
            sesion_id=sesion.id,
            usuario=request.user,
        )

        if isinstance(result, dict):
            respuesta = result.get("respuesta", "")
            actualizo_citas = result.get("actualizo_citas", False)
            herramientas_usadas = result.get("herramientas_usadas", [])
            requiere_seleccion = result.get("requiere_seleccion", "ninguna")
            dias_disponibles = result.get("dias_disponibles", [])
            horarios = result.get("horarios", [])
            especialidad = result.get("especialidad", None)
        else:
            respuesta = str(result)
            actualizo_citas = False
            herramientas_usadas = []
            requiere_seleccion = "ninguna"
            dias_disponibles = []
            horarios = []
            especialidad = None

        # Save assistant message with structured UI metadata
        MensajeChat.objects.create(
            sesion=sesion,
            emisor="asistente",
            contenido=respuesta,
            requiere_seleccion=requiere_seleccion,
            metadata_ui={
                "dias_disponibles": dias_disponibles,
                "horarios": horarios,
                "especialidad": especialidad,
            }
        )

        # Update session resolution metric
        if "solicitar_pqr_reembolso" in herramientas_usadas or any(k in mensaje.lower() for k in ["hablar con humano", "asesor humano", "persona real", "agente humano"]):
            sesion.resolucion_tipo = "escalada_humano"
            sesion.save(update_fields=["resolucion_tipo"])
        elif any(k in herramientas_usadas for k in ["agendar_cita", "cancelar_cita", "consultar_disponibilidad", "consultar_mis_citas"]):
            if sesion.resolucion_tipo != "escalada_humano":
                sesion.resolucion_tipo = "resuelta_ia"
                sesion.save(update_fields=["resolucion_tipo"])

        return Response({
            "respuesta": respuesta,
            "sesion_id": sesion.id,
            "emisor": "asistente",
            "actualizo_citas": actualizo_citas,
            "herramientas_usadas": herramientas_usadas,
            "requiere_seleccion": requiere_seleccion,
            "dias_disponibles": dias_disponibles,
            "horarios": horarios,
            "especialidad": especialidad,
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
