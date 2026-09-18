from rest_framework import serializers
from .models import Usuario

class UsuarioResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre_completo', 'correo', 'rol', 'telefono', 'activo', 'creado_en']


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    token_type = serializers.CharField(default='bearer')
    usuario = UsuarioResponseSerializer()


class UserLoginSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserCreateSerializer(serializers.Serializer):
    nombre_completo = serializers.CharField(min_length=3, max_length=200)
    correo = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    rol = serializers.ChoiceField(choices=['paciente', 'medico', 'admin'], default='paciente')
    telefono = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # Patient fields
    documento_tipo = serializers.CharField(default='CC', required=False)
    documento_numero = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
