import os
import sys
import uuid
from datetime import date, datetime, timedelta
from django.utils import timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')

import django
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import patch

from apps.authentication.models import Usuario, Rol
from apps.authentication.views import RegisterView, LoginView, VerificarCodigoView
from apps.clinica.models import Sede, Especialidad, Medico, HorarioMedico, Paciente
from apps.clinica.views import SedeListCreateView, SedeDetailView, EspecialidadListCreateView, EspecialidadDetailView, MedicoListCreateView, MedicoDetailView
from apps.citas.models import Cita, ConsultaNota
from apps.citas.views import CitaCreateView, MisCitasView, CambiarEstadoCitaView, ConsultaNotaView
from apps.citas.services import get_disponibilidad, get_dias_disponibles
from apps.pagos.models import Pago, MetodoPago, EstadoPago
from apps.pagos.views import SimularPagoView, WebhookPagoView, MisPagosView
from apps.chatbot.models import SesionChat, MensajeChat
from apps.chatbot.views import MensajesSesionView
from apps.chatbot.services.llm_orchestrator import LLMOrchestrator, SYSTEM_PROMPT_MEDICO, SYSTEM_PROMPT_ADMIN, SYSTEM_PROMPT_PACIENTE

def run_integral_verification():
    print("=" * 75)
    print(">>> VERIFICACIÓN INTEGRAL DEL SISTEMA MEDICORE OS (PRUEBAS EXHAUSTIVAS) <<<")
    print("=" * 75)
    factory = APIRequestFactory()

    # -------------------------------------------------------------------------
    # PILAR 1: Autenticación, Registro Seguro, Filtros de Correo y OTP
    # -------------------------------------------------------------------------
    print("\n[PILAR 1] Probando Autenticación, Filtros de Correo y Flujo OTP...")

    # 1.1 Bloqueo de autoregistro con rol admin
    req_admin_fraud = factory.post('/api/auth/register', {
        'nombre_completo': 'Hacker Intruso',
        'correo': f'hacker_{uuid.uuid4().hex[:6]}@gmail.com',
        'password': 'Password123!',
        'rol': 'admin'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res1_1 = RegisterView.as_view()(req_admin_fraud)
    assert res1_1.status_code == 400, f"Error: Debería rechazar rol admin (HTTP {res1_1.status_code})"
    print("  -> OK 1.1: Autoregistro con rol 'admin' bloqueado exitosamente.")

    # 1.2 Bloqueo de correos desechables / temporales
    req_temp_email = factory.post('/api/auth/register', {
        'nombre_completo': 'Usuario Desechable',
        'correo': f'temp_{uuid.uuid4().hex[:6]}@mailinator.com',
        'password': 'Password123!',
        'rol': 'paciente'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res1_2 = RegisterView.as_view()(req_temp_email)
    assert res1_2.status_code == 400, "Error: Debería bloquear correo @mailinator.com"
    print("  -> OK 1.2: Correo desechable (@mailinator.com) rechazado exitosamente.")

    # 1.3 Bloqueo de formato de correo inválido
    req_bad_format = factory.post('/api/auth/register', {
        'nombre_completo': 'Usuario Invalido',
        'correo': 'correo_sin_dominio_valido',
        'password': 'Password123!',
        'rol': 'paciente'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res1_3 = RegisterView.as_view()(req_bad_format)
    assert res1_3.status_code == 400
    print("  -> OK 1.3: Correo con sintaxis mal formada rechazado con 400.")

    # 1.4 Registro legítimo de paciente
    test_correo = f"paciente_{uuid.uuid4().hex[:6]}@medicore-real.com"
    doc_num = f"{uuid.uuid4().int % 1000000000:09d}"
    req_reg_ok = factory.post('/api/auth/register', {
        'nombre_completo': 'Diana Carolina Mendez',
        'correo': test_correo,
        'password': 'Password123!',
        'rol': 'paciente',
        'documento_tipo': 'TI',
        'documento_numero': doc_num,
        'telefono': '+57 300 121 8658'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res1_4 = RegisterView.as_view()(req_reg_ok)
    assert res1_4.status_code == 201
    assert res1_4.data.get('requiere_verificacion') is True
    print(f"  -> OK 1.4: Paciente pre-registrado legítimamente con correo {test_correo}.")

    # 1.5 Intento de login previo a ingresar OTP: bloqueado con 403 y sin fuga de código
    req_login_unverified = factory.post('/api/auth/login', {
        'correo': test_correo,
        'password': 'Password123!'
    }, format='json')
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res1_5 = LoginView.as_view()(req_login_unverified)
    assert res1_5.status_code == 403
    assert res1_5.data.get('requiere_verificacion') is True
    assert 'codigo_demo' not in res1_5.data
    print("  -> OK 1.5: Login bloqueado (403) sin revelar código OTP.")

    # 1.6 Verificación de código OTP
    user_paciente = Usuario.objects.get(correo=test_correo)
    otp_code = user_paciente.codigo_verificacion
    assert otp_code and len(otp_code) == 6
    req_otp = factory.post('/api/auth/verificar-codigo', {
        'correo': test_correo,
        'codigo': otp_code
    }, format='json')
    res1_6 = VerificarCodigoView.as_view()(req_otp)
    assert res1_6.status_code == 200
    token_paciente = res1_6.data.get('access_token')
    assert token_paciente is not None
    user_paciente.refresh_from_db()
    assert user_paciente.correo_verificado is True
    print(f"  -> OK 1.6: Código OTP ({otp_code}) verificado. Cuenta activada y JWT emitido.")

    # -------------------------------------------------------------------------
    # PILAR 2: CRUD Administrativo (Sedes, Especialidades, Médicos y Turnos)
    # -------------------------------------------------------------------------
    print("\n[PILAR 2] Probando Gestión Administrativa (Sedes, Especialidades, Médicos)...")
    admin_user = Usuario.objects.filter(rol='admin').first()
    if not admin_user:
        admin_user = Usuario.objects.create_superuser(
            correo=f"admin_{uuid.uuid4().hex[:4]}@medicore.com",
            password="Password123!",
            nombre_completo="Administrador de Pruebas"
        )

    # 2.1 Crear Sede
    req_sede = factory.post('/api/clinica/sedes/', {
        'nombre': f'Sede Norte {uuid.uuid4().hex[:4]}',
        'direccion': 'Calle 127 # 15-40',
        'telefono': '601-555-1234',
        'activa': True
    }, format='json')
    force_authenticate(req_sede, user=admin_user)
    res2_1 = SedeListCreateView.as_view()(req_sede)
    assert res2_1.status_code == 201
    sede_id = res2_1.data['id']
    sede_obj = Sede.objects.get(id=sede_id)
    print(f"  -> OK 2.1: Sede creada '{sede_obj.nombre}'.")

    # 2.2 Crear Especialidad
    req_esp = factory.post('/api/clinica/especialidades/', {
        'nombre': f'Cardiología Integral {uuid.uuid4().hex[:4]}',
        'descripcion': 'Atención cardiovascular preventiva y diagnóstica',
        'precio_base': 95000.0
    }, format='json')
    force_authenticate(req_esp, user=admin_user)
    res2_2 = EspecialidadListCreateView.as_view()(req_esp)
    assert res2_2.status_code == 201
    esp_id = res2_2.data['id']
    esp_obj = Especialidad.objects.get(id=esp_id)
    print(f"  -> OK 2.2: Especialidad creada '{esp_obj.nombre}' ($95,000 COP).")

    # 2.3 Crear Médico con turnos automáticos
    medico_email = f"dr_cardio_{uuid.uuid4().hex[:4]}@medicore.com"
    req_medico = factory.post('/api/clinica/medicos/', {
        'nombre_completo': 'Dr. Carlos Mendoza',
        'correo': medico_email,
        'password': 'Password123!',
        'especialidad_id': str(esp_id),
        'sede_id': str(sede_id),
        'tarjeta_profesional': f"TP-CARDIO-{uuid.uuid4().hex[:4].upper()}",
        'duracion_cita_minutos': 30,
        'genero': 'M'
    }, format='json')
    force_authenticate(req_medico, user=admin_user)
    res2_3 = MedicoListCreateView.as_view()(req_medico)
    assert res2_3.status_code == 201
    medico_id = res2_3.data['id']
    medico_obj = Medico.objects.get(id=medico_id)
    horarios_count = HorarioMedico.objects.filter(medico=medico_obj).count()
    assert horarios_count == 5, f"Error: Deberían generarse 5 turnos (L-V), se generaron {horarios_count}"
    print(f"  -> OK 2.3: Médico 'Dr. Carlos Mendoza' registrado con {horarios_count} franjas automáticas.")

    # 2.4 Desactivar y reactivar médico
    req_patch_med = factory.patch(f'/api/clinica/medicos/{medico_id}/', {'activo': False}, format='json')
    force_authenticate(req_patch_med, user=admin_user)
    res2_4 = MedicoDetailView.as_view()(req_patch_med, medico_id=medico_id)
    assert res2_4.status_code == 200
    medico_obj.refresh_from_db()
    assert medico_obj.activo is False

    req_patch_med_on = factory.patch(f'/api/clinica/medicos/{medico_id}/', {'activo': True}, format='json')
    force_authenticate(req_patch_med_on, user=admin_user)
    res2_4_on = MedicoDetailView.as_view()(req_patch_med_on, medico_id=medico_id)
    assert res2_4_on.status_code == 200
    medico_obj.refresh_from_db()
    assert medico_obj.activo is True
    print("  -> OK 2.4: Ciclo de desactivación y reactivación médica verificado.")

    # -------------------------------------------------------------------------
    # PILAR 3: Pagos, Comprobantes de Transferencia, Aprobación y Rechazo
    # -------------------------------------------------------------------------
    print("\n[PILAR 3] Probando Agendamiento, Comprobantes y Flujo Financiero...")

    paciente_perfil = Paciente.objects.get(usuario=user_paciente)
    cita_fecha = timezone.now() + timedelta(days=2)
    cita_obj = Cita.objects.create(
        paciente=paciente_perfil,
        medico=medico_obj,
        sede=sede_obj,
        fecha_hora=cita_fecha,
        estado_id='pendiente_pago',
        motivo='Evaluación de arritmia'
    )
    assert str(cita_obj.estado_id) == 'pendiente_pago'

    # 3.1 Radicar comprobante de transferencia
    ref_transfer = f"NEQUI-TEST-{uuid.uuid4().hex[:6].upper()}"
    req_sim_pago = factory.post('/api/pagos/simular', {
        'cita_id': str(cita_obj.id),
        'referencia': ref_transfer,
        'banco_origen': 'nequi',
        'comprobante_archivo': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'metodo_pago': 'transferencia'
    }, format='json')
    force_authenticate(req_sim_pago, user=user_paciente)
    res3_1 = SimularPagoView.as_view()(req_sim_pago)
    assert res3_1.status_code in [200, 201]
    pago_db = Pago.objects.get(cita=cita_obj)
    assert pago_db.referencia == ref_transfer
    assert str(pago_db.estado_id) == 'pendiente'
    assert bool(pago_db.comprobante_archivo) is True
    print(f"  -> OK 3.1: Comprobante radicado ({ref_transfer}) en estado pendiente.")

    # 3.2 Rechazar transferencia (Admin)
    req_rechazar = factory.post('/api/pagos/webhook', {
        'referencia': ref_transfer,
        'estado': 'rechazado'
    }, format='json')
    res3_2 = WebhookPagoView.as_view()(req_rechazar)
    assert res3_2.status_code == 200
    pago_db.refresh_from_db()
    cita_obj.refresh_from_db()
    assert str(pago_db.estado_id) == 'rechazado'
    assert str(cita_obj.estado_id) == 'cancelada'
    print("  -> OK 3.2: Rechazo de pago sincroniza Pago a 'rechazado' y Cita a 'cancelada'.")

    # 3.3 Nueva cita y Aprobación de pago (Confirmación de Cita)
    cita_obj2 = Cita.objects.create(
        paciente=paciente_perfil,
        medico=medico_obj,
        sede=sede_obj,
        fecha_hora=cita_fecha + timedelta(hours=1),
        estado_id='pendiente_pago',
        motivo='Chequeo anual'
    )
    ref_aprob = f"DAVIPLATA-{uuid.uuid4().hex[:6].upper()}"
    req_pago2 = factory.post('/api/pagos/simular', {
        'cita_id': str(cita_obj2.id),
        'referencia': ref_aprob,
        'banco_origen': 'daviplata',
        'comprobante_archivo': 'data:image/png;base64,fake',
        'metodo_pago': 'transferencia'
    }, format='json')
    force_authenticate(req_pago2, user=user_paciente)
    SimularPagoView.as_view()(req_pago2)

    req_aprobar = factory.post('/api/pagos/webhook', {
        'referencia': ref_aprob,
        'estado': 'aprobado'
    }, format='json')
    res3_3 = WebhookPagoView.as_view()(req_aprobar)
    assert res3_3.status_code == 200
    pago2_db = Pago.objects.get(cita=cita_obj2)
    cita_obj2.refresh_from_db()
    assert str(pago2_db.estado_id) == 'aprobado'
    assert str(cita_obj2.estado_id) == 'confirmada'
    print("  -> OK 3.3: Aprobación de transferencia actualiza Pago a 'aprobado' y Cita a 'confirmada'.")

    # 3.4 Mis Pagos con paciente_nombre (sin N+1)
    req_mis_pagos = factory.get('/api/pagos/mis-pagos')
    force_authenticate(req_mis_pagos, user=admin_user)
    res3_4 = MisPagosView.as_view()(req_mis_pagos)
    assert res3_4.status_code == 200
    assert len(res3_4.data) > 0
    assert any(p['paciente_nombre'] == user_paciente.nombre_completo for p in res3_4.data)
    print("  -> OK 3.4: Listado de pagos consolidado con nombres de pacientes optimizado.")

    # -------------------------------------------------------------------------
    # PILAR 4: Consulta Clínica, Documentos Adjuntos y Expiración
    # -------------------------------------------------------------------------
    print("\n[PILAR 4] Probando Ficha Médica, Documentos y Bloqueo de Expiradas...")

    # 4.1 Doctor atiende cita confirmada y adjunta documento
    doctor_user = medico_obj.usuario
    req_nota = factory.post(f'/api/citas/{cita_obj2.id}/nota', {
        'diagnostico': 'I10 Hipertensión Esencial con ritmo sinusal regular',
        'tratamiento': 'Losartán 50mg cada 12 horas por 30 días',
        'receta_medica': 'Control de tensión diario en ayunas',
        'archivo_adjunto': 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,fakeDocx',
        'archivo_nombre': 'historia_clinica_mendoza.docx',
        'archivo_tipo': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, format='json')
    force_authenticate(req_nota, user=doctor_user)
    res4_1 = ConsultaNotaView.as_view()(req_nota, cita_id=str(cita_obj2.id))
    assert res4_1.status_code in [200, 201]
    cita_obj2.refresh_from_db()
    assert str(cita_obj2.estado_id) == 'atendida'
    print("  -> OK 4.1: Doctor atendió la cita, guardó diagnóstico y adjuntó archivo Word.")

    # 4.2 Paciente consulta su nota clínica
    req_get_nota = factory.get(f'/api/citas/{cita_obj2.id}/nota')
    force_authenticate(req_get_nota, user=user_paciente)
    res4_2 = ConsultaNotaView.as_view()(req_get_nota, cita_id=str(cita_obj2.id))
    assert res4_2.status_code == 200
    assert res4_2.data['diagnostico'].startswith('I10')
    assert res4_2.data['archivo_nombre'] == 'historia_clinica_mendoza.docx'
    print("  -> OK 4.2: Paciente visualiza su historia clínica y archivo adjunto.")

    # 4.3 Bloqueo de citas expiradas para atención médica
    cita_expirada = Cita.objects.create(
        paciente=paciente_perfil,
        medico=medico_obj,
        sede=sede_obj,
        fecha_hora=timezone.now() - timedelta(days=3),
        estado_id='confirmada',
        motivo='Cita antigua no atendida'
    )
    req_nota_expirada = factory.post(f'/api/citas/{cita_expirada.id}/nota', {
        'diagnostico': 'Intento extemporáneo'
    }, format='json')
    force_authenticate(req_nota_expirada, user=doctor_user)
    res4_3 = ConsultaNotaView.as_view()(req_nota_expirada, cita_id=str(cita_expirada.id))
    assert res4_3.status_code == 400
    assert "expiró" in res4_3.data['detail'].lower()
    print("  -> OK 4.3: El sistema bloqueó la atención médica para una cita con fecha/hora expirada.")

    # 4.4 Marcar cita expirada como 'no_asistio'
    req_no_asistio = factory.patch(f'/api/citas/{cita_expirada.id}/estado', {
        'nuevo_estado': 'no_asistio'
    }, format='json')
    force_authenticate(req_no_asistio, user=doctor_user)
    res4_4 = CambiarEstadoCitaView.as_view()(req_no_asistio, cita_id=str(cita_expirada.id))
    assert res4_4.status_code == 200
    cita_expirada.refresh_from_db()
    assert str(cita_expirada.estado_id) == 'no_asistio'
    print("  -> OK 4.4: Cita expirada actualizada correctamente a estado 'no_asistio'.")

    # -------------------------------------------------------------------------
    # PILAR 5: Chatbot, Copilotos y Eliminación de Sesiones
    # -------------------------------------------------------------------------
    print("\n[PILAR 5] Probando Chatbots Especializados y Eliminación (Basurita)...")

    # 5.1 Restricción de herramientas clínicas vs pacientes
    from apps.chatbot.services.llm_orchestrator import TOOLS_MEDICO, TOOLS_ADMIN, TOOLS_PACIENTE
    orchestrator = LLMOrchestrator()
    assert 'agendar_cita' not in [t['function']['name'] for t in TOOLS_MEDICO]
    assert 'agendar_cita' not in [t['function']['name'] for t in TOOLS_ADMIN]
    print("  -> OK 5.1: Herramienta 'agendar_cita' oculta para doctores y administradores.")

    assert 'agendar_cita' in [t['function']['name'] for t in TOOLS_PACIENTE]
    print("  -> OK 5.2: Herramienta 'agendar_cita' disponible exclusivamente para pacientes.")

    # 5.2 Herramientas del Administrador
    import json
    from apps.chatbot.services.llm_orchestrator import _tool_consultar_metricas_admin, _tool_consultar_pagos_pendientes_admin
    metricas = json.loads(_tool_consultar_metricas_admin())
    assert 'resumen_financiero' in metricas
    assert 'resumen_operativo_citas' in metricas
    assert 'infraestructura_clinica' in metricas
    print(f"  -> OK 5.3: Herramienta admin retornó balance real (Citas confirmadas: {metricas['resumen_operativo_citas'].get('citas_confirmadas', 0)}).")

    pagos_pendientes_audit = json.loads(_tool_consultar_pagos_pendientes_admin())
    assert 'total_pendientes' in pagos_pendientes_audit
    print(f"  -> OK 5.4: Herramienta de transferencias pendientes operativa ({pagos_pendientes_audit['total_pendientes']} por auditar).")

    # 5.3 Eliminación de sesión de chat (Botón de Basurita)
    sesion_chat = SesionChat.objects.create(
        usuario=user_paciente,
        rol_origen='paciente'
    )
    MensajeChat.objects.create(sesion=sesion_chat, emisor='usuario', contenido='Hola copiloto')
    MensajeChat.objects.create(sesion=sesion_chat, emisor='asistente', contenido='Hola Diana')

    req_del_sesion = factory.delete(f'/api/chat/sesiones/{sesion_chat.id}')
    force_authenticate(req_del_sesion, user=user_paciente)
    res5_5 = MensajesSesionView.as_view()(req_del_sesion, sesion_id=str(sesion_chat.id))
    assert res5_5.status_code == 204
    assert not SesionChat.objects.filter(id=sesion_chat.id).exists()
    print("  -> OK 5.5: Sesión de chat eliminada con éxito vía API (204 No Content).")

    # 5.4 Resiliencia de búsqueda de días disponibles (con fallback ORM)
    dias_res, err = get_dias_disponibles(date.today(), date.today() + timedelta(days=7), especialidad_id=str(esp_id))
    assert err is None
    assert 'dias_disponibles' in dias_res
    print(f"  -> OK 5.6: Consulta de disponibilidad médica ejecutada con éxito ({dias_res['total_dias_disponibles']} días con cupos).")

    print("\n" + "=" * 75)
    print(">>> VERIFICACIÓN INTEGRAL COMPLETADA CON ÉXITO: 0 ERRORES ENCONTRADOS <<<")
    print("=" * 75)

if __name__ == '__main__':
    run_integral_verification()
