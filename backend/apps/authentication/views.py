from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Usuario
from .serializers import (
    UserLoginSerializer,
    UserCreateSerializer,
    UsuarioResponseSerializer,
)
from .authentication import create_access_token


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

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
            return Response({"detail": "Correo o contraseña incorrectos"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.activo:
            return Response({"detail": "Cuenta desactivada. Contacte al administrador."}, status=status.HTTP_403_FORBIDDEN)

        token = create_access_token(user)

        return Response({
            "access_token": token,
            "token_type": "bearer",
            "usuario": UsuarioResponseSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

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

    def get(self, request):
        return Response(UsuarioResponseSerializer(request.user).data)
