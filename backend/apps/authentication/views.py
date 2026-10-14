import random
import uuid
import json
import logging
import urllib.parse
import urllib.request
from datetime import timedelta
from django.conf import settings
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
    CompletarPerfilSerializer,
)
from .authentication import create_access_token
from .services import enviar_codigo_verificacion, notificar_registro_admin, enviar_bienvenida_google

logger = logging.getLogger(__name__)


def verificar_recaptcha(token: str, ip: str = None) -> bool:
    """
    Verifica el token de Google reCAPTCHA v2 contra los servidores oficiales de Google:
    https://www.google.com/recaptcha/api/siteverify
    Permite bypass para pruebas automatizadas si el token es 'demo-bypass-token'.
    """
    if not token or not str(token).strip():
        return False

    token_clean = str(token).strip()
    if token_clean == 'demo-bypass-token':
        logger.warning("Intento de verificación reCAPTCHA con demo-bypass-token rechazado. Verificación humana requerida.")
        return False

    secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')
    url = "https://www.google.com/recaptcha/api/siteverify"
    data = {
        'secret': secret,
        'response': token_clean,
    }
    if ip:
        data['remoteip'] = ip

    try:
        encoded_data = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=encoded_data,
            headers={'User-Agent': 'MediCore-ClinicalOS/2.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_json = json.loads(response.read().decode('utf-8'))
            logger.info("Google reCAPTCHA verification response: %s", res_json)
            return bool(res_json.get('success', False))
    except Exception as e:
        logger.error("Error al validar con Google reCAPTCHA siteverify: %s", e)
        return False


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
        recaptcha_token = request.data.get('recaptcha_token') or request.data.get('g-recaptcha-response')
        if not verificar_recaptcha(recaptcha_token, request.META.get('REMOTE_ADDR')):
            return Response({
                "detail": "Verificación reCAPTCHA requerida o token inválido. Por favor completa la casilla 'No soy un robot'."
            }, status=status.HTTP_400_BAD_REQUEST)

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
        recaptcha_token = request.data.get('recaptcha_token') or request.data.get('g-recaptcha-response')
        if not verificar_recaptcha(recaptcha_token, request.META.get('REMOTE_ADDR')):
            return Response({
                "detail": "Verificación reCAPTCHA requerida o token inválido. Por favor completa la casilla 'No soy un robot'."
            }, status=status.HTTP_400_BAD_REQUEST)

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
        nombre = serializer.validated_data.get('nombre') or ''

        # Decodificar Google credential JWT si viene presente (Google Identity Services)
        credential = serializer.validated_data.get('credential')
        if credential:
            try:
                import base64
                import json
                parts = credential.strip().split('.')
                if len(parts) >= 2:
                    padded = parts[1] + '=' * (-len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8'))
                    if payload.get('email'):
                        email = payload['email'].strip().lower()
                    if payload.get('name') and not nombre:
                        nombre = payload['name'].strip()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Error decodificando token Google: {e}")

        if not nombre:
            nombre = email.split('@')[0].capitalize()

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


class CompletarPerfilPacienteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        summary='Completar perfil clínico de paciente',
        description='Permite a un paciente registrado vía Google o con datos incompletos registrar su documento y teléfono para desbloquear el uso del copiloto clínico.',
        request=CompletarPerfilSerializer,
        responses={
            200: UsuarioResponseSerializer,
            400: OpenApiResponse(description='Datos inválidos o documento duplicado.'),
            403: OpenApiResponse(description='Solo pacientes pueden completar este perfil.'),
        }
    )
    def post(self, request):
        user = request.user
        u_rol = getattr(user, 'rol_id', None) or str(user.rol)
        if u_rol != 'paciente':
            return Response({"detail": "Solo los pacientes requieren completar estos datos clínicos."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompletarPerfilSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Datos inválidos", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        doc_num = data['documento_numero'].strip()
        doc_tipo = data.get('documento_tipo', 'CC').strip()
        tel = data['telefono'].strip()
        fecha_nac = data.get('fecha_nacimiento')

        from apps.clinica.models import Paciente
        existing = Paciente.objects.filter(documento_numero=doc_num).exclude(usuario=user).first()
        if existing:
            return Response({"detail": "Ya existe otro paciente registrado con este número de documento."}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar teléfono en usuario
        user.telefono = tel
        user.save(update_fields=['telefono'])

        # Actualizar o crear registro de paciente
        paciente, _ = Paciente.objects.get_or_create(usuario=user, defaults={'documento_numero': doc_num, 'documento_tipo': doc_tipo})
        paciente.documento_tipo = doc_tipo
        paciente.documento_numero = doc_num
        if fecha_nac:
            paciente.fecha_nacimiento = fecha_nac
        paciente.save()

        from apps.auditoria.services import registrar_auditoria
        registrar_auditoria(
            accion='perfil_completado',
            entidad_tipo='Paciente',
            entidad_id=str(paciente.id),
            usuario=user,
            datos_cambio={'documento_tipo': doc_tipo, 'documento_numero': doc_num, 'telefono': tel},
            ip=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "detail": "Perfil clínico completado exitosamente. Ya puedes interactuar con el copiloto clínico.",
            "usuario": UsuarioResponseSerializer(user).data
        }, status=status.HTTP_200_OK)
