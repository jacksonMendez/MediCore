from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from apps.authentication.models import Usuario
from apps.authentication.authentication import require_role
from apps.auditoria.services import registrar_auditoria
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

    @extend_schema(
        tags=['Sedes'],
        summary='Listar sedes activas',
        description='Retorna todas las sedes clínicas habilitadas con su dirección y ciudad. Acceso público.',
        responses={200: SedeResponseSerializer(many=True)}
    )
    def get(self, request):
        sedes = Sede.objects.filter(activa=True)
        return Response(SedeResponseSerializer(sedes, many=True).data)

    @extend_schema(
        tags=['Sedes'],
        summary='Crear nueva sede clínica',
        description='Registra una nueva sede hospitalaria en la plataforma. Roles permitidos: admin.',
        request=SedeCreateSerializer,
        responses={
            201: SedeResponseSerializer,
            400: OpenApiResponse(description='Datos de sede inválidos.'),
            403: OpenApiResponse(description='Requiere rol admin.'),
        }
    )
    def post(self, request):
        serializer = SedeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de sede inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        sede = serializer.save()
        registrar_auditoria(
            accion='sede_creada',
            entidad_tipo='Sede',
            entidad_id=str(sede.id),
            usuario=request.user,
            datos_cambio={'nombre': sede.nombre, 'direccion': sede.direccion},
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response(SedeResponseSerializer(sede).data, status=status.HTTP_201_CREATED)


class EspecialidadListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    @extend_schema(
        tags=['Especialidades'],
        summary='Listar catálogo de especialidades',
        description='Retorna las especialidades médicas ofrecidas por la clínica junto con sus precios base de consulta. Acceso público.',
        responses={200: EspecialidadResponseSerializer(many=True)}
    )
    def get(self, request):
        especialidades = Especialidad.objects.all()
        return Response(EspecialidadResponseSerializer(especialidades, many=True).data)

    @extend_schema(
        tags=['Especialidades'],
        summary='Crear nueva especialidad médica',
        description='Agrega una especialidad y su arancel base al catálogo clínico. Roles permitidos: admin.',
        request=EspecialidadCreateSerializer,
        responses={
            201: EspecialidadResponseSerializer,
            400: OpenApiResponse(description='Datos inválidos.'),
            403: OpenApiResponse(description='Requiere rol admin.'),
            409: OpenApiResponse(description='La especialidad ya existe.'),
        }
    )
    def post(self, request):
        serializer = EspecialidadCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de especialidad inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        nombre = serializer.validated_data['nombre']
        if Especialidad.objects.filter(nombre=nombre).exists():
            return Response({"detail": "Especialidad ya existe"}, status=status.HTTP_409_CONFLICT)

        esp = serializer.save()
        registrar_auditoria(
            accion='especialidad_creada',
            entidad_tipo='Especialidad',
            entidad_id=str(esp.id),
            usuario=request.user,
            datos_cambio={'nombre': esp.nombre, 'precio_base': float(esp.precio_base)},
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response(EspecialidadResponseSerializer(esp).data, status=status.HTTP_201_CREATED)


class MedicoListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    @extend_schema(
        tags=['Médicos'],
        summary='Listar cuerpo médico activo',
        description='Retorna los médicos disponibles en el sistema con su especialidad, sede y tarjeta profesional. Permite filtrar por especialidad_id y sede_id. Acceso público.',
        parameters=[
            OpenApiParameter('especialidad_id', str, description='UUID de la especialidad', required=False),
            OpenApiParameter('sede_id', str, description='UUID de la sede', required=False),
        ],
        responses={200: MedicoResponseSerializer(many=True)}
    )
    def get(self, request):
        queryset = Medico.objects.filter(activo=True).select_related('usuario', 'especialidad', 'sede')
        especialidad_id = request.query_params.get('especialidad_id')
        sede_id = request.query_params.get('sede_id')

        if especialidad_id:
            queryset = queryset.filter(especialidad_id=especialidad_id)
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)

        return Response(MedicoResponseSerializer(queryset, many=True).data)

    @extend_schema(
        tags=['Médicos'],
        summary='Registrar nuevo médico en la clínica',
        description='Crea un perfil de médico vinculado a un usuario existente o creando uno nuevo simultáneamente. Roles permitidos: admin.',
        request=MedicoCreateSerializer,
        responses={
            201: MedicoResponseSerializer,
            400: OpenApiResponse(description='Datos de médico o credenciales inválidos.'),
            403: OpenApiResponse(description='Requiere rol admin.'),
            404: OpenApiResponse(description='Especialidad, sede o usuario no encontrado.'),
            409: OpenApiResponse(description='Correo o tarjeta profesional ya registrados.'),
        }
    )
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

        # Auto-crear turnos de lunes a viernes de 8:00 a 17:00 para disponibilidad inmediata
        from datetime import time
        for dia in ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']:
            HorarioMedico.objects.get_or_create(
                medico=medico,
                dia=dia,
                defaults={
                    'hora_inicio': time(8, 0),
                    'hora_fin': time(17, 0)
                }
            )

        registrar_auditoria(
            accion='medico_creado',
            entidad_tipo='Medico',
            entidad_id=str(medico.id),
            usuario=request.user,
            datos_cambio={
                'usuario_id': str(user.id),
                'nombre_completo': user.nombre_completo,
                'especialidad': esp.nombre,
                'sede': sede.nombre,
                'tarjeta_profesional': medico.tarjeta_profesional,
            },
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response(MedicoResponseSerializer(medico).data, status=status.HTTP_201_CREATED)


class HorariosMedicoView(APIView):
    def get_permissions(self):
        return [permissions.AllowAny()]

    @extend_schema(
        tags=['Médicos'],
        summary='Consultar turnos y franja horaria de un médico',
        description='Retorna las franjas horarias configuradas para un médico durante los días de la semana. Acceso público.',
        responses={200: HorarioResponseSerializer(many=True)}
    )
    def get(self, request, medico_id):
        horarios = HorarioMedico.objects.filter(medico_id=medico_id)
        return Response(HorarioResponseSerializer(horarios, many=True).data)


class CrearHorarioView(APIView):
    permission_classes = [require_role(['admin', 'medico'])]

    @extend_schema(
        tags=['Médicos'],
        summary='Asignar franja horaria a un médico',
        description='Define el horario semanal (día, hora_inicio, hora_fin) en el que un médico atiende consultas. Roles permitidos: admin.',
        request=HorarioCreateSerializer,
        responses={
            201: HorarioResponseSerializer,
            400: OpenApiResponse(description='Datos de horario inválidos.'),
            403: OpenApiResponse(description='Requiere rol admin.'),
            404: OpenApiResponse(description='Médico no encontrado.'),
        }
    )
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

        registrar_auditoria(
            accion='medico_editado',
            entidad_tipo='HorarioMedico',
            entidad_id=str(horario.id),
            usuario=request.user,
            datos_cambio={
                'medico_id': str(medico.id),
                'dia': horario.dia,
                'hora_inicio': str(horario.hora_inicio),
                'hora_fin': str(horario.hora_fin),
            },
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response(HorarioResponseSerializer(horario).data, status=status.HTTP_201_CREATED)


class SedeDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request, sede_id):
        try:
            sede = Sede.objects.get(id=sede_id)
            return Response(SedeResponseSerializer(sede).data)
        except Sede.DoesNotExist:
            return Response({"detail": "Sede no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, sede_id):
        try:
            sede = Sede.objects.get(id=sede_id)
        except Sede.DoesNotExist:
            return Response({"detail": "Sede no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        for field in ['nombre', 'direccion', 'telefono', 'activa']:
            if field in request.data:
                setattr(sede, field, request.data[field])
        sede.save()

        registrar_auditoria(
            accion='sede_editada',
            entidad_tipo='Sede',
            entidad_id=str(sede.id),
            usuario=request.user,
            datos_cambio={'nombre': sede.nombre, 'activa': sede.activa},
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response(SedeResponseSerializer(sede).data)

    def delete(self, request, sede_id):
        try:
            sede = Sede.objects.get(id=sede_id)
        except Sede.DoesNotExist:
            return Response({"detail": "Sede no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        sede.activa = False
        sede.save()
        registrar_auditoria(
            accion='sede_desactivada',
            entidad_tipo='Sede',
            entidad_id=str(sede.id),
            usuario=request.user,
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response({"detail": "Sede desactivada correctamente"})


class EspecialidadDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request, especialidad_id):
        try:
            esp = Especialidad.objects.get(id=especialidad_id)
            return Response(EspecialidadResponseSerializer(esp).data)
        except Especialidad.DoesNotExist:
            return Response({"detail": "Especialidad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, especialidad_id):
        try:
            esp = Especialidad.objects.get(id=especialidad_id)
        except Especialidad.DoesNotExist:
            return Response({"detail": "Especialidad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        for field in ['nombre', 'descripcion', 'precio_base']:
            if field in request.data:
                setattr(esp, field, request.data[field])
        esp.save()

        registrar_auditoria(
            accion='especialidad_editada',
            entidad_tipo='Especialidad',
            entidad_id=str(esp.id),
            usuario=request.user,
            datos_cambio={'nombre': esp.nombre, 'precio_base': float(esp.precio_base)},
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response(EspecialidadResponseSerializer(esp).data)

    def delete(self, request, especialidad_id):
        try:
            esp = Especialidad.objects.get(id=especialidad_id)
        except Especialidad.DoesNotExist:
            return Response({"detail": "Especialidad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        if Medico.objects.filter(especialidad=esp, activo=True).exists():
            return Response({"detail": "No se puede eliminar una especialidad que tiene médicos activos asignados."}, status=status.HTTP_400_BAD_REQUEST)

        esp.delete()
        registrar_auditoria(
            accion='especialidad_eliminada',
            entidad_tipo='Especialidad',
            entidad_id=str(especialidad_id),
            usuario=request.user,
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response({"detail": "Especialidad eliminada correctamente"})


class MedicoDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [require_role(['admin'])()]
        return [permissions.AllowAny()]

    def get(self, request, medico_id):
        try:
            medico = Medico.objects.select_related('usuario', 'especialidad', 'sede').get(id=medico_id)
            return Response(MedicoResponseSerializer(medico).data)
        except Medico.DoesNotExist:
            return Response({"detail": "Médico no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, medico_id):
        try:
            medico = Medico.objects.select_related('usuario').get(id=medico_id)
        except Medico.DoesNotExist:
            return Response({"detail": "Médico no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'especialidad_id' in data:
            medico.especialidad_id = data['especialidad_id']
        if 'sede_id' in data:
            medico.sede_id = data['sede_id']
        if 'tarjeta_profesional' in data:
            medico.tarjeta_profesional = data['tarjeta_profesional']
        if 'duracion_cita_minutos' in data:
            medico.duracion_cita_minutos = data['duracion_cita_minutos']
        if 'genero' in data:
            medico.genero = data['genero']
        if 'activo' in data:
            medico.activo = bool(data['activo'])
            medico.usuario.activo = bool(data['activo'])
            medico.usuario.save(update_fields=['activo'])
        if 'nombre_completo' in data:
            medico.usuario.nombre_completo = data['nombre_completo']
            medico.usuario.save(update_fields=['nombre_completo'])
        if 'telefono' in data:
            medico.usuario.telefono = data['telefono']
            medico.usuario.save(update_fields=['telefono'])

        medico.save()

        registrar_auditoria(
            accion='medico_editado',
            entidad_tipo='Medico',
            entidad_id=str(medico.id),
            usuario=request.user,
            datos_cambio={'activo': medico.activo, 'tarjeta': medico.tarjeta_profesional},
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response(MedicoResponseSerializer(medico).data)

    def delete(self, request, medico_id):
        try:
            medico = Medico.objects.select_related('usuario').get(id=medico_id)
        except Medico.DoesNotExist:
            return Response({"detail": "Médico no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        medico.activo = False
        medico.save(update_fields=['activo'])
        medico.usuario.activo = False
        medico.usuario.save(update_fields=['activo'])

        registrar_auditoria(
            accion='medico_desactivado',
            entidad_tipo='Medico',
            entidad_id=str(medico.id),
            usuario=request.user,
            ip=request.META.get('REMOTE_ADDR')
        )
        return Response({"detail": "Médico desactivado correctamente"})

