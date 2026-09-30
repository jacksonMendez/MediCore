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
    """
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

    # Find which days of week doctors work for this specialty
    medicos_query = Medico.objects.filter(especialidad=esp, activo=True)
    norm_gen = normalize_gender(genero)
    if norm_gen:
        medicos_query = medicos_query.filter(genero__iexact=norm_gen)

    medicos = list(medicos_query)
    if not medicos:
        return {
            "especialidad": esp.nombre,
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "total_dias_disponibles": 0,
            "dias_disponibles": [],
            "fechas_activas": [],
        }, None

    active_weekdays = set(
        HorarioMedico.objects.filter(medico__in=medicos).values_list('dia', flat=True).distinct()
    )

    dias_nombres_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    meses_es = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

    dias_disponibles = []
    fechas_activas = []

    cur = fecha_inicio
    while cur <= fecha_fin:
        dia_semana_str = DIAS_SEMANA[cur.weekday()]
        if dia_semana_str in active_weekdays:
            data_disp, _ = get_disponibilidad(
                fecha=cur,
                especialidad_id=esp.id,
                genero=genero,
            )
            if data_disp and data_disp.get("total_slots", 0) > 0:
                medicos_set = sorted(list({s["medico_nombre"] for s in data_disp["slots"]}))
                dia_nombre = f"{dias_nombres_es[cur.weekday()]} {cur.day} de {meses_es[cur.month]}"
                dias_disponibles.append({
                    "fecha": cur.isoformat(),
                    "dia_semana": dia_semana_str,
                    "dia_nombre": dia_nombre,
                    "slots_libres": data_disp["total_slots"],
                    "medicos": medicos_set,
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

