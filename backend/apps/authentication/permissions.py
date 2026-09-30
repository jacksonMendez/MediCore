from rest_framework import permissions

def require_role(roles):
    """Factory creating a DRF permission class that enforces specific role(s)."""
    if isinstance(roles, str):
        roles = [roles]

    class RolePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.rol_id == 'admin':
                return True
            return request.user.rol_id in roles

    return RolePermission


class HasPermission(permissions.BasePermission):
    """Enforces specific database permission code (e.g. 'citas.ver_mis_citas')."""
    def __init__(self, permiso_codigo=None):
        self.permiso_codigo = permiso_codigo

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.rol_id == 'admin':
            return True
        code = getattr(view, 'required_permission', self.permiso_codigo)
        if not code:
            return True
        return request.user.has_perm(code)


class IsOwnerOrStaff(permissions.BasePermission):
    """Verifies that the object belongs to the requesting user or user is staff/admin."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.rol_id in ['admin', 'agente_atencion']:
            return True

        # Check direct user relation
        if hasattr(obj, 'usuario'):
            return obj.usuario_id == request.user.id
        # Check patient relation
        if hasattr(obj, 'paciente') and hasattr(obj.paciente, 'usuario_id'):
            return obj.paciente.usuario_id == request.user.id
        # Check doctor relation
        if hasattr(obj, 'medico') and hasattr(obj.medico, 'usuario_id'):
            return obj.medico.usuario_id == request.user.id

        return False
