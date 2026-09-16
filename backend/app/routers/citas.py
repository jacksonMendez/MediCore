"""
MediCore OS — Citas Router
Appointment management: availability, booking, listing, status updates.
"""

from datetime import date, datetime, time, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import (
    Cita,
    Especialidad,
    HorarioMedico,
    Medico,
    Paciente,
    Sede,
    Usuario,
)
from app.schemas.schemas import (
    CitaCreate,
    CitaResponse,
    DisponibilidadRequest,
    DisponibilidadResponse,
    SlotDisponible,
)

router = APIRouter(prefix="/citas", tags=["Citas"])

# Day name mapping (Python weekday → dia_semana enum)
DIAS_SEMANA = {
    0: "lunes",
    1: "martes",
    2: "miercoles",
    3: "jueves",
    4: "viernes",
    5: "sabado",
    6: "domingo",
}


def _generate_slots(
    hora_inicio: time,
    hora_fin: time,
    duracion_minutos: int,
    fecha: date,
) -> list[dict]:
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


@router.get("/disponibilidad", response_model=DisponibilidadResponse)
async def consultar_disponibilidad(
    fecha: date = Query(...),
    especialidad_nombre: str = Query(None),
    especialidad_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Get available appointment slots for a given date and specialty.
    Crosses doctor schedules with existing appointments to find free slots.
    """
    # Resolve specialty
    if especialidad_id:
        result = await db.execute(
            select(Especialidad).where(Especialidad.id == especialidad_id)
        )
    elif especialidad_nombre:
        result = await db.execute(
            select(Especialidad).where(
                func.lower(Especialidad.nombre) == func.lower(especialidad_nombre)
            )
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar especialidad_nombre o especialidad_id",
        )

    especialidad = result.scalar_one_or_none()
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # Get the day of week for the requested date
    dia_semana = DIAS_SEMANA[fecha.weekday()]

    # Find all active doctors for this specialty with schedules for this day
    medicos_result = await db.execute(
        select(Medico)
        .options(selectinload(Medico.usuario), selectinload(Medico.sede))
        .where(
            and_(
                Medico.especialidad_id == especialidad.id,
                Medico.activo == True,
            )
        )
    )
    medicos = medicos_result.scalars().all()

    available_slots: list[SlotDisponible] = []

    for medico in medicos:
        # Get schedules for this day
        horarios_result = await db.execute(
            select(HorarioMedico).where(
                and_(
                    HorarioMedico.medico_id == medico.id,
                    HorarioMedico.dia == dia_semana,
                )
            )
        )
        horarios = horarios_result.scalars().all()

        # Get existing appointments for this doctor on this date
        start_of_day = datetime.combine(fecha, time(0, 0))
        end_of_day = datetime.combine(fecha, time(23, 59, 59))
        citas_result = await db.execute(
            select(Cita).where(
                and_(
                    Cita.medico_id == medico.id,
                    Cita.fecha_hora >= start_of_day,
                    Cita.fecha_hora <= end_of_day,
                    Cita.estado.in_(["pendiente_pago", "confirmada"]),
                )
            )
        )
        citas_existentes = citas_result.scalars().all()
        booked_times = {c.fecha_hora.time() for c in citas_existentes}

        # Generate and filter slots
        for horario in horarios:
            raw_slots = _generate_slots(
                horario.hora_inicio,
                horario.hora_fin,
                medico.duracion_cita_minutos,
                fecha,
            )
            for slot in raw_slots:
                if slot["hora_inicio"] not in booked_times:
                    available_slots.append(
                        SlotDisponible(
                            medico_id=medico.id,
                            medico_nombre=medico.usuario.nombre_completo,
                            especialidad=especialidad.nombre,
                            sede=medico.sede.nombre,
                            fecha=fecha,
                            hora_inicio=slot["hora_inicio"],
                            hora_fin=slot["hora_fin"],
                            duracion_minutos=medico.duracion_cita_minutos,
                            precio=float(especialidad.precio_base),
                        )
                    )

    return DisponibilidadResponse(
        fecha=fecha,
        especialidad=especialidad.nombre,
        slots=available_slots,
        total_slots=len(available_slots),
    )


@router.post("", response_model=CitaResponse, status_code=status.HTTP_201_CREATED)
async def agendar_cita(
    payload: CitaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Book an appointment. The patient is determined from the authenticated user."""
    # Get patient profile
    pac_result = await db.execute(
        select(Paciente).where(Paciente.usuario_id == current_user.id)
    )
    paciente = pac_result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(status_code=400, detail="No tiene perfil de paciente registrado")

    # Get doctor info
    med_result = await db.execute(
        select(Medico)
        .options(selectinload(Medico.usuario), selectinload(Medico.sede), selectinload(Medico.especialidad))
        .where(Medico.id == payload.medico_id)
    )
    medico = med_result.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # Check for time conflict
    conflict = await db.execute(
        select(Cita).where(
            and_(
                Cita.medico_id == payload.medico_id,
                Cita.fecha_hora == payload.fecha_hora,
                Cita.estado.in_(["pendiente_pago", "confirmada"]),
            )
        )
    )
    if conflict.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este horario ya está reservado",
        )

    cita = Cita(
        paciente_id=paciente.id,
        medico_id=medico.id,
        sede_id=medico.sede_id,
        fecha_hora=payload.fecha_hora,
        duracion_minutos=medico.duracion_cita_minutos,
        motivo=payload.motivo,
        estado="pendiente_pago",
    )
    db.add(cita)
    await db.flush()

    return CitaResponse(
        id=cita.id,
        paciente_id=cita.paciente_id,
        medico_id=cita.medico_id,
        sede_id=cita.sede_id,
        fecha_hora=cita.fecha_hora,
        duracion_minutos=cita.duracion_minutos,
        estado=cita.estado,
        motivo=cita.motivo,
        creado_en=cita.creado_en,
        paciente_nombre=current_user.nombre_completo,
        medico_nombre=medico.usuario.nombre_completo,
        sede_nombre=medico.sede.nombre,
        especialidad_nombre=medico.especialidad.nombre,
    )


@router.get("/mis-citas", response_model=list[CitaResponse])
async def mis_citas(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Get appointments for the current user (patient or doctor)."""
    if current_user.rol == "paciente":
        pac_result = await db.execute(
            select(Paciente).where(Paciente.usuario_id == current_user.id)
        )
        paciente = pac_result.scalar_one_or_none()
        if not paciente:
            return []
        result = await db.execute(
            select(Cita)
            .options(
                selectinload(Cita.medico).selectinload(Medico.usuario),
                selectinload(Cita.medico).selectinload(Medico.especialidad),
                selectinload(Cita.sede),
            )
            .where(Cita.paciente_id == paciente.id)
            .order_by(Cita.fecha_hora.desc())
        )
    else:
        med_result = await db.execute(
            select(Medico).where(Medico.usuario_id == current_user.id)
        )
        medico = med_result.scalar_one_or_none()
        if not medico:
            return []
        result = await db.execute(
            select(Cita)
            .options(
                selectinload(Cita.paciente).selectinload(Paciente.usuario),
                selectinload(Cita.medico).selectinload(Medico.especialidad),
                selectinload(Cita.sede),
            )
            .where(Cita.medico_id == medico.id)
            .order_by(Cita.fecha_hora.desc())
        )

    citas = result.scalars().all()
    responses = []
    for c in citas:
        responses.append(
            CitaResponse(
                id=c.id,
                paciente_id=c.paciente_id,
                medico_id=c.medico_id,
                sede_id=c.sede_id,
                fecha_hora=c.fecha_hora,
                duracion_minutos=c.duracion_minutos,
                estado=c.estado,
                motivo=c.motivo,
                creado_en=c.creado_en,
                paciente_nombre=c.paciente.usuario.nombre_completo if c.paciente else None,
                medico_nombre=c.medico.usuario.nombre_completo if c.medico else None,
                sede_nombre=c.sede.nombre if c.sede else None,
                especialidad_nombre=c.medico.especialidad.nombre if c.medico and c.medico.especialidad else None,
            )
        )
    return responses


@router.get("/agenda-hoy/{medico_id}", response_model=list[CitaResponse])
async def agenda_hoy(
    medico_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["medico", "admin"])),
):
    """Get today's appointments for a specific doctor."""
    hoy = date.today()
    start_of_day = datetime.combine(hoy, time(0, 0))
    end_of_day = datetime.combine(hoy, time(23, 59, 59))

    result = await db.execute(
        select(Cita)
        .options(
            selectinload(Cita.paciente).selectinload(Paciente.usuario),
            selectinload(Cita.medico).selectinload(Medico.usuario),
            selectinload(Cita.medico).selectinload(Medico.especialidad),
            selectinload(Cita.sede),
        )
        .where(
            and_(
                Cita.medico_id == medico_id,
                Cita.fecha_hora >= start_of_day,
                Cita.fecha_hora <= end_of_day,
            )
        )
        .order_by(Cita.fecha_hora)
    )

    citas = result.scalars().all()
    responses = []
    for c in citas:
        responses.append(
            CitaResponse(
                id=c.id,
                paciente_id=c.paciente_id,
                medico_id=c.medico_id,
                sede_id=c.sede_id,
                fecha_hora=c.fecha_hora,
                duracion_minutos=c.duracion_minutos,
                estado=c.estado,
                motivo=c.motivo,
                creado_en=c.creado_en,
                paciente_nombre=c.paciente.usuario.nombre_completo if c.paciente else None,
                medico_nombre=c.medico.usuario.nombre_completo if c.medico else None,
                sede_nombre=c.sede.nombre if c.sede else None,
                especialidad_nombre=c.medico.especialidad.nombre if c.medico and c.medico.especialidad else None,
            )
        )
    return responses


@router.patch("/{cita_id}/estado", response_model=CitaResponse)
async def cambiar_estado(
    cita_id: UUID,
    nuevo_estado: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["medico", "admin"])),
):
    """Change the status of an appointment (doctor/admin only)."""
    valid_estados = ["pendiente_pago", "confirmada", "cancelada", "atendida", "no_asistio"]
    if nuevo_estado not in valid_estados:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {valid_estados}")

    result = await db.execute(
        select(Cita)
        .options(
            selectinload(Cita.paciente).selectinload(Paciente.usuario),
            selectinload(Cita.medico).selectinload(Medico.usuario),
            selectinload(Cita.medico).selectinload(Medico.especialidad),
            selectinload(Cita.sede),
        )
        .where(Cita.id == cita_id)
    )
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cita.estado = nuevo_estado
    await db.flush()

    return CitaResponse(
        id=cita.id,
        paciente_id=cita.paciente_id,
        medico_id=cita.medico_id,
        sede_id=cita.sede_id,
        fecha_hora=cita.fecha_hora,
        duracion_minutos=cita.duracion_minutos,
        estado=cita.estado,
        motivo=cita.motivo,
        creado_en=cita.creado_en,
        paciente_nombre=cita.paciente.usuario.nombre_completo if cita.paciente else None,
        medico_nombre=cita.medico.usuario.nombre_completo if cita.medico else None,
        sede_nombre=cita.sede.nombre if cita.sede else None,
        especialidad_nombre=cita.medico.especialidad.nombre if cita.medico and cita.medico.especialidad else None,
    )
