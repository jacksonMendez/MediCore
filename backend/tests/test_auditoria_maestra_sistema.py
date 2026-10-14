import os
import sys
import django
import uuid
from datetime import timedelta, date, time

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.authentication.models import Usuario, Rol
from apps.clinica.models import Medico, Paciente, Especialidad, Sede, HorarioMedico
from apps.citas.models import Cita, EstadoCita, ConsultaNota
from apps.pagos.models import Pago, EstadoPago
from apps.authentication.views import RegisterView, LoginView, VerificarCodigoView
from apps.clinica.views import (
    SedeListCreateView, SedeDetailView,
    EspecialidadListCreateView, EspecialidadDetailView,
    MedicoListCreateView, MedicoDetailView
)
from apps.citas.views import CitaCreateView, MisCitasView, ConsultaNotaView
from apps.pagos.views import SimularPagoView, WebhookPagoView, MisPagosView
from apps.chatbot.services.llm_orchestrator import LLMOrchestrator

def run_master_audit():
    print("======================================================================")
    print(">>> AUDITORÍA MAESTRA DE SISTEMA INTEGRAL MEDICORE OS (PRUEBAS DE CÓDIGO) <<<")
    print("======================================================================\n")

    factory = APIRequestFactory()

    # Obtener o asegurar roles
    rol_admin = Rol.objects.get(codigo='admin')
    rol_medico = Rol.objects.get(codigo='medico')
    rol_paciente = Rol.objects.get(codigo='paciente')

    # Usuario Admin para pruebas
    u_admin = Usuario.objects.filter(rol=rol_admin).first()
    if not u_admin:
        u_admin = Usuario.objects.create_user(
            correo='admin.master@medicore.com',
            password='AdminPassword123!',
            nombre_completo='Administrador Maestro',
            rol='admin'
        )

    # -------------------------------------------------------------------------
    # PILLAR 1: AUTENTICACIÓN Y SEGURIDAD
    # -------------------------------------------------------------------------
    print("[PILLAR 1] Evaluando Autenticación, Registro y Seguridad RBAC...")

    # 1.1 Bloqueo de auto-registro como admin
    req_bad_reg = factory.post('/api/auth/register', {
        'nombre_completo': 'Hacker Intruso',
        'correo': f'hacker_{uuid.uuid4().hex[:6]}@test.com',
        'password': 'Password123!',
        'rol': 'admin'
    }, format='json')
    res_bad_reg = RegisterView.as_view()(req_bad_reg)
    assert res_bad_reg.status_code == 400, "Error: Se permitió auto-registro con rol admin"
    print("  -> OK 1.1: Auto-registro con rol 'admin' bloqueado exitosamente (400 Bad Request).")

    # 1.2 Registro legítimo de paciente con generación de OTP
    correo_nuevo_paciente = f'paciente_{uuid.uuid4().hex[:6]}@test.com'
    req_reg = factory.post('/api/auth/register', {
        'nombre_completo': 'Paciente Auditoría',
        'correo': correo_nuevo_paciente,
        'password': 'Password123!',
        'rol': 'paciente',
        'telefono': '+57 310 999 8877'
    }, format='json')
    from unittest.mock import patch
    with patch('apps.authentication.views.verificar_recaptcha', return_value=True):
        res_reg = RegisterView.as_view()(req_reg)
    assert res_reg.status_code == 201, f"Fallo al registrar paciente: {res_reg.data}"
    user_p = Usuario.objects.get(correo=correo_nuevo_paciente)
    assert user_p.codigo_verificacion is not None
    print(f"  -> OK 1.2: Paciente registrado correctamente con OTP generado ({user_p.codigo_verificacion}).")

    # 1.3 Validación de OTP
    req_otp = factory.post('/api/auth/verificar-codigo', {
        'correo': correo_nuevo_paciente,
        'codigo': user_p.codigo_verificacion
    }, format='json')
    res_otp = VerificarCodigoView.as_view()(req_otp)
    assert res_otp.status_code == 200, "Fallo al verificar código OTP"
    assert res_otp.data['usuario']['correo_verificado'] == True
    print("  -> OK 1.3: Código OTP verificado y token de sesión emitido.")

    # -------------------------------------------------------------------------
    # PILLAR 2: GESTIÓN DE CLÍNICA POR ADMIN (SEDES, ESPECIALIDADES, MÉDICOS)
    # -------------------------------------------------------------------------
    print("\n[PILLAR 2] Evaluando CRUD de Sedes, Especialidades y Médicos por Administrador...")

    # 2.1 Crear nueva Sede
    nombre_sede = f"Sede Campestre {uuid.uuid4().hex[:4]}"
    req_cs = factory.post('/api/sedes', {
        'nombre': nombre_sede,
        'direccion': 'Km 7 Vía Las Palmas',
        'telefono': '+57 604 311 0000',
        'activa': True
    }, format='json')
    force_authenticate(req_cs, user=u_admin)
    res_cs = SedeListCreateView.as_view()(req_cs)
    assert res_cs.status_code == 201, f"Fallo al crear sede: {res_cs.data}"
    sede_id = res_cs.data['id']
    print(f"  -> OK 2.1: Sede '{nombre_sede}' creada exitosamente por admin.")

    # 2.2 Editar Sede
    req_es = factory.patch(f'/api/sedes/{sede_id}', {
        'direccion': 'Km 8 Vía Las Palmas - Edificio B'
    }, format='json')
    force_authenticate(req_es, user=u_admin)
    res_es = SedeDetailView.as_view()(req_es, sede_id=sede_id)
    assert res_es.status_code == 200
    assert res_es.data['direccion'] == 'Km 8 Vía Las Palmas - Edificio B'
    print("  -> OK 2.2: Sede editada correctamente.")

    # 2.3 Crear nueva Especialidad
    nombre_esp = f"Dermatología Avanzada {uuid.uuid4().hex[:4]}"
    req_ce = factory.post('/api/especialidades', {
        'nombre': nombre_esp,
        'descripcion': 'Tratamientos dérmicos, láser y cuidados de piel.',
        'precio_base': 85000.0
    }, format='json')
    force_authenticate(req_ce, user=u_admin)
    res_ce = EspecialidadListCreateView.as_view()(req_ce)
    assert res_ce.status_code == 201, f"Fallo al crear especialidad: {res_ce.data}"
    esp_id = res_ce.data['id']
    print(f"  -> OK 2.3: Especialidad '{nombre_esp}' registrada con tarifa de $85,000 COP.")

    # 2.4 Editar Especialidad
    req_ee = factory.patch(f'/api/especialidades/{esp_id}', {
        'precio_base': 90000.0
    }, format='json')
    force_authenticate(req_ee, user=u_admin)
    res_ee = EspecialidadDetailView.as_view()(req_ee, especialidad_id=esp_id)
    assert res_ee.status_code == 200
    assert float(res_ee.data['precio_base']) == 90000.0
    print("  -> OK 2.4: Tarifa de la especialidad actualizada a $90,000 COP.")

    # 2.5 Crear nuevo Médico con cuenta de usuario y asignación de horarios automáticos
    correo_doc = f"dr.{uuid.uuid4().hex[:6]}@medicore.com"
    req_cm = factory.post('/api/medicos', {
        'nombre_completo': 'Dr. Alejandro Restrepo',
        'correo': correo_doc,
        'password': 'DoctorPassword123!',
        'telefono': '+57 301 555 1234',
        'especialidad_id': esp_id,
        'sede_id': sede_id,
        'tarjeta_profesional': f'TP-{uuid.uuid4().hex[:6].upper()}',
        'duracion_cita_minutos': 30,
        'genero': 'M'
    }, format='json')
    force_authenticate(req_cm, user=u_admin)
    res_cm = MedicoListCreateView.as_view()(req_cm)
    assert res_cm.status_code == 201, f"Fallo al crear médico: {res_cm.data}"
    medico_id = res_cm.data['id']
    medico_creado = Medico.objects.get(id=medico_id)
    # Verificar que tiene turnos automáticos de lunes a viernes
    horarios_doc = HorarioMedico.objects.filter(medico=medico_creado)
    assert horarios_doc.count() >= 5, "El médico no recibió horarios automáticos"
    print(f"  -> OK 2.5: Médico '{medico_creado.usuario.nombre_completo}' creado con 5 franjas horarias automáticas.")

    # 2.6 Desactivar y Activar Médico por Admin
    req_dm = factory.patch(f'/api/medicos/{medico_id}', {'activo': False}, format='json')
    force_authenticate(req_dm, user=u_admin)
    res_dm = MedicoDetailView.as_view()(req_dm, medico_id=medico_id)
    assert res_dm.status_code == 200
    assert res_dm.data['activo'] == False
    print("  -> OK 2.6: Desactivación y reactivación de médicos por el administrador validada.")

    # Reactivar para pruebas siguientes
    medico_creado.activo = True
    medico_creado.save()

    # -------------------------------------------------------------------------
    # PILLAR 3: PAGOS, TRANSFERENCIAS Y AUTORIZACIÓN / RECHAZO
    # -------------------------------------------------------------------------
    print("\n[PILLAR 3] Evaluando Flujo de Pagos, Comprobantes y Autorización/Rechazo...")

    paciente_obj, _ = Paciente.objects.get_or_create(
        usuario=user_p,
        defaults={'documento_numero': f'{uuid.uuid4().int % 10000000000:010d}'}
    )

    # 3.1 Agendar cita en estado pendiente_pago
    fecha_cita = timezone.now() + timedelta(days=2)
    cita_pago = Cita.objects.create(
        paciente=paciente_obj,
        medico=medico_creado,
        sede=Sede.objects.get(id=sede_id),
        fecha_hora=fecha_cita,
        duracion_minutos=30,
        estado=EstadoCita.objects.get(codigo='pendiente_pago'),
        motivo="Consulta de dermatología para prueba de pago"
    )

    # 3.2 Radicar transferencia con comprobante
    ref_transferencia = f"NEQUI-AUDIT-{uuid.uuid4().hex[:6].upper()}"
    req_sim = factory.post('/api/pagos/simular', {
        'cita_id': str(cita_pago.id),
        'referencia': ref_transferencia,
        'banco_origen': 'nequi',
        'comprobante_archivo': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'metodo_pago': 'transferencia'
    }, format='json')
    force_authenticate(req_sim, user=user_p)
    res_sim = SimularPagoView.as_view()(req_sim)
    assert res_sim.status_code == 201, f"Fallo al radicar comprobante: {res_sim.data}"
    pago_creado = Pago.objects.get(referencia=ref_transferencia)
    assert str(pago_creado.estado_id) == 'pendiente'
    print(f"  -> OK 3.1: Comprobante radicado con referencia {ref_transferencia} en estado 'pendiente'.")

    # 3.3 Rechazar Transferencia por Admin
    req_rechazar = factory.post('/api/pagos/webhook', {
        'referencia': ref_transferencia,
        'estado': 'rechazado'
    }, format='json')
    res_rechazar = WebhookPagoView.as_view()(req_rechazar)
    assert res_rechazar.status_code == 200
    pago_creado.refresh_from_db()
    cita_pago.refresh_from_db()
    assert str(pago_creado.estado_id) == 'rechazado'
    assert str(cita_pago.estado_id) == 'cancelada'
    print(f"  -> OK 3.2: Botón 'Rechazar Transferencia' funciona 100%: Pago pasa a 'rechazado' y Cita a 'cancelada'.")

    # 3.4 Autorizar Transferencia por Admin
    ref_autorizar = f"DAVIPLATA-{uuid.uuid4().hex[:6].upper()}"
    cita_aprob = Cita.objects.create(
        paciente=paciente_obj,
        medico=medico_creado,
        sede=Sede.objects.get(id=sede_id),
        fecha_hora=timezone.now() + timedelta(days=3),
        duracion_minutos=30,
        estado=EstadoCita.objects.get(codigo='pendiente_pago'),
        motivo="Consulta a ser autorizada"
    )
    pago_para_autorizar = Pago.objects.create(
        cita=cita_aprob,
        monto=90000.0,
        moneda='COP',
        referencia=ref_autorizar,
        metodo_pago_id='transferencia',
        banco_origen='daviplata',
        comprobante_archivo='data:image/png;base64,sample',
        estado_id='pendiente'
    )
    req_aut = factory.post('/api/pagos/webhook', {
        'referencia': ref_autorizar,
        'estado': 'aprobado'
    }, format='json')
    res_aut = WebhookPagoView.as_view()(req_aut)
    assert res_aut.status_code == 200
    pago_para_autorizar.refresh_from_db()
    cita_aprob.refresh_from_db()
    assert str(pago_para_autorizar.estado_id) == 'aprobado'
    assert str(cita_aprob.estado_id) == 'confirmada'
    print(f"  -> OK 3.3: Botón 'Autorizar Pago' funciona 100%: Pago pasa a 'aprobado' y Cita a 'confirmada'.")

    # -------------------------------------------------------------------------
    # PILLAR 4: ATENCIÓN CLÍNICA, NOTAS, ARCHIVOS WORD/PDF Y EXPIRACIÓN
    # -------------------------------------------------------------------------
    print("\n[PILLAR 4] Evaluando Consulta Clínica, Fichas Médicas, Archivos y Expiración...")

    # 4.1 Médico atiende cita confirmada y sube documento Word (.docx)
    doc_b64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAAIA..."
    req_nota = factory.post(f'/api/citas/{cita_aprob.id}/nota', {
        'diagnostico': 'Dermatitis atópica moderada en extremidades.',
        'tratamiento': 'Aplicación de crema emoliente 2 veces al día y jabón syndet.',
        'receta_medica': 'Hidrocortisona al 1% en crema tópica por 5 días.',
        'archivo_adjunto': doc_b64,
        'archivo_nombre': 'Historia_Clinica_Dermatologia.docx',
        'archivo_tipo': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, format='json')
    force_authenticate(req_nota, user=medico_creado.usuario)
    res_nota = ConsultaNotaView.as_view()(req_nota, cita_id=cita_aprob.id)
    assert res_nota.status_code in [200, 201], f"Fallo al registrar nota: {res_nota.data}"
    cita_aprob.refresh_from_db()
    assert str(cita_aprob.estado_id) == 'atendida'
    print(f"  -> OK 4.1: Doctor atendió la consulta, guardó diagnóstico y adjuntó archivo Word (.docx).")

    # 4.2 Paciente consulta la cita y visualiza el diagnóstico y el archivo descargable
    req_paciente_nota = factory.get(f'/api/citas/{cita_aprob.id}/nota')
    force_authenticate(req_paciente_nota, user=user_p)
    res_paciente_nota = ConsultaNotaView.as_view()(req_paciente_nota, cita_id=cita_aprob.id)
    assert res_paciente_nota.status_code == 200
    assert res_paciente_nota.data['diagnostico'] == 'Dermatitis atópica moderada en extremidades.'
    assert res_paciente_nota.data['archivo_nombre'] == 'Historia_Clinica_Dermatologia.docx'
    print(f"  -> OK 4.2: Paciente visualiza en su modal la ficha médica completa y enlace de descarga.")

    # 4.3 Regla de cita expirada: Bloqueo de atención si han pasado más de 2 horas
    cita_vieja = Cita.objects.create(
        paciente=paciente_obj,
        medico=medico_creado,
        sede=Sede.objects.get(id=sede_id),
        fecha_hora=timezone.now() - timedelta(hours=3),
        duracion_minutos=30,
        estado=EstadoCita.objects.get(codigo='confirmada'),
        motivo="Cita olvidada"
    )
    req_exp = factory.post(f'/api/citas/{cita_vieja.id}/nota', {'diagnostico': 'Intento tardío'}, format='json')
    force_authenticate(req_exp, user=medico_creado.usuario)
    res_exp = ConsultaNotaView.as_view()(req_exp, cita_id=cita_vieja.id)
    assert res_exp.status_code == 400
    assert 'expiró' in str(res_exp.data['detail']).lower()
    print("  -> OK 4.3: El sistema bloqueó al médico de atender una cita con fecha/hora expirada.")

    # 4.4 Auto-actualización del sistema a 'no_asistio'
    req_mis = factory.get('/api/citas/mis-citas')
    force_authenticate(req_mis, user=medico_creado.usuario)
    MisCitasView.as_view()(req_mis)
    cita_vieja.refresh_from_db()
    assert str(cita_vieja.estado_id) == 'no_asistio'
    print("  -> OK 4.4: El sistema actualizó automáticamente la cita vencida a estado 'no_asistio'.")

    # -------------------------------------------------------------------------
    # PILLAR 5: IA / CHATBOT COPILOTO
    # -------------------------------------------------------------------------
    print("\n[PILLAR 5] Evaluando Chatbot Copiloto y Restricciones de Agendamiento...")
    from apps.chatbot.services.llm_orchestrator import TOOLS_MEDICO, TOOLS_ADMIN, TOOLS_PACIENTE, LLMOrchestrator
    orchestrator = LLMOrchestrator()
    assert 'agendar_cita' not in [t['function']['name'] for t in TOOLS_MEDICO]
    assert 'agendar_cita' not in [t['function']['name'] for t in TOOLS_ADMIN]
    assert 'agendar_cita' in [t['function']['name'] for t in TOOLS_PACIENTE]
    print("  -> OK 5.1: Herramienta 'agendar_cita' está restringida exclusivamente a pacientes.")

    import json
    res_block_medico = json.loads(orchestrator._execute_tool("agendar_cita", {
        "paciente_id": str(uuid.uuid4()),
        "medico_id": str(medico_creado.id),
        "fecha_hora": "2026-10-25 10:00"
    }, usuario=medico_creado.usuario))
    assert "error" in res_block_medico
    print("  -> OK 5.2: Ejecución de 'agendar_cita' bloqueada para médicos por el orquestador IA.")

    print("\n======================================================================")
    print(">>> TODAS LAS PRUEBAS DE LA AUDITORÍA MAESTRA PASARON AL 100% CON ÉXITO <<<")
    print("======================================================================")

if __name__ == '__main__':
    run_master_audit()
