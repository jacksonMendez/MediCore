import os
import sys
import json
from datetime import datetime, date, timedelta, time

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')

import django
django.setup()

from apps.authentication.models import Usuario
from apps.clinica.models import Medico, Paciente, HorarioMedico
from apps.citas.models import Cita
from apps.citas.services import get_disponibilidad
from apps.chatbot.services.llm_orchestrator import _tool_agendar_cita, _tool_consultar_disponibilidad, _tool_cancelar_cita

def run_test():
    print("=" * 75)
    print("TEST DE INTEGRIDAD: EXCLUSIÓN DE HORARIOS OCUPADOS Y PREVENCIÓN DE COLISIÓN")
    print("=" * 75)

    # 1. Configurar médico y fecha de prueba
    medico = Medico.objects.filter(usuario__correo='medico@medicore.com').first()
    assert medico is not None, "Médico no encontrado"

    # Paciente 1 y Paciente 2
    u_pac1 = Usuario.objects.filter(correo='paciente@medicore.com').first()
    pac1 = Paciente.objects.filter(usuario=u_pac1).first()

    # Buscar o crear Paciente 2
    u_pac2 = Usuario.objects.filter(correo='paciente_test_colision@medicore.com').first()
    if not u_pac2:
        u_pac2 = Usuario.objects.create(
            correo='paciente_test_colision@medicore.com',
            nombre_completo='Paciente Prueba Dos',
            rol_id='paciente',
            correo_verificado=True
        )
        pac2 = Paciente.objects.create(usuario=u_pac2, documento_numero='999888777')
    else:
        pac2 = Paciente.objects.filter(usuario=u_pac2).first()

    # Fecha lunes próxima
    hoy = date.today()
    dias_hasta_lunes = (0 - hoy.weekday()) % 7
    if dias_hasta_lunes == 0:
        dias_hasta_lunes = 7
    fecha_test = hoy + timedelta(days=dias_hasta_lunes)
    fecha_str = fecha_test.strftime("%Y-%m-%d")

    # Asegurar que el médico tiene horario lunes 08:00 a 12:00
    HorarioMedico.objects.filter(medico=medico, dia='lunes').delete()
    HorarioMedico.objects.create(
        medico=medico,
        dia='lunes',
        hora_inicio=time(8, 0),
        hora_fin=time(12, 0)
    )

    # Limpiar cualquier cita previa de prueba en esa fecha
    Cita.objects.filter(medico=medico, fecha_hora__date=fecha_test).delete()

    # 2. Paso 1: Consultar disponibilidad inicial (todos los turnos deben estar libres)
    print(f"\n[Paso 1] Consultando disponibilidad inicial para el {fecha_str}...")
    disp_ini, _ = get_disponibilidad(fecha=fecha_test, especialidad_id=medico.especialidad_id)
    slots_ini = [s['hora_inicio'].strftime("%H:%M") for s in disp_ini['slots'] if str(s['medico_id']) == str(medico.id)]
    print(f"  Turnos inicialmente libres ({len(slots_ini)}): {slots_ini}")
    assert "08:00" in slots_ini, "El turno 08:00 debería estar libre al inicio"

    # 3. Paso 2: Paciente 1 agenda el turno de las 08:00
    print("\n[Paso 2] Paciente 1 agendando turno '08:00'...")
    raw_res = _tool_agendar_cita(
        paciente_id=str(pac1.id),
        medico_id=str(medico.id),
        fecha_hora=f"{fecha_str} 08:00",
        motivo="Control médico general"
    )
    res_book = json.loads(raw_res)
    assert "cita_id" in res_book, f"Error al agendar cita: {res_book}"
    cita_id = res_book["cita_id"]
    print(f"  ✅ Cita agendada con éxito para Paciente 1: ID {cita_id} en estado 'pendiente_pago'.")

    # 4. Paso 3: Consultar disponibilidad nuevamente
    print("\n[Paso 3] Verificando que '08:00' DESAPARECIÓ de la oferta de horarios disponibles...")
    disp_despues, _ = get_disponibilidad(fecha=fecha_test, especialidad_id=medico.especialidad_id)
    slots_despues = [s['hora_inicio'].strftime("%H:%M") for s in disp_despues['slots'] if str(s['medico_id']) == str(medico.id)]
    print(f"  Turnos disponibles ahora ({len(slots_despues)}): {slots_despues}")

    # Aserción crítica: 08:00 NO DEBE APARECER
    assert "08:00" not in slots_despues, "¡ERROR CRÍTICO! El horario 08:00 sigue apareciendo como disponible tras haber sido reservado."
    print("  ✅ ÉXITO: El horario '08:00' fue excluido correctamente y ya no se ofrece a nadie.")

    # 5. Paso 4: Paciente 2 intenta agendar forzosamente el turno ocupado '08:00'
    print("\n[Paso 4] Paciente 2 intenta agendar a las '08:00' (horario ya ocupado)...")
    raw_intento = _tool_agendar_cita(
        paciente_id=str(pac2.id),
        medico_id=str(medico.id),
        fecha_hora=f"{fecha_str} 08:00",
        motivo="Consulta prioritaria"
    )
    res_intento = json.loads(raw_intento)
    print(f"  Respuesta del sistema ante intento de colisión:\n  -> {res_intento.get('error')}")
    assert "error" in res_intento, "¡ERROR! El sistema permitió doble reserva sobre un turno ocupado."
    assert "no está disponible" in res_intento.get("error", "").lower() or "ya tiene una cita" in res_intento.get("error", "").lower()
    print("  ✅ ÉXITO: El sistema rechazó la solicitud y protegió la agenda contra colisiones.")

    # 6. Paso 5: Paciente 1 cancela su cita -> el turno 08:00 debe liberarse automáticamente
    print("\n[Paso 5] Paciente 1 cancela su cita -> Validar que el turno se libera...")
    _tool_cancelar_cita(cita_id=cita_id)
    disp_liberado, _ = get_disponibilidad(fecha=fecha_test, especialidad_id=medico.especialidad_id)
    slots_liberados = [s['hora_inicio'].strftime("%H:%M") for s in disp_liberado['slots'] if str(s['medico_id']) == str(medico.id)]
    print(f"  Turnos tras cancelación ({len(slots_liberados)}): {slots_liberados}")
    assert "08:00" in slots_liberados, "El horario 08:00 debería volver a estar disponible tras la cancelación."
    print("  ✅ ÉXITO: El turno '08:00' volvió a quedar disponible tras la cancelación.")

    print("\n" + "=" * 75)
    print(">>> TEST DE NO-COLISIÓN Y FILTRADO DE HORARIOS SUPERADO (100% OK) <<<")
    print("=" * 75)

if __name__ == '__main__':
    run_test()
