"""
MediCore OS — Pagos Router
Payment simulation (sandbox mode) for appointments.
"""

import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Cita, Especialidad, Medico, Pago, Usuario
from app.schemas.schemas import PagoResponse, PagoSimular, WebhookPago

router = APIRouter(prefix="/pagos", tags=["Pagos"])


@router.post("/simular", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
async def simular_pago(
    payload: PagoSimular,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Simulate a payment for an appointment (Sandbox mode).
    Creates a payment record with a generated reference.
    """
    # Verify the appointment exists and is pending payment
    result = await db.execute(select(Cita).where(Cita.id == payload.cita_id))
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if cita.estado != "pendiente_pago":
        raise HTTPException(
            status_code=400,
            detail=f"La cita no está en estado pendiente_pago. Estado actual: {cita.estado}",
        )

    # Check if payment already exists
    existing = await db.execute(select(Pago).where(Pago.cita_id == payload.cita_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un pago para esta cita")

    # Get appointment cost from specialty
    medico_result = await db.execute(
        select(Medico).where(Medico.id == cita.medico_id)
    )
    medico = medico_result.scalar_one()
    esp_result = await db.execute(
        select(Especialidad).where(Especialidad.id == medico.especialidad_id)
    )
    especialidad = esp_result.scalar_one()

    # Generate sandbox reference
    referencia = f"SANDBOX-{uuid_mod.uuid4().hex[:12].upper()}"

    pago = Pago(
        cita_id=payload.cita_id,
        monto=float(especialidad.precio_base),
        moneda="COP",
        referencia=referencia,
        metodo_pago=payload.metodo_pago,
        estado="pendiente",
    )
    db.add(pago)
    await db.flush()

    return PagoResponse.model_validate(pago)


@router.post("/webhook", response_model=PagoResponse)
async def webhook_pago(
    payload: WebhookPago,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint to confirm or reject a payment.
    Updates payment status and appointment status accordingly.
    """
    result = await db.execute(
        select(Pago).where(Pago.referencia == payload.referencia)
    )
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado con esa referencia")

    pago.estado = payload.estado

    # Update appointment status based on payment result
    cita_result = await db.execute(select(Cita).where(Cita.id == pago.cita_id))
    cita = cita_result.scalar_one()

    if payload.estado == "aprobado":
        cita.estado = "confirmada"
    elif payload.estado == "rechazado":
        cita.estado = "cancelada"

    await db.flush()

    return PagoResponse.model_validate(pago)


@router.get("/{cita_id}", response_model=PagoResponse)
async def obtener_pago(
    cita_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Get payment details for an appointment."""
    result = await db.execute(select(Pago).where(Pago.cita_id == cita_id))
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="No se encontró pago para esta cita")
    return PagoResponse.model_validate(pago)
