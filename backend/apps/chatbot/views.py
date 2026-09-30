from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse
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

    @extend_schema(
        tags=['Chatbot LLM'],
        summary='Enviar mensaje al Copiloto Clínico IA',
        description=(
            'Envía un mensaje a la sesión de chat con el orquestador Groq. '
            'Gestiona el flujo de agendamiento clínico determinista, consultas de disponibilidad, cancelaciones y PQR. '
            'La respuesta incluye campos de interfaz estructurados:\n'
            '- `requiere_seleccion`: "ninguna" (texto informativo o confirmación), "dia" (renderizar calendario de días), "hora" (renderizar botones de horarios).\n'
            '- `dias_disponibles`: lista de fechas activas YYYY-MM-DD cuando requiere_seleccion="dia".\n'
            '- `horarios`: lista de slots disponibles en formato 12h cuando requiere_seleccion="hora".\n'
            '- `actualizo_citas`: booleano que notifica al frontend si debe refrescar sus widgets de citas.\n'
            'Roles permitidos: paciente, medico, admin, agente_atencion.'
        ),
        request=ChatMessageSerializer,
        responses={
            200: ChatResponseSerializer,
            400: OpenApiResponse(description='Mensaje vacío o formato de petición inválido.'),
            401: OpenApiResponse(description='Usuario no autenticado (requiere JWT).'),
            404: OpenApiResponse(description='Sesión de chat no encontrada.'),
        }
    )
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

    @extend_schema(
        tags=['Chatbot LLM'],
        summary='Listar sesiones de chat del usuario',
        description='Retorna la lista de sesiones de conversación del usuario autenticado, con el extracto del último mensaje y título automático.',
        responses={
            200: SesionChatResponseSerializer(many=True),
            401: OpenApiResponse(description='Usuario no autenticado.'),
        }
    )
    def get(self, request):
        sesiones = SesionChat.objects.filter(usuario=request.user).prefetch_related('mensajes').order_by('-creado_en')
        return Response(SesionChatResponseSerializer(sesiones, many=True).data)


class MensajesSesionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Chatbot LLM'],
        summary='Obtener mensajes de una sesión de chat',
        description='Recupera todos los mensajes (usuario y asistente) de una sesión determinada, conservando los metadatos de UI estructurados.',
        responses={
            200: MensajeChatResponseSerializer(many=True),
            401: OpenApiResponse(description='No autenticado.'),
            404: OpenApiResponse(description='Sesión no encontrada o no pertenece al usuario autenticado.'),
        }
    )
    def get(self, request, sesion_id):
        try:
            sesion = SesionChat.objects.get(id=sesion_id, usuario=request.user)
        except SesionChat.DoesNotExist:
            return Response({"detail": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        mensajes = MensajeChat.objects.filter(sesion=sesion).order_by('creado_en')
        return Response(MensajeChatResponseSerializer(mensajes, many=True).data)

    @extend_schema(
        tags=['Chatbot LLM'],
        summary='Eliminar una sesión de chat',
        description='Elimina permanentemente una sesión de conversación y sus mensajes asociados.',
        responses={
            204: OpenApiResponse(description='Sesión eliminada correctamente.'),
            401: OpenApiResponse(description='No autenticado.'),
            404: OpenApiResponse(description='Sesión no encontrada.'),
        }
    )
    def delete(self, request, sesion_id):
        try:
            sesion = SesionChat.objects.get(id=sesion_id, usuario=request.user)
        except SesionChat.DoesNotExist:
            return Response({"detail": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        sesion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
