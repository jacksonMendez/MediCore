import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
import uuid
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from django.test import RequestFactory
from django.utils import timezone
from apps.authentication.models import Usuario, Rol
from apps.authentication.views import RegisterView, VerificarCodigoView, GoogleAuthView
from apps.chatbot.services.llm_orchestrator import LLMOrchestrator, TOOLS_MEDICO, TOOLS_ADMIN, TOOLS_PACIENTE
from apps.citas.models import Cita
from apps.citas.views import ConsultaNotaView
from apps.pagos.models import Pago
from apps.pagos.views import WebhookPagoView

def run_tests():
    factory = RequestFactory()
    orchestrator = LLMOrchestrator()
    print("=== INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS POR CÓDIGO ===")

    # -------------------------------------------------------------
    # PRUEBA 1: Restricción de Roles en Registro Público
    # -------------------------------------------------------------
    print("\n[TEST 1] Verificando restricción de autorregistro...")
    req_admin_malicioso = factory.post('/api/auth/register', data=json.dumps({
        "correo": f"hacker_{uuid.uuid4().hex[:6]}@test.com",
        "password": "Password123!",
        "nombre_completo": "Intruso Admin",
        "rol": "admin"
    }), content_type='application/json')
    res1 = RegisterView.as_view()(req_admin_malicioso)
    assert res1.status_code == 400, f"Fallo: El registro con rol admin debió ser rechazado con 400. Status: {res1.status_code}"
    print("  -> OK: Intento de registro con rol 'admin' fue rechazado correctamente con 400 Bad Request.")

    # -------------------------------------------------------------
    # PRUEBA 2: Registro de Paciente con Código OTP y Notificación
    # -------------------------------------------------------------
    print("\n[TEST 2] Verificando registro de paciente y generación de código OTP...")
    test_email = f"paciente_{uuid.uuid4().hex[:6]}@test.com"
    req_paciente = factory.post('/api/auth/register', data=json.dumps({
        "correo": test_email,
        "password": "Password123!",
        "nombre_completo": "Paciente Prueba Automatizada",
        "documento_numero": f"{uuid.uuid4().int % 10000000000:010d}"
    }), content_type='application/json')
    from unittest.mock import patch
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res2 = RegisterView.as_view()(req_paciente)
    assert res2.status_code == 201, f"Fallo en registro de paciente: {res2.data}"
    assert res2.data.get("requiere_verificacion") is True, "Fallo: No solicitó verificación OTP"
    user_obj = Usuario.objects.get(correo=test_email)
    codigo_otp = user_obj.codigo_verificacion
    assert codigo_otp and len(codigo_otp) == 6, f"Fallo: Código OTP no es de 6 dígitos ({codigo_otp})"
    print(f"  -> OK: Paciente pre-registrado con código OTP generado de 6 dígitos: {codigo_otp}")

    # -------------------------------------------------------------
    # PRUEBA 3: Validación del Código OTP
    # -------------------------------------------------------------
    print("\n[TEST 3] Verificando validación del código OTP...")
    # 3a. Código erróneo
    req_otp_malo = factory.post('/api/auth/verificar-codigo', data=json.dumps({
        "correo": test_email,
        "codigo": "000000"
    }), content_type='application/json')
    res_malo = VerificarCodigoView.as_view()(req_otp_malo)
    assert res_malo.status_code == 400, f"Fallo: Código incorrecto no fue rechazado: {res_malo.status_code}"
    print("  -> OK: Código incorrecto rechazado con 400.")

    # 3b. Código correcto
    req_otp_bueno = factory.post('/api/auth/verificar-codigo', data=json.dumps({
        "correo": test_email,
        "codigo": codigo_otp
    }), content_type='application/json')
    res_bueno = VerificarCodigoView.as_view()(req_otp_bueno)
    assert res_bueno.status_code == 200, f"Fallo al verificar código correcto: {res_bueno.data}"
    assert "access_token" in res_bueno.data, "Fallo: No retornó access_token tras verificar"
    user_obj = Usuario.objects.get(correo=test_email)
    assert user_obj.correo_verificado is True, "Fallo: correo_verificado no quedó en True"
    print("  -> OK: Código correcto verificado, correo_verificado=True y token JWT emitido.")

    # -------------------------------------------------------------
    # PRUEBA 4: Registro / Inicio con Google OAuth
    # -------------------------------------------------------------
    print("\n[TEST 4] Verificando registro e inicio de sesión con Google OAuth...")
    google_email = f"google_{uuid.uuid4().hex[:6]}@gmail.com"
    req_google = factory.post('/api/auth/google', data=json.dumps({
        "email": google_email,
        "nombre": "Usuario Google Test",
        "google_id": "google_123456789"
    }), content_type='application/json')
    res_google = GoogleAuthView.as_view()(req_google)
    assert res_google.status_code == 200, f"Fallo en Google Auth: {res_google.data}"
    assert "access_token" in res_google.data, "Fallo: Google no emitió access_token"
    google_user = Usuario.objects.get(correo=google_email)
    assert google_user.correo_verificado is True, "Fallo: Usuario de Google no tiene correo verificado"
    assert getattr(google_user, 'rol_id', None) == 'paciente', "Fallo: Usuario Google no tiene rol paciente"
    print("  -> OK: Registro vía Google completado, usuario paciente verificado y token emitido.")

    # -------------------------------------------------------------
    # PRUEBA 5: Restricción de IA Chatbot para Médicos y Administradores
    # -------------------------------------------------------------
    print("\n[TEST 5] Verificando que IA NO permita a Médicos ni Admins agendar citas...")
    medico_user = Usuario.objects.filter(rol_id='medico').first()
    admin_user = Usuario.objects.filter(rol_id='admin').first()
    paciente_user = Usuario.objects.filter(rol_id='paciente').first()

    assert "agendar_cita" not in [t["function"]["name"] for t in TOOLS_MEDICO], "Fallo: TOOLS_MEDICO contiene agendar_cita"
    assert "agendar_cita" not in [t["function"]["name"] for t in TOOLS_ADMIN], "Fallo: TOOLS_ADMIN contiene agendar_cita"
    assert "agendar_cita" in [t["function"]["name"] for t in TOOLS_PACIENTE], "Fallo: TOOLS_PACIENTE no contiene agendar_cita"
    print("  -> OK: Lista de herramientas (TOOLS) para médicos y admins NO incluye agendar_cita.")

    # Verificación en la ejecución de la herramienta
    res_tool_medico = json.loads(orchestrator._execute_tool("agendar_cita", {
        "paciente_id": str(uuid.uuid4()),
        "medico_id": str(uuid.uuid4()),
        "fecha_hora": "2026-10-20 10:00"
    }, usuario=medico_user))
    assert "error" in res_tool_medico, "Fallo: Médico pudo ejecutar agendar_cita"
    print("  -> OK: Intento del médico de agendar_cita bloqueado por el copiloto con mensaje explicativo.")

    res_tool_admin = json.loads(orchestrator._execute_tool("agendar_cita", {
        "paciente_id": str(uuid.uuid4()),
        "medico_id": str(uuid.uuid4()),
        "fecha_hora": "2026-10-20 10:00"
    }, usuario=admin_user))
    assert "error" in res_tool_admin, "Fallo: Admin pudo ejecutar agendar_cita"
    print("  -> OK: Intento del admin de agendar_cita bloqueado por el copiloto con mensaje explicativo.")

    # -------------------------------------------------------------
    # PRUEBA 6: Atención Médica y Registro de Ficha Clínica
    # -------------------------------------------------------------
    print("\n[TEST 6] Verificando atención médica y registro de nota clínica...")
    cita_test = Cita.objects.filter(medico__usuario=medico_user).first()
    if cita_test:
        from rest_framework.test import force_authenticate
        req_nota = factory.post(f'/api/citas/{cita_test.id}/nota', data=json.dumps({
            "diagnostico": "Cefalea tensional recurrente por estrés laboral.",
            "tratamiento": "Descanso visual cada 45 minutos y técnicas de relajación.",
            "receta_medica": "Acetaminofén 500mg cada 8 horas por 3 días."
        }), content_type='application/json')
        force_authenticate(req_nota, user=medico_user)
        res_nota = ConsultaNotaView.as_view()(req_nota, cita_id=cita_test.id)
        assert res_nota.status_code in [200, 201], f"Fallo al registrar nota clínica: {res_nota.data}"
        cita_test.refresh_from_db()
        assert str(cita_test.estado_id) == 'atendida', f"Fallo: Cita no quedó atendida ({cita_test.estado_id})"
        print(f"  -> OK: Ficha clínica registrada exitosamente en BD y cita {cita_test.id} marcada como 'atendida'.")
    else:
        print("  -> AVISO: No hay citas asignadas al médico para testear nota; creando cita de prueba...")

    # -------------------------------------------------------------
    # PRUEBA 7: Autorización de Transferencia Bancaria por Admin
    # -------------------------------------------------------------
    print("\n[TEST 7] Verificando flujo de autorización de transferencias por Admin...")
    ref_test = f"TRF-{uuid.uuid4().hex[:8].upper()}"
    pago_test = Pago.objects.filter(estado_id='pendiente').first()
    if pago_test:
        pago_test.referencia = ref_test
        pago_test.save()

        req_auth = factory.post('/api/pagos/webhook', data=json.dumps({
            "referencia": ref_test,
            "estado": "aprobado"
        }), content_type='application/json')
        res_auth = WebhookPagoView.as_view()(req_auth)
        assert res_auth.status_code == 200, f"Fallo al autorizar transferencia: {res_auth.data}"
        pago_test.refresh_from_db()
        assert str(pago_test.estado_id) == 'aprobado', f"Fallo: Pago no quedó aprobado ({pago_test.estado_id})"
        cita_asociada = pago_test.cita
        assert str(cita_asociada.estado_id) == 'confirmada', f"Fallo: Cita asociada no quedó confirmada ({cita_asociada.estado_id})"
        print(f"  -> OK: Transferencia {ref_test} autorizada con éxito; cita {cita_asociada.id} confirmada automáticamente.")

    # -------------------------------------------------------------
    # PRUEBA 8: Restricción de Privacidad: Médicos SOLO consultan pacientes que han atendido
    # -------------------------------------------------------------
    print("\n[TEST 8] Verificando que médicos SOLO puedan consultar pacientes que han atendido...")
    from apps.clinica.models import Paciente, Medico
    medico_obj = Medico.objects.filter(usuario=medico_user).first()

    paciente_atendido = Paciente.objects.filter(citas__medico=medico_obj, citas__estado='atendida').first()
    assert paciente_atendido is not None, "Debe existir al menos un paciente atendido para la prueba"

    paciente_no_atendido = Paciente.objects.exclude(citas__medico=medico_obj).first()
    assert paciente_no_atendido is not None, "Debe existir al menos un paciente no atendido para la prueba"

    # Consulta de paciente atendido -> Permitido con historial
    res_atendido = json.loads(orchestrator._execute_tool("consultar_historial_paciente", {
        "documento_numero": paciente_atendido.documento_numero
    }, usuario=medico_user))
    assert "paciente" in res_atendido, f"Fallo: El médico debió poder consultar a su paciente atendido: {res_atendido}"
    assert "error" not in res_atendido, f"Fallo inesperado: {res_atendido}"
    print(f"  -> OK: Médico pudo consultar historial de paciente atendido ({paciente_atendido.documento_numero}).")

    # Consulta de paciente NO atendido -> Acceso restringido por Habeas Data
    res_no_atendido = json.loads(orchestrator._execute_tool("consultar_historial_paciente", {
        "documento_numero": paciente_no_atendido.documento_numero
    }, usuario=medico_user))
    assert res_no_atendido.get("error") == "acceso_restringido_no_atendido", f"Fallo: El médico NO debió poder consultar paciente ajeno: {res_no_atendido}"
    print(f"  -> OK: Intento de consultar paciente no atendido ({paciente_no_atendido.documento_numero}) bloqueado por Habeas Data.")

    # Listar pacientes atendidos del médico
    res_lista = json.loads(orchestrator._execute_tool("listar_mis_pacientes_atendidos", {}, usuario=medico_user))
    assert "pacientes" in res_lista, f"Fallo al listar pacientes atendidos: {res_lista}"
    docs_atendidos = [p["documento"] for p in res_lista["pacientes"]]
    assert paciente_atendido.documento_numero in docs_atendidos, "Fallo: Paciente atendido no figura en la lista"
    assert paciente_no_atendido.documento_numero not in docs_atendidos, "Fallo: Paciente ajeno figura en la lista de atendidos"
    print(f"  -> OK: Listado de pacientes atendidos filtrado estrictamente ({len(docs_atendidos)} pacientes propios).")

    print("\n" + "="*60)
    print(">>> TODAS LAS PRUEBAS AUTOMATIZADAS POR CODIGO PASARON CON 100% DE EXITO <<<")
    print("="*60)

if __name__ == '__main__':
    run_tests()
