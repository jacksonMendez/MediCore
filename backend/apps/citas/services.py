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

    if genero:
        medicos_query = medicos_query.filter(genero__iexact=genero)

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
        booked_times = {c.fecha_hora.time() for c in citas_existentes}

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
