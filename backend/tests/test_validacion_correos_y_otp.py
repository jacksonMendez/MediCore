import os
import sys
import django
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.authentication.views import RegisterView, LoginView, VerificarCodigoView
from apps.authentication.models import Usuario

def test_validacion_correos_y_otp():
    print("=================================================================")
    print(">>> VERIFICACIÓN: CORREOS REALES, DOMINIOS DESECHABLES Y OTP <<<")
    print("=================================================================")
    factory = APIRequestFactory()

    # 1. Rechazo de correo con formato inválido
    print("\n[TEST 1] Rechazo de correo mal formado (sin dominio o sin TLD válido)...")
    req_bad_email = factory.post('/api/auth/register', {
        'nombre_completo': 'Paciente Falso',
        'correo': 'correo_invalido_sin_dominio',
        'password': 'Password123!',
        'rol': 'paciente'
    }, format='json')
    from unittest.mock import patch
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res_bad = RegisterView.as_view()(req_bad_email)
    assert res_bad.status_code == 400
    print("  -> OK: Formato de correo inválido rechazado con 400 Bad Request.")

    # 2. Rechazo de dominios desechables o temporales
    print("\n[TEST 2] Rechazo de correos temporales (mailinator, tempmail, yopmail)...")
    req_temp_email = factory.post('/api/auth/register', {
        'nombre_completo': 'Paciente Temp',
        'correo': f"temp_{uuid.uuid4().hex[:4]}@mailinator.com",
        'password': 'Password123!',
        'rol': 'paciente'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res_temp = RegisterView.as_view()(req_temp_email)
    assert res_temp.status_code == 400
    print("  -> OK: Dominio desechable @mailinator.com bloqueado exitosamente.")

    # 3. Correo real registrado -> requiere OTP -> no puede loguearse sin verificar
    print("\n[TEST 3] Bloqueo de inicio de sesión hasta que verifique el código...")
    real_email = f"paciente_{uuid.uuid4().hex[:6]}@gmail.com"
    req_real = factory.post('/api/auth/register', {
        'nombre_completo': 'Diana Carolina Mendez',
        'correo': real_email,
        'password': 'Password123!',
        'rol': 'paciente',
        'documento_tipo': 'TI',
        'documento_numero': f"{uuid.uuid4().int % 1000000000:09d}"
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res_real = RegisterView.as_view()(req_real)
    assert res_real.status_code == 201
    assert res_real.data.get('requiere_verificacion') is True

    # Intento de login previo a verificar código: debe ser 403 Forbidden
    req_login = factory.post('/api/auth/login', {
        'correo': real_email,
        'password': 'Password123!'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res_login = LoginView.as_view()(req_login)
    assert res_login.status_code == 403
    assert res_login.data.get('requiere_verificacion') is True
    assert 'codigo_demo' not in res_login.data  # No fuga de código OTP
    print("  -> OK: Inicio de sesión bloqueado (403) para usuario no verificado.")

    # 4. Verificación con código OTP
    print("\n[TEST 4] Activación legítima mediante el código OTP...")
    user_obj = Usuario.objects.get(correo=real_email)
    codigo_real = user_obj.codigo_verificacion

    req_verify = factory.post('/api/auth/verificar-codigo', {
        'correo': real_email,
        'codigo': codigo_real
    }, format='json')
    res_verify = VerificarCodigoView.as_view()(req_verify)
    assert res_verify.status_code == 200
    assert 'access_token' in res_verify.data

    user_obj.refresh_from_db()
    assert user_obj.correo_verificado is True
    print("  -> OK: Cuenta verificada exitosamente tras ingresar el código OTP recibido.")

    print("\n=================================================================")
    print(">>> TODAS LAS PRUEBAS DE CORREOS Y OTP PASARON AL 100% CON ÉXITO <<<")
    print("=================================================================")

if __name__ == '__main__':
    test_validacion_correos_y_otp()
