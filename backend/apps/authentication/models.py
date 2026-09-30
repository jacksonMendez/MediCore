import uuid
import bcrypt
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone


class Rol(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre


class Permiso(models.Model):
    codigo = models.CharField(max_length=60, primary_key=True)
    nombre = models.CharField(max_length=100)
    modulo = models.CharField(max_length=40)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'permisos'
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'

    def __str__(self):
        return f"{self.modulo}: {self.nombre} ({self.codigo})"


class RolPermiso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='permisos_asignados')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, related_name='roles_asignados')

    class Meta:
        db_table = 'roles_permisos'
        verbose_name = 'Permiso por Rol'
        verbose_name_plural = 'Permisos por Rol'
        unique_together = ('rol', 'permiso')

    def __str__(self):
        return f"{self.rol_id} -> {self.permiso_id}"


class UsuarioManager(BaseUserManager):
    def create_user(self, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo es obligatorio')
        correo = self.normalize_email(correo)
        user = self.model(correo=correo, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault('rol_id', 'admin')
        return self.create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser):
    ROL_CHOICES = [
        ('paciente', 'Paciente'),
        ('medico', 'Médico'),
        ('admin', 'Administrador'),
        ('agente_atencion', 'Agente de Atención al Cliente'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_completo = models.CharField(max_length=200)
    correo = models.EmailField(unique=True, max_length=200)
    password = models.CharField(max_length=300, db_column='password_hash')
    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        db_column='rol',
        default='paciente',
        related_name='usuarios',
    )
    telefono = models.CharField(max_length=20, null=True, blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(default=timezone.now)

    # Disable last_login field because it does not exist in schema.sql
    last_login = None

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre_completo']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    @property
    def is_active(self):
        return self.activo

    @is_active.setter
    def is_active(self, value):
        self.activo = value

    @property
    def is_staff(self):
        return self.rol_id == 'admin'

    def has_perm(self, perm, obj=None):
        if not self.activo:
            return False
        if self.rol_id == 'admin':
            return True
        return RolPermiso.objects.filter(rol_id=self.rol_id, permiso_id=perm).exists()

    def has_module_perms(self, app_label):
        if not self.activo:
            return False
        if self.rol_id == 'admin':
            return True
        return RolPermiso.objects.filter(rol_id=self.rol_id, permiso__modulo=app_label).exists()

    def set_password(self, raw_password):
        pw_bytes = raw_password[:72].encode('utf-8')
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

    def check_password_compatible(self, raw_password: str) -> bool:
        """Verify password using standard bcrypt matching FastAPI passlib/bcrypt."""
        try:
            pw_bytes = raw_password[:72].encode('utf-8')
            hash_bytes = self.password.encode('utf-8')
            return bcrypt.checkpw(pw_bytes, hash_bytes)
        except Exception:
            return False

    def check_password(self, raw_password: str) -> bool:
        return self.check_password_compatible(raw_password)
