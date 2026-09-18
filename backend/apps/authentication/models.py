import uuid
import bcrypt
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone

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
        extra_fields.setdefault('rol', 'admin')
        return self.create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser):
    ROL_CHOICES = [
        ('paciente', 'Paciente'),
        ('medico', 'Médico'),
        ('admin', 'Administrador'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_completo = models.CharField(max_length=200)
    correo = models.EmailField(unique=True, max_length=200)
    password = models.CharField(max_length=300, db_column='password_hash')
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='paciente')
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
        return self.rol == 'admin'

    def has_perm(self, perm, obj=None):
        return self.rol == 'admin'

    def has_module_perms(self, app_label):
        return self.rol == 'admin'

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
