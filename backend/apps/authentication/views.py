import random
import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import Usuario
from .serializers import (
    UserLoginSerializer,
    UserCreateSerializer,
    UsuarioResponseSerializer,
    TokenResponseSerializer,
    VerificarCodigoSerializer,
    ReenviarCodigoSerializer,
    GoogleAuthSerializer,
)
from .authentication import create_access_token
from .services import enviar_codigo_verificacion, notificar_registro_admin, enviar_bienvenida_google


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Iniciar sesión con credenciales',
        description='Autentica al usuario mediante correo y contraseña. Si es paciente y no ha verificado su correo, solicita el código OTP.',
        request=UserLoginSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description='Datos de solicitud inválidos.'),
            401: OpenApiResponse(description='Credenciales incorrectas.'),
            403: OpenApiResponse(description='Cuenta desactivada o correo no verificado.'),
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

        # Verificación de correo requerida para pacientes
        u_rol = getattr(user, 'rol_id', None) or str(user.rol)
        if u_rol == 'paciente' and not user.correo_verificado:
            # Reenviar o generar código si no tiene activo
            if not user.codigo_verificacion or not user.codigo_verificacion_expira or timezone.now() > user.codigo_verificacion_expira:
                user.codigo_verificacion = f"{random.randint(100000, 999999)}"
                user.codigo_verificacion_expira = timezone.now() + timedelta(minutes=15)
                user.save(update_fields=['codigo_verificacion', 'codigo_verificacion_expira'])
                enviar_codigo_verificacion(user, user.codigo_verificacion)

            return Response({
                "detail": "Debes verificar tu correo electrónico para acceder a datos sensibles de salud.",
                "requiere_verificacion": True,
                "correo": user.correo,
                "codigo_demo": user.codigo_verificacion,
            }, status=status.HTTP_403_FORBIDDEN)

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
        summary='Registro de nuevo usuario (exclusivo para pacientes)',
        description='Registra un nuevo paciente en la plataforma. Genera un código OTP de 6 dígitos enviado al correo para validar la identidad y notifica al administrador.',
        request=UserCreateSerializer,
        responses={
            201: OpenApiResponse(description='Paciente pre-registrado. Requiere validación de código OTP.'),
            400: OpenApiResponse(description='Validación fallida en los datos enviados.'),
            403: OpenApiResponse(description='Intento de autoregistro con un rol no autorizado.'),
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

        doc_num = data.get('documento_numero')
        if doc_num:
            from apps.clinica.models import Paciente
            if Paciente.objects.filter(documento_numero=doc_num).exists():
                return Response({"detail": "Ya existe un paciente registrado con este documento de identidad"}, status=status.HTTP_409_CONFLICT)

        # Generar código OTP de 6 dígitos
        codigo = f"{random.randint(100000, 999999)}"
        expira = timezone.now() + timedelta(minutes=15)

        user = Usuario.objects.create_user(
            correo=correo,
            password=data['password'],
            nombre_completo=data['nombre_completo'],
            rol='paciente',  # Siempre paciente para registro público
            telefono=data.get('telefono'),
            correo_verificado=False,
            codigo_verificacion=codigo,
            codigo_verificacion_expira=expira,
        )

        # Crear perfil de paciente si incluye documento
        if data.get('documento_numero'):
            from apps.clinica.models import Paciente
            Paciente.objects.create(
                usuario=user,
                documento_tipo=data.get('documento_tipo') or 'CC',
                documento_numero=data['documento_numero'],
                fecha_nacimiento=data.get('fecha_nacimiento'),
            )

        # Enviar emails
        enviar_codigo_verificacion(user, codigo)
        notificar_registro_admin(user, metodo="Formulario Web")

        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='paciente_registrado',
            entidad_tipo='Usuario',
            entidad_id=str(user.id),
            usuario=user,
            datos_cambio={'correo': user.correo, 'rol': 'paciente', 'requiere_otp': True},
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "detail": "Registro exitoso. Se ha enviado un código de verificación de 6 dígitos a tu correo electrónico.",
            "requiere_verificacion": True,
            "correo": user.correo,
            "codigo_demo": codigo,
        }, status=status.HTTP_201_CREATED)


class VerificarCodigoView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Verificar código OTP de correo electrónico',
        description='Valida el código de 6 dígitos enviado al correo del paciente. Al verificar, emite el JWT y activa el acceso completo.',
        request=VerificarCodigoSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description='Código incorrecto o expirado.'),
            404: OpenApiResponse(description='Usuario no encontrado.'),
        }
    )
    def post(self, request):
        serializer = VerificarCodigoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        correo = serializer.validated_data['correo']
        codigo = serializer.validated_data['codigo'].strip()

        try:
            user = Usuario.objects.get(correo=correo)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not user.codigo_verificacion or user.codigo_verificacion != codigo:
            return Response({"detail": "El código de verificación es incorrecto."}, status=status.HTTP_400_BAD_REQUEST)

        if user.codigo_verificacion_expira and timezone.now() > user.codigo_verificacion_expira:
            return Response({"detail": "El código de verificación ha expirado. Por favor solicita uno nuevo."}, status=status.HTTP_400_BAD_REQUEST)

        user.correo_verificado = True
        user.codigo_verificacion = None
        user.codigo_verificacion_expira = None
        user.save(update_fields=['correo_verificado', 'codigo_verificacion', 'codigo_verificacion_expira'])

        token = create_access_token(user)

        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='correo_verificado',
            entidad_tipo='Usuario',
            entidad_id=str(user.id),
            usuario=user,
            datos_cambio={'correo': user.correo, 'verificado': True},
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "detail": "¡Correo electrónico verificado exitosamente!",
            "access_token": token,
            "token_type": "bearer",
            "usuario": UsuarioResponseSerializer(user).data,
        }, status=status.HTTP_200_OK)


class ReenviarCodigoView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Reenviar código OTP de verificación',
        description='Genera un nuevo código OTP de 6 dígitos y lo remite al correo del paciente.',
        request=ReenviarCodigoSerializer,
        responses={
            200: OpenApiResponse(description='Código reenviado exitosamente.'),
            404: OpenApiResponse(description='Usuario no encontrado.'),
        }
    )
    def post(self, request):
        serializer = ReenviarCodigoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        correo = serializer.validated_data['correo']
        try:
            user = Usuario.objects.get(correo=correo)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        codigo = f"{random.randint(100000, 999999)}"
        user.codigo_verificacion = codigo
        user.codigo_verificacion_expira = timezone.now() + timedelta(minutes=15)
        user.save(update_fields=['codigo_verificacion', 'codigo_verificacion_expira'])

        enviar_codigo_verificacion(user, codigo)

        return Response({
            "detail": "Se ha reenviado un nuevo código de verificación a tu correo.",
            "codigo_demo": codigo,
        }, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Auth'],
        summary='Autenticación y Registro con Google OAuth',
        description='Permite iniciar sesión o registrarse automáticamente mediante una cuenta verificada de Google. Si el paciente no existe, se crea con correo_verificado=True y se notifica al admin.',
        request=GoogleAuthSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description='Datos de Google inválidos.'),
            403: OpenApiResponse(description='Cuenta desactivada.'),
        }
    )
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos de Google inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        nombre = serializer.validated_data.get('nombre') or email.split('@')[0].capitalize()

        user = Usuario.objects.filter(correo=email).first()

        if not user:
            # Nuevo paciente registrado vía Google
            user = Usuario.objects.create_user(
                correo=email,
                password=uuid.uuid4().hex,  # Password aleatorio seguro
                nombre_completo=nombre,
                rol='paciente',
                correo_verificado=True,
            )
            from apps.clinica.models import Paciente
            Paciente.objects.create(
                usuario=user,
                documento_tipo='CC',
                documento_numero=f"G-{random.randint(1000000, 9999999)}",
            )
            enviar_bienvenida_google(user)
            notificar_registro_admin(user, metodo="Google Sign-In")

            from apps.auditoria.services import registrar_auditoria
            registrar_auditoria(
                accion='registro_google',
                entidad_tipo='Usuario',
                entidad_id=str(user.id),
                usuario=user,
                datos_cambio={'correo': email, 'proveedor': 'google'},
                ip=request.META.get('REMOTE_ADDR')
            )
        else:
            if not user.activo:
                return Response({"detail": "Cuenta desactivada. Contacte al administrador."}, status=status.HTTP_403_FORBIDDEN)
            if not user.correo_verificado:
                user.correo_verificado = True
                user.save(update_fields=['correo_verificado'])

        token = create_access_token(user)

        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='login_google',
            entidad_tipo='Usuario',
            entidad_id=str(user.id),
            usuario=user,
            datos_cambio={'correo': email, 'proveedor': 'google'},
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "access_token": token,
            "token_type": "bearer",
            "usuario": UsuarioResponseSerializer(user).data,
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        summary='Perfil del usuario autenticado (Me)',
        description='Retorna la información del usuario en sesión activa a partir de su Bearer Token. Roles permitidos: todos los roles autenticados.',
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
