from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import Usuario
from .serializers import (
    UserLoginSerializer,
    UserCreateSerializer,
    UsuarioResponseSerializer,
)
from .authentication import create_access_token


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Iniciar sesión con credenciales',
        description='Autentica al usuario (paciente, médico, admin o agente) mediante correo y contraseña. Retorna un JWT Bearer Token y los datos del perfil.',
        request=UserLoginSerializer,
        responses={
            200: OpenApiResponse(description='Autenticación exitosa. Retorna access_token y datos del usuario.'),
            400: OpenApiResponse(description='Datos de solicitud inválidos.'),
            401: OpenApiResponse(description='Credenciales incorrectas.'),
            403: OpenApiResponse(description='Cuenta desactivada.'),
        }
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        correo = serializer.validated_data['correo']
        password = serializer.validated_data['password']

        try:
            user = Usuario.objects.get(correo=correo)
        except Usuario.DoesNotExist:
            return Response({"detail": "Correo o contraseña incorrectos"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password_compatible(password):
            from apps.auditoria.services import registrar_auditoria
            registrar_auditoria(
                accion='login_fallido',
                entidad_tipo='Usuario',
                entidad_id=str(user.id),
                usuario=user,
                datos_cambio={'correo': correo, 'motivo': 'credenciales_incorrectas'},
                ip=request.META.get('REMOTE_ADDR')
            )
            return Response({"detail": "Correo o contraseña incorrectos"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.activo:
            return Response({"detail": "Cuenta desactivada. Contacte al administrador."}, status=status.HTTP_403_FORBIDDEN)

        token = create_access_token(user)

        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='login_exitoso',
            entidad_tipo='Usuario',
            entidad_id=str(user.id),
            usuario=user,
            datos_cambio={'correo': user.correo, 'rol': str(user.rol_id)},
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "access_token": token,
            "token_type": "bearer",
            "usuario": UsuarioResponseSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Registro de nuevo usuario/paciente',
        description='Crea una nueva cuenta de usuario en el sistema. Si el rol es paciente, crea automáticamente el perfil clínico asociado.',
        request=UserCreateSerializer,
        responses={
            201: OpenApiResponse(description='Usuario registrado exitosamente con token JWT y perfil.'),
            400: OpenApiResponse(description='Validación fallida en los datos enviados.'),
            409: OpenApiResponse(description='El correo electrónico ya se encuentra registrado.'),
        }
    )
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de registro inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        correo = data['correo']

        if Usuario.objects.filter(correo=correo).exists():
            return Response({"detail": "Ya existe un usuario con este correo"}, status=status.HTTP_409_CONFLICT)

        user = Usuario.objects.create_user(
            correo=correo,
            password=data['password'],
            nombre_completo=data['nombre_completo'],
            rol=data.get('rol', 'paciente'),
            telefono=data.get('telefono'),
        )

        # Create patient profile if role is 'paciente'
        if user.rol == 'paciente' and data.get('documento_numero'):
            from apps.clinica.models import Paciente
            Paciente.objects.create(
                usuario=user,
                documento_tipo=data.get('documento_tipo') or 'CC',
                documento_numero=data['documento_numero'],
                fecha_nacimiento=data.get('fecha_nacimiento'),
            )

        token = create_access_token(user)

        return Response({
            "access_token": token,
            "token_type": "bearer",
            "usuario": UsuarioResponseSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        summary='Perfil del usuario autenticado (Me)',
        description='Retorna la información del usuario en sesión activa a partir de su Bearer Token. Roles permitidos: todos los roles autenticados (paciente, medico, admin, agente_atencion).',
        responses={
            200: UsuarioResponseSerializer,
            401: OpenApiResponse(description='Token de autorización ausente o expirado.'),
        }
    )
    def get(self, request):
        return Response(UsuarioResponseSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        summary='Cerrar sesión de usuario',
        description='Registra el cierre de sesión en la auditoría inmutable del sistema. Roles permitidos: usuarios autenticados.',
        request=None,
        responses={
            200: OpenApiResponse(description='Sesión cerrada exitosamente.'),
            401: OpenApiResponse(description='No autenticado.'),
        }
    )
    def post(self, request):
        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='logout',
            entidad_tipo='Usuario',
            entidad_id=str(request.user.id),
            usuario=request.user,
            datos_cambio={'correo': request.user.correo, 'rol': str(request.user.rol_id)},
            ip=request.META.get('REMOTE_ADDR'),
        )
        return Response({"detail": "Sesión cerrada exitosamente."}, status=status.HTTP_200_OK)
