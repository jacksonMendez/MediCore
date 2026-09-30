from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from apps.authentication.authentication import require_role
from .models import RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer


class AuditoriaPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ListarAuditoriaView(APIView):
    """
    Endpoint de solo lectura para auditar eventos clínicos y del sistema.
    Acceso estrictamente reservado a administradores.
    """
    permission_classes = [require_role(['admin'])]

    @extend_schema(
        tags=['Auditoría'],
        summary='Consultar registro inmutable de auditoría clínica y de sistema',
        description=(
            'Consulta paginada de eventos históricos inmutables registrados automáticamente en el servidor. '
            'Cubre acciones humanas (paciente, médico, admin, agente) y autónomas del asistente IA (`origen="bot_llm"`). '
            'Permite filtrar por `usuario_id`, `accion`, `origen`, `entidad_tipo`, `fecha_inicio` y `fecha_fin`. '
            'Acceso estrictamente reservado al rol `admin`.'
        ),
        parameters=[
            OpenApiParameter('usuario_id', str, description='Filtrar por UUID de usuario', required=False),
            OpenApiParameter('accion', str, description='Filtrar por código de acción (cita_creada, cita_cancelada, login_exitoso, etc.)', required=False),
            OpenApiParameter('origen', str, description='Filtrar por origen (bot_llm, humano_paciente, humano_medico, humano_admin, sistema)', required=False),
            OpenApiParameter('entidad_tipo', str, description='Filtrar por tipo de recurso (Cita, Pago, Usuario, PQRSolicitud)', required=False),
            OpenApiParameter('fecha_inicio', str, description='Timestamp ISO inicial (ej: 2026-09-01T00:00:00Z)', required=False),
            OpenApiParameter('fecha_fin', str, description='Timestamp ISO final (ej: 2026-09-30T23:59:59Z)', required=False),
            OpenApiParameter('page', int, description='Número de página', required=False),
            OpenApiParameter('page_size', int, description='Tamaño de página (default 20, max 100)', required=False),
        ],
        responses={
            200: RegistroAuditoriaSerializer(many=True),
            401: OpenApiResponse(description='No autenticado.'),
            403: OpenApiResponse(description='Acceso denegado: solo administradores pueden auditar.'),
        }
    )
    def get(self, request):
        queryset = RegistroAuditoria.objects.select_related('usuario').all()

        # Filtros
        usuario_id = request.query_params.get('usuario_id')
        accion = request.query_params.get('accion')
        origen = request.query_params.get('origen')
        entidad_tipo = request.query_params.get('entidad_tipo')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        if accion:
            queryset = queryset.filter(accion=accion)
        if origen:
            queryset = queryset.filter(origen=origen)
        if entidad_tipo:
            queryset = queryset.filter(entidad_tipo=entidad_tipo)
        if fecha_inicio:
            queryset = queryset.filter(timestamp__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(timestamp__lte=fecha_fin)

        paginator = AuditoriaPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = RegistroAuditoriaSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
