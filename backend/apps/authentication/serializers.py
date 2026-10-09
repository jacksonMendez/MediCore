from rest_framework import serializers
from .models import Usuario

class UsuarioResponseSerializer(serializers.ModelSerializer):
    rol = serializers.SlugRelatedField(read_only=True, slug_field='codigo')

    class Meta:
        model = Usuario
        fields = ['id', 'nombre_completo', 'correo', 'rol', 'telefono', 'activo', 'correo_verificado', 'creado_en']


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    token_type = serializers.CharField(default='bearer')
    usuario = UsuarioResponseSerializer()


class UserLoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        correo = data.get('correo') or data.get('email')
        if not correo:
            raise serializers.ValidationError({"correo": "Debe proporcionar correo o email."})
        data['correo'] = correo
        return data


class UserCreateSerializer(serializers.Serializer):
    nombre_completo = serializers.CharField(min_length=3, max_length=200)
    correo = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    rol = serializers.CharField(default='paciente', required=False)
    telefono = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # Patient fields
    documento_tipo = serializers.CharField(default='CC', required=False)
    documento_numero = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)

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
