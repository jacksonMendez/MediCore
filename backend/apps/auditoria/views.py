from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
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
