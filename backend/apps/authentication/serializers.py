from rest_framework import serializers
from .models import Usuario

class UsuarioResponseSerializer(serializers.ModelSerializer):
    rol = serializers.SlugRelatedField(read_only=True, slug_field='codigo')
    paciente = serializers.SerializerMethodField()
    medico = serializers.SerializerMethodField()
    perfil_completo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'nombre_completo', 'correo', 'rol', 'telefono', 'activo', 'correo_verificado', 'creado_en', 'paciente', 'medico', 'perfil_completo']

    def get_paciente(self, obj):
        try:
            p = getattr(obj, 'paciente', None)
            if p:
                return {
                    'documento_tipo': p.documento_tipo,
                    'documento_numero': p.documento_numero,
                    'fecha_nacimiento': p.fecha_nacimiento.isoformat() if p.fecha_nacimiento else None,
                }
        except Exception:
            pass
        return None

    def get_medico(self, obj):
        try:
            m = getattr(obj, 'medico', None)
            if m:
                return {
                    'tarjeta_profesional': m.tarjeta_profesional,
                    'especialidad': m.especialidad.nombre if m.especialidad else '',
                    'sede': m.sede.nombre if m.sede else '',
                }
        except Exception:
            pass
        return None

    def get_perfil_completo(self, obj):
        u_rol = getattr(obj, 'rol_id', None) or str(obj.rol)
        if u_rol != 'paciente':
            return True
        try:
            p = getattr(obj, 'paciente', None)
            if not p:
                return False
            doc = (p.documento_numero or '').strip()
            if not doc or doc.startswith('G-'):
                return False
            tel = (obj.telefono or '').strip()
            if not tel:
                return False
            return True
        except Exception:
            return False


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    token_type = serializers.CharField(default='bearer')
    usuario = UsuarioResponseSerializer()


class UserLoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)
    recaptcha_token = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, data):
        correo = data.get('correo') or data.get('email')
        if not correo:
            raise serializers.ValidationError({"correo": "Debe proporcionar correo o email."})
        data['correo'] = correo
        return data


class UserCreateSerializer(serializers.Serializer):
    nombre_completo = serializers.CharField(min_length=3, max_length=200)
    correo = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    rol = serializers.CharField(default='paciente', required=False)
    telefono = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    recaptcha_token = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # Patient fields
    documento_tipo = serializers.CharField(default='CC', required=False)
    documento_numero = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)

    def validate_correo(self, value):
        import re
        correo = value.strip().lower()
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_regex, correo):
            raise serializers.ValidationError("Por favor ingresa un correo electrónico válido.")

        partes = correo.split('@')
        if len(partes) != 2:
            raise serializers.ValidationError("Formato de correo electrónico inválido.")

        dominio = partes[1].lower()
        tld = dominio.split('.')[-1]
        if len(tld) < 2 or not tld.isalpha():
            raise serializers.ValidationError("El dominio del correo debe tener una extensión válida (ej: .com, .co, .net).")

        dominios_desechables = {
            'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
            'yopmail.com', 'throwawaymail.com', 'fake.com', 'dispostable.com',
            'sharklasers.com', 'trashmail.com', 'temp-mail.org', 'getairmail.com',
            'mohmal.com', 'generator.email'
        }
        if dominio in dominios_desechables:
            raise serializers.ValidationError(
                "Debes registrar un correo electrónico real y accesible. "
                "No se permiten correos temporales ni desechables, ya que recibirás un código de verificación de 6 dígitos para activar tu cuenta."
            )
        return correo

    def validate_password(self, value):
        import re
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos una letra mayúscula.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos una letra minúscula.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos un número.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos un carácter especial (ej: !@#$%^&*).")
        return value

    def validate_rol(self, value):
        if value and value.lower() != 'paciente':
            raise serializers.ValidationError(
                "El autorregistro solo está habilitado para el rol 'paciente'. "
                "Las cuentas de médicos y administradores deben ser creadas institucionalmente por la clínica."
            )
        return 'paciente'


class VerificarCodigoSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    codigo = serializers.CharField(min_length=6, max_length=6)


class ReenviarCodigoSerializer(serializers.Serializer):
    correo = serializers.EmailField()


class GoogleAuthSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nombre = serializers.CharField(required=False, allow_blank=True, default='')
    google_id = serializers.CharField(required=False, allow_blank=True, default='')
    credential = serializers.CharField(required=False, allow_blank=True, default='')


class CompletarPerfilSerializer(serializers.Serializer):
    documento_tipo = serializers.CharField(max_length=10, default='CC')
    documento_numero = serializers.CharField(min_length=5, max_length=30)
    telefono = serializers.CharField(min_length=7, max_length=20)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
