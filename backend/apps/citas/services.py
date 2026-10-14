from datetime import date, datetime, time, timedelta
from apps.clinica.models import Especialidad, Medico, HorarioMedico
from .models import Cita

DIAS_SEMANA = {
    0: "lunes",
    1: "martes",
    2: "miercoles",
    3: "jueves",
    4: "viernes",
    5: "sabado",
    6: "domingo",
}

def generate_slots(hora_inicio: time, hora_fin: time, duracion_minutos: int, fecha: date) -> list[dict]:
    """Generate time slots within a schedule block."""
    slots = []
    current = datetime.combine(fecha, hora_inicio)
    end = datetime.combine(fecha, hora_fin)

    while current + timedelta(minutes=duracion_minutos) <= end:
        slot_end = current + timedelta(minutes=duracion_minutos)
        slots.append({
            "hora_inicio": current.time(),
            "hora_fin": slot_end.time(),
        })
        current = slot_end

    return slots


def normalize_gender(genero: str | None) -> str | None:
    if not genero or not isinstance(genero, str):
        return None
    g = genero.strip().lower()
    if g in ["m", "hombre", "masculino", "varon", "varón", "doctor", "dr"]:
        return "M"
    if g in ["f", "mujer", "femenino", "femenina", "doctora", "dra"]:
        return "F"
    return g.upper()


def get_disponibilidad(fecha: date, especialidad_id=None, especialidad_nombre=None, genero=None):
    """
    Get available appointment slots for a given date and specialty.
    Crosses doctor schedules with existing appointments to find free slots.
    """
    if especialidad_id:
        esp = Especialidad.objects.filter(id=especialidad_id).first()
    elif especialidad_nombre:
        esp = Especialidad.objects.filter(nombre__iexact=especialidad_nombre).first()
    else:
        return None, "Debe proporcionar especialidad_nombre o especialidad_id"

    if not esp:
        return None, "Especialidad no encontrada"

    dia_semana = DIAS_SEMANA[fecha.weekday()]

    medicos_query = Medico.objects.filter(
        especialidad=esp,
        activo=True,
    ).select_related('usuario', 'sede')

    norm_gen = normalize_gender(genero)
    if norm_gen:
        medicos_query = medicos_query.filter(genero__iexact=norm_gen)

    medicos = list(medicos_query)
    available_slots = []

    from django.utils import timezone
    tz = timezone.get_current_timezone()
    ahora_local = timezone.localtime(timezone.now(), tz)
    hoy_local = ahora_local.date()
    hora_actual = ahora_local.time()

    # Si la fecha solicitada es anterior a hoy, no hay disponibilidad
    if fecha < hoy_local:
        return {
            "fecha": fecha,
            "especialidad": esp.nombre,
            "slots": [],
            "total_slots": 0,
        }, None

    start_of_day = timezone.make_aware(datetime.combine(fecha, time(0, 0)), tz)
    end_of_day = timezone.make_aware(datetime.combine(fecha, time(23, 59, 59)), tz)

    for medico in medicos:
        horarios = HorarioMedico.objects.filter(
            medico=medico,
            dia=dia_semana,
        )

        citas_existentes = Cita.objects.filter(
            medico=medico,
            fecha_hora__range=(start_of_day, end_of_day),
            estado__in=["pendiente_pago", "confirmada"],
        )

        def to_local_time(dt_val):
            from datetime import timezone as py_tz
            aware_dt = dt_val.replace(tzinfo=py_tz.utc) if timezone.is_naive(dt_val) else dt_val
            return timezone.localtime(aware_dt, tz).time()

        booked_times = {to_local_time(c.fecha_hora) for c in citas_existentes}

        for horario in horarios:
            raw_slots = generate_slots(
                horario.hora_inicio,
                horario.hora_fin,
                medico.duracion_cita_minutos,
                fecha,
            )
            for slot in raw_slots:
                # Si la fecha es hoy, descartar turnos pasados
                if fecha == hoy_local and slot["hora_inicio"] <= hora_actual:
                    continue

                if slot["hora_inicio"] not in booked_times:
                    available_slots.append({
                        "medico_id": medico.id,
                        "medico_nombre": medico.usuario.nombre_completo,
                        "especialidad": esp.nombre,
                        "sede": medico.sede.nombre,
                        "fecha": fecha,
                        "hora_inicio": slot["hora_inicio"],
                        "hora_fin": slot["hora_fin"],
                        "duracion_minutos": medico.duracion_cita_minutos,
                        "precio": float(esp.precio_base),
                        "genero": medico.genero or "M",
                    })

    return {
        "fecha": fecha,
        "especialidad": esp.nombre,
        "slots": available_slots,
        "total_slots": len(available_slots),
    }, None


def get_dias_disponibles(fecha_inicio: date, fecha_fin: date, especialidad_id=None, especialidad_nombre=None, genero=None):
    """
    Get days with available appointment slots in a date range for a given specialty.
    Optimized with PostgreSQL view `v_disponibilidad_medica` and bulk range query.
    """
    from django.db import connection
    from django.utils import timezone

    if especialidad_id:
        esp = Especialidad.objects.filter(id=especialidad_id).first()
    elif especialidad_nombre:
        esp = Especialidad.objects.filter(nombre__iexact=especialidad_nombre.strip()).first()
        if not esp:
            esp = Especialidad.objects.filter(nombre__icontains=especialidad_nombre.strip()).first()
    else:
        return None, "Debe proporcionar especialidad_nombre o especialidad_id"

    if not esp:
        return None, "Especialidad no encontrada"

    norm_gen = normalize_gender(genero)

    # 1. Consultar la vista de base de datos v_disponibilidad_medica
    query = """
        SELECT medico_id, medico_nombre, duracion_cita_minutos, horario_dia, horario_hora_inicio, horario_hora_fin
        FROM v_disponibilidad_medica
        WHERE especialidad_id = %s
    """
    params = [str(esp.id)]
    if norm_gen:
        query += " AND medico_genero = %s"
        params.append(norm_gen)

    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            schedule_rows = cursor.fetchall()
    except Exception:
        # Fallback ORM robusto si la vista SQL v_disponibilidad_medica no está en el entorno
        horarios_orm = HorarioMedico.objects.filter(
            medico__especialidad=esp,
            medico__activo=True,
        ).select_related('medico__usuario')
        if norm_gen:
            horarios_orm = horarios_orm.filter(medico__genero__iexact=norm_gen)
        schedule_rows = [
            (str(h.medico_id), h.medico.usuario.nombre_completo, h.medico.duracion_cita_minutos, h.dia, h.hora_inicio, h.hora_fin)
            for h in horarios_orm
        ]

    if not schedule_rows:
        return {
            "especialidad": esp.nombre,
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "total_dias_disponibles": 0,
            "dias_disponibles": [],
            "fechas_activas": [],
        }, None

    tz = timezone.get_current_timezone()
    ahora_local = timezone.localtime(timezone.now(), tz)
    hoy_local = ahora_local.date()
    hora_actual = ahora_local.time()
    cur = max(fecha_inicio, hoy_local)

    # 2. Consultar citas ocupadas en el rango en un solo viaje con índice compuesto
    medico_ids = list({row[0] for row in schedule_rows})
    start_dt = timezone.make_aware(datetime.combine(cur, time(0, 0)), tz)
    end_dt = timezone.make_aware(datetime.combine(fecha_fin, time(23, 59, 59)), tz)

    citas_ocupadas = Cita.objects.filter(
        medico_id__in=medico_ids,
        fecha_hora__range=(start_dt, end_dt),
        estado__in=["pendiente_pago", "confirmada"],
    ).values_list('medico_id', 'fecha_hora')

    from datetime import timezone as py_tz
    booked_set = set()
    for m_id, dt_val in citas_ocupadas:
        aware_dt = dt_val.replace(tzinfo=py_tz.utc) if timezone.is_naive(dt_val) else dt_val
        loc_dt = timezone.localtime(aware_dt, tz)
        booked_set.add((m_id, loc_dt.date(), loc_dt.time()))

    schedules_by_day = {}
    for m_id, m_nom, dur, d_sem, h_ini, h_fin in schedule_rows:
        schedules_by_day.setdefault(d_sem, []).append({
            "medico_id": m_id,
            "medico_nombre": m_nom,
            "duracion": dur or 30,
            "hora_inicio": h_ini,
            "hora_fin": h_fin,
        })

    dias_nombres_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    meses_es = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

    dias_disponibles = []
    fechas_activas = []

    while cur <= fecha_fin:
        dia_sem_str = DIAS_SEMANA[cur.weekday()]
        day_schedules = schedules_by_day.get(dia_sem_str, [])
        if day_schedules:
            free_slots_day = 0
            medicos_set = set()
            for sched in day_schedules:
                m_id = sched["medico_id"]
                raw_slots = generate_slots(sched["hora_inicio"], sched["hora_fin"], sched["duracion"], cur)
                for slot in raw_slots:
                    if cur == hoy_local and slot["hora_inicio"] <= hora_actual:
                        continue
                    if (m_id, cur, slot["hora_inicio"]) not in booked_set:
                        free_slots_day += 1
                        medicos_set.add(sched["medico_nombre"])

            if free_slots_day > 0:
                dia_nombre = f"{dias_nombres_es[cur.weekday()]} {cur.day} de {meses_es[cur.month]}"
                dias_disponibles.append({
                    "fecha": cur.isoformat(),
                    "dia_semana": dia_sem_str,
                    "dia_nombre": dia_nombre,
                    "slots_libres": free_slots_day,
                    "medicos": sorted(list(medicos_set)),
                })
                fechas_activas.append(cur.isoformat())

        cur += timedelta(days=1)

    return {
        "especialidad": esp.nombre,
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "total_dias_disponibles": len(dias_disponibles),
        "dias_disponibles": dias_disponibles,
        "fechas_activas": fechas_activas,
    }, None

