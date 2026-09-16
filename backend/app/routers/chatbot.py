"""
MediCore OS — Chatbot Router
Endpoints for AI-assisted chat using the Groq LLM orchestrator.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import MensajeChat, SesionChat, Usuario
from app.schemas.schemas import (
    ChatMessage,
    ChatResponse,
    MensajeChatResponse,
    SesionChatResponse,
)
from app.services.llm_orchestrator import LLMOrchestrator

router = APIRouter(prefix="/chat", tags=["Chatbot IA"])


@router.post("/mensaje", response_model=ChatResponse)
async def enviar_mensaje(
    payload: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Send a message to the AI assistant.
    Creates or reuses a chat session, orchestrates with LLM, and returns the response.
    """
    # Get or create session
    if payload.sesion_id:
        result = await db.execute(
            select(SesionChat).where(
                SesionChat.id == payload.sesion_id,
                SesionChat.usuario_id == current_user.id,
            )
        )
        sesion = result.scalar_one_or_none()
        if not sesion:
            raise HTTPException(status_code=404, detail="Sesión de chat no encontrada")
    else:
        sesion = SesionChat(
            usuario_id=current_user.id,
            rol_origen=current_user.rol,
        )
        db.add(sesion)
        await db.flush()

    # Save user message
    msg_usuario = MensajeChat(
        sesion_id=sesion.id,
        emisor="usuario",
        contenido=payload.mensaje,
    )
    db.add(msg_usuario)
    await db.flush()

    # Orchestrate with LLM
    orchestrator = LLMOrchestrator()
    respuesta = await orchestrator.chat(
        mensaje=payload.mensaje,
        sesion_id=sesion.id,
        usuario=current_user,
        db=db,
    )

    # Save assistant response
    msg_asistente = MensajeChat(
        sesion_id=sesion.id,
        emisor="asistente",
        contenido=respuesta,
    )
    db.add(msg_asistente)
    await db.flush()

    return ChatResponse(
        respuesta=respuesta,
        sesion_id=sesion.id,
    )


@router.get("/sesiones", response_model=list[SesionChatResponse])
async def listar_sesiones(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    result = await db.execute(
        select(SesionChat)
        .options(selectinload(SesionChat.mensajes))
        .where(SesionChat.usuario_id == current_user.id)
        .order_by(SesionChat.creado_en.desc())
    )
    sesiones = result.scalars().all()

    responses = []
    for s in sesiones:
        ultimo = s.mensajes[-1].contenido if s.mensajes else None
        responses.append(
            SesionChatResponse(
                id=s.id,
                usuario_id=s.usuario_id,
                rol_origen=s.rol_origen,
                creado_en=s.creado_en,
                ultimo_mensaje=ultimo[:100] if ultimo else None,
            )
        )
    return responses


@router.get("/sesiones/{sesion_id}/mensajes", response_model=list[MensajeChatResponse])
async def listar_mensajes(
    sesion_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """List all messages in a specific chat session."""
    # Verify session belongs to user
    session_result = await db.execute(
        select(SesionChat).where(
            SesionChat.id == sesion_id,
            SesionChat.usuario_id == current_user.id,
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    result = await db.execute(
        select(MensajeChat)
        .where(MensajeChat.sesion_id == sesion_id)
        .order_by(MensajeChat.creado_en)
    )
    return [MensajeChatResponse.model_validate(m) for m in result.scalars().all()]
