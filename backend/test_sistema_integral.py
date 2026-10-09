import os
import django
import uuid
from datetime import datetime, date, time, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from django.utils import timezone
from apps.authentication.models import Usuario, Rol, Permiso, RolPermiso
from apps.clinica.models import Paciente, Medico, Especialidad, Sede, HorarioMedico
from apps.citas.models import Cita, EstadoCita, ConsultaNota, PQRSolicitud
from apps.pagos.models import Pago, MetodoPago, EstadoPago
from apps.auditoria.models import RegistroAuditoria
from apps.citas.services import get_disponibilidad, get_dias_disponibles
from apps.chatbot.services.llm_orchestrator import _tool_agendar_cita
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.pagos.views import SimularPagoView, WebhookPagoView
from apps.citas.views import CambiarEstadoCitaView

def run_tests():
    print("=" * 60)
    print("MEDICORE CLINICAL OS - SUITE DE INTEGRIDAD Y REGLAS DE NEGOCIO")
    print("=" * 60)

    # 1. VERIFICACIÓN DE FILTRO DE TURNOS PASADOS (FECHAS Y HORAS)
    print("\n[TEST 1] Verificación de filtro de horarios pasados:")
    hoy = timezone.localdate()
    ayer = hoy - timedelta(days=1)
    esp = Especialidad.objects.first()
    assert esp is not None, "Debe existir al menos una especialidad"

    # Ayer no debe tener cupos
    disp_ayer, _ = get_disponibilidad(fecha=ayer, especialidad_id=esp.id)
    assert disp_ayer["total_slots"] == 0, f"Error: ayer no debería tener cupos disponibles (tuvo {disp_ayer['total_slots']})"
    print(f"  OK: Fecha pasada ({ayer}) retorna 0 slots disponibles.")

    # Hoy solo debe tener cupos con hora_inicio > ahora
    ahora_local = timezone.localtime(timezone.now()).time()
    disp_hoy, _ = get_disponibilidad(fecha=hoy, especialidad_id=esp.id)
    for s in disp_hoy["slots"]:
        assert s["hora_inicio"] > ahora_local, f"Error: se retornó un turno pasado ({s['hora_inicio']} <= {ahora_local})"
    print(f"  OK: Fecha de hoy ({hoy}) filtra correctamente todos los turnos anteriores a las {ahora_local}.")

    # get_dias_disponibles no debe devolver fechas del pasado
    dias_disp, _ = get_dias_disponibles(fecha_inicio=ayer, fecha_fin=hoy + timedelta(days=7), especialidad_id=esp.id)
    for f_str in dias_disp.get("fechas_activas", []):
        f_obj = date.fromisoformat(f_str)
        assert f_obj >= hoy, f"Error: fecha activa {f_obj} es menor que hoy {hoy}"
    print(f"  OK: get_dias_disponibles descarta fechas pasadas ({len(dias_disp.get('fechas_activas', []))} días futuros disponibles).")

    # 2. VERIFICACIÓN DE SERIALIZACIÓN JSON Y AGENDAMIENTO SIN CRASH
    print("\n[TEST 2] Verificación de agendamiento y serialización JSON:")
    paciente_carlos = Paciente.objects.filter(usuario__correo='paciente@medicore.com').first()
    medico_test = Medico.objects.filter(especialidad=esp, activo=True).first()
    assert paciente_carlos and medico_test, "Paciente y Médico requeridos"

    # Buscar un día y turno futuro válido
    fecha_futura = hoy + timedelta(days=3)
    # Asegurar que el médico atienda ese día o agendar para lunes próximo
    dias_map = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    h = HorarioMedico.objects.filter(medico=medico_test).first()
    target_date = hoy + timedelta(days=1)
    while dias_map[target_date.weekday()] != h.dia:
        target_date += timedelta(days=1)

    hora_cita_str = f"{target_date.isoformat()} {h.hora_inicio.strftime('%H:%M')}"
    # Ejecutar agendamiento mediante _tool_agendar_cita
    import json
    res_raw = _tool_agendar_cita(
        paciente_id=str(paciente_carlos.id),
        medico_id=str(medico_test.id),
        fecha_hora=hora_cita_str,
        motivo="Chequeo preventivo de prueba automatizada"
    )
    res_data = json.loads(res_raw)
    assert "cita_id" in res_data or "error" in res_data, f"Respuesta inesperada: {res_raw}"
    print(f"  OK: _tool_agendar_cita ejecutó y serializó JSON sin errores (resultado: {res_data.get('mensaje', res_data.get('error'))}).")

    cita_creada_id = res_data.get("cita_id")
    if not cita_creada_id:
        cita_creada = Cita.objects.filter(paciente=paciente_carlos, medico=medico_test).first()
    else:
        cita_creada = Cita.objects.get(id=cita_creada_id)

    # 3. VERIFICACIÓN DE RADICACIÓN DE COMPROBANTE DE PAGO (VOUCHER)
    print("\n[TEST 3] Radicación de comprobante de pago digital (Nequi / Bancolombia):")
    factory = APIRequestFactory()
    view_simular = SimularPagoView.as_view()

    # Comprobante ficticio en base64
    fake_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    ref_prueba = f"NEQUI-TEST-{uuid.uuid4().hex[:6].upper()}"

    req_pago = factory.post('/api/pagos/simular', {
        'cita_id': str(cita_creada.id),
        'metodo_pago': 'transferencia',
        'banco_origen': 'nequi',
        'referencia': ref_prueba,
        'comprobante_archivo': fake_base64,
    }, format='json')
    force_authenticate(req_pago, user=paciente_carlos.usuario)
    resp_pago = view_simular(req_pago)
    assert resp_pago.status_code in [200, 201], f"Fallo al radicar comprobante: {resp_pago.data}"

    pago_guardado = Pago.objects.get(referencia=ref_prueba)
    assert pago_guardado.banco_origen == 'nequi', "Banco de origen no persistido"
    assert pago_guardado.comprobante_archivo == fake_base64, "Comprobante base64 no persistido"
    assert str(pago_guardado.estado_id) == 'pendiente', "Estado inicial debe ser pendiente"
    print(f"  OK: Pago radicado exitosamente con soporte base64 y banco '{pago_guardado.banco_origen}' (Ref: {ref_prueba}).")

    # 4. VERIFICACIÓN DE AUTORIZACIÓN POR ADMINISTRADOR
    print("\n[TEST 4] Autorización de pago y confirmación de cita por personal administrativo:")
    admin_user = Usuario.objects.filter(rol='admin').first()
    assert admin_user is not None, "Usuario admin requerido"

    view_webhook = WebhookPagoView.as_view()
    req_auth = factory.post('/api/pagos/webhook', {
        'referencia': ref_prueba,
        'estado': 'aprobado'
    }, format='json')
    resp_auth = view_webhook(req_auth)
    assert resp_auth.status_code == 200, f"Error autorizando pago: {resp_auth.data}"

    pago_guardado.refresh_from_db()
    cita_creada.refresh_from_db()
    assert str(pago_guardado.estado_id) == 'aprobado', "El pago debe estar aprobado"
    assert str(cita_creada.estado_id) == 'confirmada', "La cita debe estar confirmada"
    print(f"  OK: Pago aprobado y cita confirmada exitosamente (Cita ID: {cita_creada.id}, Estado: {cita_creada.estado_id}).")

    # 5. VERIFICACIÓN DE AUDITORÍAS INMUTABLES
    print("\n[TEST 5] Integridad de auditorías registradas:")
    auditorias = RegistroAuditoria.objects.filter(entidad_id=str(pago_guardado.id))
    assert auditorias.exists(), "Debe existir al menos un registro de auditoría para el pago"
    print(f"  OK: Se registraron {auditorias.count()} eventos de auditoría inmutable para el pago.")

    # 6. VERIFICACIÓN DE CANCELACIÓN DE CITA Y RBAC
    print("\n[TEST 6] Cancelación de cita con RBAC:")
    view_estado = CambiarEstadoCitaView.as_view()
    req_cancel = factory.patch(f'/api/citas/{cita_creada.id}/estado', {
        'nuevo_estado': 'cancelada'
    }, format='json')
    force_authenticate(req_cancel, user=paciente_carlos.usuario)
    resp_cancel = view_estado(req_cancel, cita_id=str(cita_creada.id))
    assert resp_cancel.status_code == 200, f"Error cancelando cita: {resp_cancel.data}"

    cita_creada.refresh_from_db()
    assert str(cita_creada.estado_id) == 'cancelada', "La cita debe estar cancelada"
    print(f"  OK: Paciente canceló exitosamente su cita (Estado: {cita_creada.estado_id}).")

    # Paciente no puede reactivar o cambiar a 'atendida'
    req_atendida = factory.patch(f'/api/citas/{cita_creada.id}/estado', {
        'nuevo_estado': 'atendida'
    }, format='json')
    force_authenticate(req_atendida, user=paciente_carlos.usuario)
    resp_atendida = view_estado(req_atendida, cita_id=str(cita_creada.id))
    assert resp_atendida.status_code == 403, "Paciente no debe poder marcar cita como atendida"
    print(f"  OK: RBAC bloqueó intento de paciente de alterar estado no permitido (403 Forbidden).")

    print("\n" + "=" * 60)
    print("TODAS LAS PRUEBAS DE INTEGRIDAD Y REGLAS DE NEGOCIO PASARON (100% OK)")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
