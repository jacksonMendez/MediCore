from datetime import date, datetime, time, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, serializers
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer
from apps.authentication.authentication import require_role
from apps.auditoria.services import registrar_auditoria
from apps.clinica.models import Medico, Paciente
from .models import Cita
from .services import get_disponibilidad, get_dias_disponibles
from .serializers import (
    CitaCreateSerializer,
    CitaResponseSerializer,
    DisponibilidadResponseSerializer,
)



class DiasDisponiblesView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Citas'],
        summary='Consultar días con disponibilidad médica',
        description='Retorna las fechas dentro de un rango que cuentan con turnos disponibles para una especialidad médica. Acceso público.',
        parameters=[
            OpenApiParameter('fecha_inicio', str, description='Fecha inicial YYYY-MM-DD (por defecto hoy)', required=False),
            OpenApiParameter('fecha_fin', str, description='Fecha final YYYY-MM-DD (por defecto +30 días)', required=False),
            OpenApiParameter('especialidad_id', str, description='UUID de la especialidad', required=False),
            OpenApiParameter('especialidad_nombre', str, description='Nombre de la especialidad (ej: Medicina General)', required=False),
            OpenApiParameter('genero', str, description="Filtro opcional de género del médico: 'M' (hombre) o 'F' (mujer)", required=False),
        ],
        responses={200: OpenApiResponse(description='Fechas y días disponibles encontrados.')}
    )
    def get(self, request):
        from django.utils import timezone
        hoy = timezone.localdate()

        fecha_inicio_str = request.query_params.get('fecha_inicio')
        if fecha_inicio_str:
            try:
                fecha_inicio = date.fromisoformat(fecha_inicio_str)
            except ValueError:
                return Response({"detail": "Formato de fecha_inicio inválido (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            fecha_inicio = hoy

        fecha_fin_str = request.query_params.get('fecha_fin')
        if fecha_fin_str:
            try:
                fecha_fin = date.fromisoformat(fecha_fin_str)
            except ValueError:
                return Response({"detail": "Formato de fecha_fin inválido (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            fecha_fin = fecha_inicio + timedelta(days=30)

        especialidad_id = request.query_params.get('especialidad_id')
        especialidad_nombre = request.query_params.get('especialidad_nombre')
        genero = request.query_params.get('genero')

        if not especialidad_id and not especialidad_nombre:
            return Response({"detail": "Debe proporcionar especialidad_nombre o especialidad_id"}, status=status.HTTP_400_BAD_REQUEST)

        data, err = get_dias_disponibles(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            especialidad_id=especialidad_id,
            especialidad_nombre=especialidad_nombre,
            genero=genero,
        )
        if err:
            status_code = status.HTTP_404_NOT_FOUND if "no encontrada" in err else status.HTTP_400_BAD_REQUEST
            return Response({"detail": err}, status=status_code)

        return Response(data)



class DisponibilidadView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Citas'],
        summary='Consultar horarios y cupos libres para una fecha',
        description='Retorna los turnos de atención y médicos disponibles para una especialidad en una fecha específica (YYYY-MM-DD). Acceso público.',
        parameters=[
            OpenApiParameter('fecha', str, description='Fecha de consulta YYYY-MM-DD', required=True),
            OpenApiParameter('especialidad_id', str, description='UUID de la especialidad', required=False),
            OpenApiParameter('especialidad_nombre', str, description='Nombre de la especialidad', required=False),
        ],
        responses={200: DisponibilidadResponseSerializer}
    )
    def get(self, request):
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response({"detail": "El parámetro 'fecha' es requerido (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = date.fromisoformat(fecha_str)
        except ValueError:
            return Response({"detail": "Formato de fecha inválido. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        especialidad_id = request.query_params.get('especialidad_id')
        especialidad_nombre = request.query_params.get('especialidad_nombre')

        if not especialidad_id and not especialidad_nombre:
            return Response({"detail": "Debe proporcionar especialidad_nombre o especialidad_id"}, status=status.HTTP_400_BAD_REQUEST)

        data, err = get_disponibilidad(
            fecha=fecha,
            especialidad_id=especialidad_id,
            especialidad_nombre=especialidad_nombre,
        )
        if err:
            status_code = status.HTTP_404_NOT_FOUND if "no encontrada" in err else status.HTTP_400_BAD_REQUEST
            return Response({"detail": err}, status=status_code)

        serializer = DisponibilidadResponseSerializer(data)
        return Response(serializer.data)


class CitaCreateView(APIView):
    permission_classes = [require_role(['paciente', 'admin', 'agente_atencion'])]

    @extend_schema(
        tags=['Citas'],
        summary='Agendar nueva cita médica',
        description='Crea una cita médica en estado pendiente_pago. Valida colisiones de horario y genera automáticamente la orden de cobro. Roles: paciente, admin, agente_atencion.',
        request=CitaCreateSerializer,
        responses={
            201: CitaResponseSerializer,
            400: OpenApiResponse(description='Datos inválidos o perfil de paciente inexistente.'),
            409: OpenApiResponse(description='Conflicto de horario: el médico o paciente ya tiene cita reservada.'),
        }
    )
    def post(self, request):
        serializer = CitaCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de cita inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        # Get patient profile for current user
        try:
            paciente = Paciente.objects.get(usuario=request.user)
        except Paciente.DoesNotExist:
            return Response({"detail": "No tiene perfil de paciente registrado"}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        medico_id = data['medico_id']
        fecha_hora = data['fecha_hora']

        try:
            medico = Medico.objects.select_related('usuario', 'especialidad', 'sede').get(id=medico_id)
        except Medico.DoesNotExist:
            return Response({"detail": "Médico no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Check for time conflict
        conflict = Cita.objects.filter(
            medico=medico,
            fecha_hora=fecha_hora,
            estado__in=["pendiente_pago", "confirmada"],
        ).exists()

        if conflict:
            return Response({"detail": "Este horario ya está reservado"}, status=status.HTTP_409_CONFLICT)

        cita = Cita.objects.create(
            paciente=paciente,
            medico=medico,
            sede=medico.sede,
            fecha_hora=fecha_hora,
            duracion_minutos=medico.duracion_cita_minutos,
            motivo=data.get('motivo'),
            estado="pendiente_pago",
        )

        import uuid
        from apps.pagos.models import Pago
        precio = medico.especialidad.precio_base if (medico and medico.especialidad) else 50000.00
        Pago.objects.get_or_create(
            cita=cita,
            defaults={
                'monto': precio,
                'moneda': 'COP',
                'referencia': f"MED-{uuid.uuid4().hex[:10].upper()}",
                'metodo_pago': 'sandbox',
                'estado': 'pendiente',
            }
        )

        registrar_auditoria(
            accion='cita_creada',
            entidad_tipo='Cita',
            entidad_id=str(cita.id),
            usuario=request.user,
            datos_cambio={
                'medico_id': str(medico.id),
                'fecha_hora': str(fecha_hora),
                'sede_id': str(medico.sede_id),
                'motivo': data.get('motivo'),
            }
        )

        return Response(CitaResponseSerializer(cita).data, status=status.HTTP_201_CREATED)


class MisCitasView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Citas'],
        summary='Consultar citas del usuario autenticado',
        description='Retorna el listado de citas del usuario. Si es paciente retorna sus citas clínicas; si es médico retorna las citas agendadas con él. Roles: paciente, medico.',
        responses={200: CitaResponseSerializer(many=True)}
    )
    def get(self, request):
        user = request.user
        if user.rol == 'paciente':
            try:
                paciente = Paciente.objects.get(usuario=user)
                citas = Cita.objects.filter(paciente=paciente).select_related(
                    'medico__usuario', 'medico__especialidad', 'sede', 'paciente__usuario', 'pago'
                ).order_by('-fecha_hora')
            except Paciente.DoesNotExist:
                return Response([])
        else:
            try:
                medico = Medico.objects.get(usuario=user)
                citas = Cita.objects.filter(medico=medico).select_related(
                    'paciente__usuario', 'medico__especialidad', 'sede', 'medico__usuario', 'pago'
                ).order_by('-fecha_hora')
            except Medico.DoesNotExist:
                return Response([])

        return Response(CitaResponseSerializer(citas, many=True).data)


class AgendaHoyView(APIView):
    permission_classes = [require_role(['medico', 'admin'])]

    @extend_schema(
        tags=['Citas'],
        summary='Agenda clínica del día de un médico',
        description='Retorna las citas programadas para la fecha de hoy de un médico por su UUID. Roles: medico, admin.',
        responses={200: CitaResponseSerializer(many=True)}
    )
    def get(self, request, medico_id):
        from django.utils import timezone
        tz = timezone.get_current_timezone()
        hoy = timezone.localdate()
        start_of_day = timezone.make_aware(datetime.combine(hoy, time(0, 0)), tz)
        end_of_day = timezone.make_aware(datetime.combine(hoy, time(23, 59, 59)), tz)

        citas = Cita.objects.filter(
            medico_id=medico_id,
            fecha_hora__range=(start_of_day, end_of_day),
        ).select_related(
            'paciente__usuario', 'medico__usuario', 'medico__especialidad', 'sede'
        ).order_by('fecha_hora')

        return Response(CitaResponseSerializer(citas, many=True).data)


class CambiarEstadoCitaView(APIView):
    permission_classes = [require_role(['paciente', 'medico', 'admin', 'agente_atencion'])]

    @extend_schema(
        tags=['Citas'],
        summary='Actualizar estado de una cita médica',
        description=(
            'Modifica el estado de una cita existente (pendiente_pago, confirmada, cancelada, atendida, no_asistio). '
            'El paciente solo puede cancelar citas propias. El médico puede marcar atendida o no asistió. '
            'Administradores pueden realizar cualquier cambio. Registra auditoría inmutable automáticamente.'
        ),
        request=inline_serializer(
            name='CambiarEstadoCitaRequest',
            fields={
                'nuevo_estado': serializers.ChoiceField(
                    choices=["pendiente_pago", "confirmada", "cancelada", "atendida", "no_asistio"],
                    required=True,
                    help_text='Nuevo estado asignado a la cita'
                )
            }
        ),
        responses={
            200: CitaResponseSerializer,
            400: OpenApiResponse(description='Estado inválido.'),
            403: OpenApiResponse(description='Permisos insuficientes para modificar esta cita.'),
            404: OpenApiResponse(description='Cita no encontrada.'),
        }
    )

    def patch(self, request, cita_id):
        nuevo_estado = request.query_params.get('nuevo_estado') or request.data.get('nuevo_estado') or request.data.get('estado')
        valid_estados = ["pendiente_pago", "confirmada", "cancelada", "atendida", "no_asistio"]

        if not nuevo_estado or nuevo_estado not in valid_estados:
            return Response(
                {"detail": f"Estado inválido. Opciones: {valid_estados}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cita = Cita.objects.select_related(
                'paciente__usuario', 'medico__usuario', 'medico__especialidad', 'sede'
            ).get(id=cita_id)
        except Cita.DoesNotExist:
            return Response({"detail": "Cita no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # RBAC and Ownership Enforcement
        u_rol = getattr(request.user, 'rol_id', None) or str(request.user.rol)
        if u_rol == 'paciente':
            if cita.paciente.usuario_id != request.user.id:
                return Response({"detail": "No tienes permiso para modificar citas de otros pacientes."}, status=status.HTTP_403_FORBIDDEN)
            if nuevo_estado != 'cancelada':
                return Response({"detail": "Los pacientes solo pueden cancelar citas."}, status=status.HTTP_403_FORBIDDEN)
        elif u_rol == 'medico':
            if cita.medico.usuario_id != request.user.id and u_rol != 'admin':
                return Response({"detail": "No tienes permiso para modificar citas de otro médico."}, status=status.HTTP_403_FORBIDDEN)

        estado_anterior = str(cita.estado_id)
        cita.estado_id = nuevo_estado
        cita.save(update_fields=['estado'])

        accion_audit = 'cita_cancelada' if nuevo_estado == 'cancelada' else 'cita_estado_cambiado'
        registrar_auditoria(
            accion=accion_audit,
            entidad_tipo='Cita',
            entidad_id=str(cita.id),
            usuario=request.user,
            datos_cambio={
                'estado_anterior': estado_anterior,
                'estado_nuevo': nuevo_estado,
                'motivo': request.data.get('motivo'),
            }
        )

        return Response(CitaResponseSerializer(cita).data)
