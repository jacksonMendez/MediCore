from datetime import date, datetime, time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.authentication.authentication import require_role
from apps.clinica.models import Medico, Paciente
from .models import Cita
from .services import get_disponibilidad
from .serializers import (
    CitaCreateSerializer,
    CitaResponseSerializer,
    DisponibilidadResponseSerializer,
)


class DisponibilidadView(APIView):
    permission_classes = [permissions.AllowAny]

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
    permission_classes = [permissions.IsAuthenticated]

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

        return Response(CitaResponseSerializer(cita).data, status=status.HTTP_201_CREATED)


class MisCitasView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
    permission_classes = [require_role(['medico', 'admin'])]

    def patch(self, request, cita_id):
        nuevo_estado = request.query_params.get('nuevo_estado') or request.data.get('nuevo_estado')
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

        cita.estado = nuevo_estado
        cita.save(update_fields=['estado'])

        return Response(CitaResponseSerializer(cita).data)
