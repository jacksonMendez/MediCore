from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.authentication.models import Usuario
from apps.authentication.authentication import require_role
from .models import Sede, Especialidad, Medico, HorarioMedico
from .serializers import (
    SedeResponseSerializer,
    SedeCreateSerializer,
    EspecialidadResponseSerializer,
    EspecialidadCreateSerializer,
    MedicoResponseSerializer,
    MedicoCreateSerializer,
    HorarioResponseSerializer,
    HorarioCreateSerializer,
)


class SedeListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request):
        sedes = Sede.objects.filter(activa=True)
        return Response(SedeResponseSerializer(sedes, many=True).data)

    def post(self, request):
        serializer = SedeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de sede inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        sede = serializer.save()
        return Response(SedeResponseSerializer(sede).data, status=status.HTTP_201_CREATED)


class EspecialidadListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request):
        especialidades = Especialidad.objects.all()
        return Response(EspecialidadResponseSerializer(especialidades, many=True).data)

    def post(self, request):
        serializer = EspecialidadCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de especialidad inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        nombre = serializer.validated_data['nombre']
        if Especialidad.objects.filter(nombre=nombre).exists():
            return Response({"detail": "Especialidad ya existe"}, status=status.HTTP_409_CONFLICT)

        esp = serializer.save()
        return Response(EspecialidadResponseSerializer(esp).data, status=status.HTTP_201_CREATED)


class MedicoListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request):
        queryset = Medico.objects.filter(activo=True).select_related('usuario', 'especialidad', 'sede')
        especialidad_id = request.query_params.get('especialidad_id')
        sede_id = request.query_params.get('sede_id')

        if especialidad_id:
            queryset = queryset.filter(especialidad_id=especialidad_id)
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)

        return Response(MedicoResponseSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = MedicoCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de médico inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        usuario_id = data.get('usuario_id')

        if usuario_id:
            try:
                user = Usuario.objects.get(id=usuario_id)
            except Usuario.DoesNotExist:
                return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        elif data.get('correo') and data.get('nombre_completo') and data.get('password'):
            correo = data['correo']
            if Usuario.objects.filter(correo=correo).exists():
                return Response({"detail": "Ya existe un usuario con este correo"}, status=status.HTTP_409_CONFLICT)

            user = Usuario.objects.create_user(
                correo=correo,
                password=data['password'],
                nombre_completo=data['nombre_completo'],
                rol='medico',
                telefono=data.get('telefono'),
            )
        else:
            return Response(
                {"detail": "Proporcione usuario_id existente o datos para crear usuario nuevo (nombre, correo, password)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            esp = Especialidad.objects.get(id=data['especialidad_id'])
        except Especialidad.DoesNotExist:
            return Response({"detail": "Especialidad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        try:
            sede = Sede.objects.get(id=data['sede_id'])
        except Sede.DoesNotExist:
            return Response({"detail": "Sede no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        medico = Medico.objects.create(
            usuario=user,
            especialidad=esp,
            sede=sede,
            tarjeta_profesional=data['tarjeta_profesional'],
            duracion_cita_minutos=data.get('duracion_cita_minutos', 30),
            genero=data.get('genero', 'M'),
        )

        return Response(MedicoResponseSerializer(medico).data, status=status.HTTP_201_CREATED)


class HorariosMedicoView(APIView):
    def get_permissions(self):
        return [permissions.AllowAny()]

    def get(self, request, medico_id):
        horarios = HorarioMedico.objects.filter(medico_id=medico_id)
        return Response(HorarioResponseSerializer(horarios, many=True).data)


class CrearHorarioView(APIView):
    permission_classes = [require_role(['admin'])]

    def post(self, request):
        serializer = HorarioCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de horario inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        medico_id = serializer.validated_data['medico_id']
        try:
            medico = Medico.objects.get(id=medico_id)
        except Medico.DoesNotExist:
            return Response({"detail": "Médico no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        horario = HorarioMedico.objects.create(
            medico=medico,
            dia=serializer.validated_data['dia'],
            hora_inicio=serializer.validated_data['hora_inicio'],
            hora_fin=serializer.validated_data['hora_fin'],
        )

        return Response(HorarioResponseSerializer(horario).data, status=status.HTTP_201_CREATED)
