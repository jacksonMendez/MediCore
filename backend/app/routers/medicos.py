"""
MediCore OS — Médicos Router
CRUD for doctors, specialties, locations, and schedules.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, require_role
from app.models.models import (
    Especialidad,
    HorarioMedico,
    Medico,
    Sede,
    Usuario,
)
from app.schemas.schemas import (
    EspecialidadCreate,
    EspecialidadResponse,
    HorarioCreate,
    HorarioResponse,
    MedicoCreate,
    MedicoResponse,
    SedeCreate,
    SedeResponse,
)

router = APIRouter(tags=["Médicos y Catálogos"])


# ── Sedes ────────────────────────────────────────────────────

@router.get("/sedes", response_model=list[SedeResponse])
async def listar_sedes(db: AsyncSession = Depends(get_db)):
    """List all active clinic locations."""
    result = await db.execute(select(Sede).where(Sede.activa == True))
    return [SedeResponse.model_validate(s) for s in result.scalars().all()]


@router.post("/sedes", response_model=SedeResponse, status_code=status.HTTP_201_CREATED)
async def crear_sede(
    payload: SedeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"])),
):
    """Create a new clinic location (admin only)."""
    sede = Sede(**payload.model_dump())
    db.add(sede)
    await db.flush()
    return SedeResponse.model_validate(sede)


# ── Especialidades ───────────────────────────────────────────

@router.get("/especialidades", response_model=list[EspecialidadResponse])
async def listar_especialidades(db: AsyncSession = Depends(get_db)):
    """List all medical specialties."""
    result = await db.execute(select(Especialidad))
    return [EspecialidadResponse.model_validate(e) for e in result.scalars().all()]


@router.post(
    "/especialidades",
    response_model=EspecialidadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_especialidad(
    payload: EspecialidadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"])),
):
    """Create a new medical specialty (admin only)."""
    # Check uniqueness
    existing = await db.execute(
        select(Especialidad).where(Especialidad.nombre == payload.nombre)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Especialidad ya existe")

    esp = Especialidad(**payload.model_dump())
    db.add(esp)
    await db.flush()
    return EspecialidadResponse.model_validate(esp)


# ── Médicos ──────────────────────────────────────────────────

@router.get("/medicos", response_model=list[MedicoResponse])
async def listar_medicos(
    especialidad_id: UUID = None,
    sede_id: UUID = None,
    db: AsyncSession = Depends(get_db),
):
    """List doctors with optional filters by specialty and location."""
    query = select(Medico).options(
        selectinload(Medico.usuario),
        selectinload(Medico.especialidad),
        selectinload(Medico.sede),
    ).where(Medico.activo == True)

    if especialidad_id:
        query = query.where(Medico.especialidad_id == especialidad_id)
    if sede_id:
        query = query.where(Medico.sede_id == sede_id)

    result = await db.execute(query)
    medicos = result.scalars().all()

    return [
        MedicoResponse(
            id=m.id,
            usuario_id=m.usuario_id,
            especialidad_id=m.especialidad_id,
            sede_id=m.sede_id,
            tarjeta_profesional=m.tarjeta_profesional,
            duracion_cita_minutos=m.duracion_cita_minutos,
            activo=m.activo,
            nombre_completo=m.usuario.nombre_completo,
            correo=m.usuario.correo,
            especialidad_nombre=m.especialidad.nombre,
            sede_nombre=m.sede.nombre,
        )
        for m in medicos
    ]


@router.post("/medicos", response_model=MedicoResponse, status_code=status.HTTP_201_CREATED)
async def crear_medico(
    payload: MedicoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"])),
):
    """Create a new doctor. Can create the user inline or link to an existing one."""
    if payload.usuario_id:
        user_result = await db.execute(
            select(Usuario).where(Usuario.id == payload.usuario_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    elif payload.correo and payload.nombre_completo and payload.password:
        # Create user inline
        existing = await db.execute(
            select(Usuario).where(Usuario.correo == payload.correo)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un usuario con este correo")

        user = Usuario(
            nombre_completo=payload.nombre_completo,
            correo=payload.correo,
            password_hash=hash_password(payload.password),
            rol="medico",
            telefono=payload.telefono,
        )
        db.add(user)
        await db.flush()
    else:
        raise HTTPException(
            status_code=400,
            detail="Proporcione usuario_id existente o datos para crear usuario nuevo (nombre, correo, password)",
        )

    medico = Medico(
        usuario_id=user.id,
        especialidad_id=payload.especialidad_id,
        sede_id=payload.sede_id,
        tarjeta_profesional=payload.tarjeta_profesional,
        duracion_cita_minutos=payload.duracion_cita_minutos,
    )
    db.add(medico)
    await db.flush()

    # Load relationships for response
    esp_result = await db.execute(
        select(Especialidad).where(Especialidad.id == payload.especialidad_id)
    )
    esp = esp_result.scalar_one()
    sede_result = await db.execute(select(Sede).where(Sede.id == payload.sede_id))
    sede = sede_result.scalar_one()

    return MedicoResponse(
        id=medico.id,
        usuario_id=medico.usuario_id,
        especialidad_id=medico.especialidad_id,
        sede_id=medico.sede_id,
        tarjeta_profesional=medico.tarjeta_profesional,
        duracion_cita_minutos=medico.duracion_cita_minutos,
        activo=medico.activo,
        nombre_completo=user.nombre_completo,
        correo=user.correo,
        especialidad_nombre=esp.nombre,
        sede_nombre=sede.nombre,
    )


# ── Horarios ─────────────────────────────────────────────────

@router.get("/medicos/{medico_id}/horarios", response_model=list[HorarioResponse])
async def listar_horarios(medico_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all schedule slots for a doctor."""
    result = await db.execute(
        select(HorarioMedico).where(HorarioMedico.medico_id == medico_id)
    )
    return [HorarioResponse.model_validate(h) for h in result.scalars().all()]


@router.post(
    "/medicos/horarios",
    response_model=HorarioResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_horario(
    payload: HorarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"])),
):
    """Add a schedule slot for a doctor (admin only)."""
    horario = HorarioMedico(**payload.model_dump())
    db.add(horario)
    await db.flush()
    return HorarioResponse.model_validate(horario)
