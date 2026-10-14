import os
import sys
import json
from datetime import datetime, date, timedelta

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')

import django
django.setup()

from apps.authentication.models import Usuario
from apps.clinica.models import Medico, HorarioMedico
from apps.auditoria.models import RegistroAuditoria
from apps.chatbot.services.llm_orchestrator import _tool_programar_horario_medico, _tool_consultar_mis_horarios
from apps.citas.services import get_disponibilidad

def run_test():
    print("=" * 70)
    print("PRUEBA AUTOMATIZADA: PROGRAMACIÓN DE AGENDA MÉDICA Y DISPONIBILIDAD")
    print("=" * 70)

    # 1. Obtener médico demo
    u_medico = Usuario.objects.filter(correo='medico@medicore.com').first()
    assert u_medico is not None, "Usuario medico@medicore.com no existe"
    medico = Medico.objects.filter(usuario=u_medico).first()
    assert medico is not None, "Perfil de médico no encontrado"

    print(f"Médico: {u_medico.nombre_completo} | Sede: {medico.sede.nombre if medico.sede else 'N/A'}")

    # 2. Ejecutar herramienta programar_horario_medico
    print("\n[Paso 1] Ejecutando _tool_programar_horario_medico...")
    res_raw = _tool_programar_horario_medico(
        dia="lunes",
        hora_inicio="08:00",
        hora_fin="12:00",
        medico_id=str(medico.id),
        usuario=u_medico
    )
    res = json.loads(res_raw)
    print(f"  Resultado: {res.get('mensaje')}")
    print(f"  Día: {res.get('dia')}")
    print(f"  Franja: {res.get('hora_inicio')} a {res.get('hora_fin')}")
    print(f"  Turnos de 30m generados ({res.get('total_turnos')} turnos): {res.get('turnos_habilitados')}")
    assert res.get("exito") is True, f"Fallo al programar: {res}"
    assert res.get("total_turnos") == len(res.get("turnos_habilitados")), "Discrepancia en conteo de turnos"
    assert res.get("total_turnos") > 0, "No se generaron turnos"

    # 3. Validar persistencia en PostgreSQL
    print("\n[Paso 2] Validando persistencia en tabla 'horarios_medico'...")
    h = HorarioMedico.objects.filter(medico=medico, dia='lunes').first()
    assert h is not None, "Horario no guardado en DB"
    print(f"  ✅ Horario en DB: {h.dia} de {h.hora_inicio} a {h.hora_fin}")

    # 4. Validar consulta de horarios
    print("\n[Paso 3] Ejecutando _tool_consultar_mis_horarios...")
    res_cons = json.loads(_tool_consultar_mis_horarios(medico_id=str(medico.id), usuario=u_medico))
    print(f"  Total horarios del médico: {res_cons.get('total_horarios')}")

    # 5. Validar que un paciente ve exactamente estos turnos limpios al consultar disponibilidad
    print("\n[Paso 4] Validando disponibilidad visible para pacientes en la próxima fecha lunes...")
    hoy = date.today()
    dias_hasta_lunes = (0 - hoy.weekday()) % 7
    if dias_hasta_lunes == 0:
        dias_hasta_lunes = 7 # Próximo lunes
    proximo_lunes = hoy + timedelta(days=dias_hasta_lunes)

    disp, err = get_disponibilidad(fecha=proximo_lunes, especialidad_id=medico.especialidad_id)
    assert err is None, f"Error en disponibilidad: {err}"
    slots = [s['hora_inicio'].strftime("%I:%M %p") for s in disp['slots'] if str(s.get('medico_id')) == str(medico.id)]
    print(f"  Fecha consultada: {proximo_lunes} (Lunes)")
    print(f"  Turnos limpios disponibles para pacientes: {slots}")
    assert len(slots) > 0, "No se encontraron slots para el paciente"

    # 6. Validar auditoría
    print("\n[Paso 5] Verificando trazabilidad en 'auditoria_registros'...")
    ultimo_audit = RegistroAuditoria.objects.filter(accion='horario_medico_actualizado', usuario=u_medico).order_by('-timestamp').first()
    assert ultimo_audit is not None, "No se encontró registro de auditoría"
    print(f"  ✅ Registro de auditoría verificado: ID {ultimo_audit.id} | Origen: {ultimo_audit.origen}")
    print(f"     Datos: {ultimo_audit.datos_cambio}")

    print("\n" + "=" * 70)
    print(">>> TODAS LAS PRUEBAS DE AGENDA MÉDICA PASARON CON ÉXITO (100% OK) <<<")
    print("=" * 70)

if __name__ == '__main__':
    run_test()
