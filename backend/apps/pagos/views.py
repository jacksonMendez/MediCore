import uuid
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.citas.models import Cita
from .models import Pago
from .serializers import (
    PagoSimularSerializer,
    PagoResponseSerializer,
    WebhookPagoSerializer,
)


class SimularPagoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PagoSimularSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        cita_id = serializer.validated_data['cita_id']
        metodo_pago = serializer.validated_data.get('metodo_pago', 'sandbox')

        try:
            cita = Cita.objects.select_related('medico__especialidad').get(id=cita_id)
        except Cita.DoesNotExist:
            return Response({"detail": "Cita no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        if cita.estado != "pendiente_pago":
            return Response(
                {"detail": f"La cita no está en estado pendiente_pago. Estado actual: {cita.estado}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Pago.objects.filter(cita=cita).exists():
            return Response({"detail": "Ya existe un pago para esta cita"}, status=status.HTTP_409_CONFLICT)

        referencia = f"SANDBOX-{uuid.uuid4().hex[:12].upper()}"
        monto = cita.medico.especialidad.precio_base

        pago = Pago.objects.create(
            cita=cita,
            monto=monto,
            moneda="COP",
            referencia=referencia,
            metodo_pago=metodo_pago,
            estado="pendiente",
        )

        return Response(PagoResponseSerializer(pago).data, status=status.HTTP_201_CREATED)


class WebhookPagoView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = WebhookPagoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de webhook inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        referencia = serializer.validated_data['referencia']
        nuevo_estado = serializer.validated_data['estado']

        try:
            pago = Pago.objects.select_related('cita').get(referencia=referencia)
        except Pago.DoesNotExist:
            return Response({"detail": "Pago no encontrado con esa referencia"}, status=status.HTTP_404_NOT_FOUND)

        pago.estado = nuevo_estado
        pago.actualizado_en = timezone.now()
        pago.save(update_fields=['estado', 'actualizado_en'])

        cita = pago.cita
        if nuevo_estado == 'aprobado':
            cita.estado = 'confirmada'
        elif nuevo_estado == 'rechazado':
            cita.estado = 'cancelada'
        cita.save(update_fields=['estado'])

        return Response(PagoResponseSerializer(pago).data)


class DetallePagoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cita_id):
        try:
            pago = Pago.objects.get(cita_id=cita_id)
        except Pago.DoesNotExist:
            return Response({"detail": "No se encontró pago para esta cita"}, status=status.HTTP_404_NOT_FOUND)

        return Response(PagoResponseSerializer(pago).data)
