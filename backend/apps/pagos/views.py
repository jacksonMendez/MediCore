import uuid
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.citas.models import Cita
from apps.auditoria.services import registrar_auditoria
from .models import Pago
from .serializers import (
    PagoSimularSerializer,
    PagoResponseSerializer,
    WebhookPagoSerializer,
)


class SimularPagoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Pagos'],
        summary='Simular intento de pago de una cita',
        description='Genera una referencia sandbox y registra el pago en estado pendiente para una cita médica. Roles: paciente (dueño de la cita), admin.',
        request=PagoSimularSerializer,
        responses={
            201: PagoResponseSerializer,
            400: OpenApiResponse(description='Datos inválidos o la cita no está pendiente de pago.'),
            403: OpenApiResponse(description='No autorizado para pagar citas de otro paciente.'),
            404: OpenApiResponse(description='Cita no encontrada.'),
            409: OpenApiResponse(description='Ya existe un pago registrado para esta cita.'),
        }
    )
    def post(self, request):
        serializer = PagoSimularSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        cita_id = serializer.validated_data['cita_id']
        metodo_pago = serializer.validated_data.get('metodo_pago', 'transferencia')
        banco_origen = serializer.validated_data.get('banco_origen', '') or request.data.get('banco_origen', '')
        comprobante_archivo = serializer.validated_data.get('comprobante_archivo', '') or request.data.get('comprobante_archivo', '')

        try:
            cita = Cita.objects.select_related('medico__especialidad', 'paciente').get(id=cita_id)
        except Cita.DoesNotExist:
            return Response({"detail": "Cita no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        u_rol = getattr(request.user, 'rol_id', None) or str(request.user.rol)
        if u_rol == 'paciente' and cita.paciente.usuario_id != request.user.id:
            return Response({"detail": "No puedes gestionar el pago de citas de otro paciente."}, status=status.HTTP_403_FORBIDDEN)

        if str(cita.estado_id) != "pendiente_pago":
            return Response(
                {"detail": f"La cita no está en estado pendiente_pago. Estado actual: {cita.estado_id}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pago_existente = Pago.objects.filter(cita=cita).first()
        if pago_existente:
            if str(pago_existente.estado_id) in ["aprobado", "completado"]:
                return Response({"detail": "La cita ya se encuentra pagada y confirmada."}, status=status.HTTP_400_BAD_REQUEST)
            if request.data.get('referencia'):
                pago_existente.referencia = str(request.data.get('referencia')).strip()
            if metodo_pago:
                pago_existente.metodo_pago_id = metodo_pago
            if banco_origen:
                pago_existente.banco_origen = banco_origen
            if comprobante_archivo:
                pago_existente.comprobante_archivo = comprobante_archivo
            pago_existente.estado_id = 'pendiente'
            pago_existente.save(update_fields=['referencia', 'metodo_pago', 'banco_origen', 'comprobante_archivo', 'estado'])

            registrar_auditoria(
                accion='comprobante_pago_actualizado',
                entidad_tipo='Pago',
                entidad_id=str(pago_existente.id),
                usuario=request.user,
                datos_cambio={
                    'cita_id': str(cita.id),
                    'referencia': pago_existente.referencia,
                    'banco_origen': banco_origen,
                    'tiene_comprobante': bool(comprobante_archivo),
                }
            )
            return Response(PagoResponseSerializer(pago_existente).data, status=status.HTTP_200_OK)

        custom_ref = request.data.get('referencia')
        referencia = str(custom_ref).strip() if custom_ref else f"TRF-{uuid.uuid4().hex[:10].upper()}"
        monto = cita.medico.especialidad.precio_base

        pago = Pago.objects.create(
            cita=cita,
            monto=monto,
            moneda="COP",
            referencia=referencia,
            metodo_pago_id=metodo_pago,
            banco_origen=banco_origen,
            comprobante_archivo=comprobante_archivo,
            estado_id="pendiente",
        )

        registrar_auditoria(
            accion='comprobante_pago_radicado' if comprobante_archivo else 'pago_iniciado',
            entidad_tipo='Pago',
            entidad_id=str(pago.id),
            usuario=request.user,
            datos_cambio={
                'cita_id': str(cita.id),
                'monto': float(monto),
                'referencia': referencia,
                'metodo_pago': metodo_pago,
                'banco_origen': banco_origen,
                'tiene_comprobante': bool(comprobante_archivo),
            }
        )

        return Response(PagoResponseSerializer(pago).data, status=status.HTTP_201_CREATED)


class WebhookPagoView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Pagos'],
        summary='Webhook de notificación de pasarela de pagos',
        description='Recibe notificaciones automáticas de cambio de estado de pago (aprobado / rechazado). Actualiza la cita asociada (confirmada o cancelada) y genera auditoría inmutable con origen sistema. Acceso público.',
        request=WebhookPagoSerializer,
        responses={
            200: PagoResponseSerializer,
            400: OpenApiResponse(description='Payload de webhook inválido.'),
            404: OpenApiResponse(description='Referencia de pago no encontrada.'),
        }
    )
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

        pago.estado_id = nuevo_estado
        pago.actualizado_en = timezone.now()
        pago.save(update_fields=['estado', 'actualizado_en'])

        cita = pago.cita
        if nuevo_estado == 'aprobado':
            cita.estado_id = 'confirmada'
        elif nuevo_estado == 'rechazado':
            cita.estado_id = 'cancelada'
        cita.save(update_fields=['estado'])

        registrar_auditoria(
            accion='pago_confirmado' if nuevo_estado == 'aprobado' else 'pago_rechazado',
            entidad_tipo='Pago',
            entidad_id=str(pago.id),
            usuario=getattr(cita.paciente, 'usuario', None),
            origen='sistema',
            datos_cambio={
                'referencia': referencia,
                'nuevo_estado': nuevo_estado,
                'cita_estado': str(cita.estado_id),
            }
        )

        return Response(PagoResponseSerializer(pago).data)


class DetallePagoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Pagos'],
        summary='Consultar comprobante de pago por ID de cita',
        description='Retorna los datos de la transacción de pago asociada a una cita médica. Roles: paciente (propietario), admin.',
        responses={
            200: PagoResponseSerializer,
            403: OpenApiResponse(description='No autorizado para ver pagos de otros pacientes.'),
            404: OpenApiResponse(description='Pago no encontrado para la cita especificada.'),
        }
    )
    def get(self, request, cita_id):
        try:
            pago = Pago.objects.select_related('cita__paciente').get(cita_id=cita_id)
        except Pago.DoesNotExist:
            return Response({"detail": "No se encontró pago para esta cita"}, status=status.HTTP_404_NOT_FOUND)

        u_rol = getattr(request.user, 'rol_id', None) or str(request.user.rol)
        if u_rol == 'paciente' and pago.cita.paciente.usuario_id != request.user.id:
            return Response({"detail": "No tienes acceso al comprobante de pago de otro paciente."}, status=status.HTTP_403_FORBIDDEN)

        return Response(PagoResponseSerializer(pago).data)


class MisPagosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Pagos'],
        summary='Listar transacciones y pagos',
        description='Si el usuario es paciente, lista sus pagos y estados. Si es administrador o agente, retorna el consolidado de pagos del sistema. Roles: paciente, admin, agente_atencion.',
        responses={200: PagoResponseSerializer(many=True)}
    )
    def get(self, request):
        u_rol = getattr(request.user, 'rol_id', None) or str(request.user.rol)
        if u_rol == "paciente":
            from apps.clinica.models import Paciente
            paciente = Paciente.objects.filter(usuario=request.user).first()
            if paciente:
                # Opción b: Auto-backfill for citas without Pago records
                citas_sin_pago = Cita.objects.filter(
                    paciente=paciente,
                    estado="pendiente_pago",
                    pago__isnull=True
                ).select_related('medico__especialidad')

                for c in citas_sin_pago:
                    precio = c.medico.especialidad.precio_base if (c.medico and c.medico.especialidad) else 50000.00
                    Pago.objects.create(
                        cita=c,
                        monto=precio,
                        moneda="COP",
                        referencia=f"MED-{uuid.uuid4().hex[:10].upper()}",
                        metodo_pago_id="sandbox",
                        estado_id="pendiente"
                    )

                pagos = Pago.objects.filter(cita__paciente=paciente).select_related(
                    'cita__medico__usuario', 'cita__medico__especialidad'
                ).order_by('-actualizado_en')
            else:
                pagos = Pago.objects.none()
        elif u_rol in ["admin", "agente_atencion", "recepcionista"]:
            # Backfill any system-wide citas in pendiente_pago without pago
            citas_sin_pago = Cita.objects.filter(
                estado="pendiente_pago",
                pago__isnull=True
            ).select_related('medico__especialidad')
            for c in citas_sin_pago:
                precio = c.medico.especialidad.precio_base if (c.medico and c.medico.especialidad) else 50000.00
                Pago.objects.create(
                    cita=c,
                    monto=precio,
                    moneda="COP",
                    referencia=f"MED-{uuid.uuid4().hex[:10].upper()}",
                    metodo_pago_id="sandbox",
                    estado_id="pendiente"
                )

            pagos = Pago.objects.all().select_related(
                'cita__medico__usuario', 'cita__medico__especialidad'
            ).order_by('-actualizado_en')
        else:
            pagos = Pago.objects.none()

        return Response(PagoResponseSerializer(pagos, many=True).data)

