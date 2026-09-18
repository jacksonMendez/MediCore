import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework import authentication, exceptions, permissions
from .models import Usuario


def create_access_token(user: Usuario, expires_delta: timedelta = None) -> str:
    """Create a JWT access token with payload {'sub': str(user.id), 'rol': user.rol}."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    payload = {
        'sub': str(user.id),
        'rol': user.rol,
        'exp': expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise exceptions.AuthenticationFailed('Token inválido o expirado')
    except jwt.PyJWTError:
        raise exceptions.AuthenticationFailed('Token inválido o expirado')


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Custom DRF Authentication class reading 'Authorization: Bearer <token>'.
    Matches the FastAPI payload structure {'sub': user_id, 'rol': ...}.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        payload = decode_access_token(token)

        user_id = payload.get('sub')
        if not user_id:
            raise exceptions.AuthenticationFailed('Token inválido: sin identificador de usuario')

        try:
            user = Usuario.objects.get(id=user_id, activo=True)
        except Usuario.DoesNotExist:
            raise exceptions.AuthenticationFailed('Usuario no encontrado o desactivado')

        return (user, token)


def require_role(allowed_roles: list[str]):
    """Returns a DRF permission class that checks user.rol in allowed_roles."""
    class RolePermission(permissions.BasePermission):
        message = f"Acceso denegado. Roles permitidos: {', '.join(allowed_roles)}"

        def has_permission(self, request, view):
            return bool(
                request.user
                and request.user.is_authenticated
                and request.user.rol in allowed_roles
            )

    return RolePermission
