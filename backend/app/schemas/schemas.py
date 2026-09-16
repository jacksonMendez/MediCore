"""
MediCore OS — Pydantic v2 Schemas
Request/Response models for all API endpoints.
"""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Auth Schemas ─────────────────────────────────────────────

class UserLogin(BaseModel):
    correo: EmailStr
    password: str


class UserCreate(BaseModel):
    nombre_completo: str = Field(..., min_length=3, max_length=200)
    correo: EmailStr
    password: str = Field(..., min_length=6)
    rol: str = Field(default="paciente", pattern="^(paciente|medico|admin)$")
    telefono: Optional[str] = None
    # Patient-specific fields (required if rol == 'paciente')
    documento_tipo: Optional[str] = "CC"
    documento_numero: Optional[str] = None
    fecha_nacimiento: Optional[date] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioResponse"


class UsuarioResponse(BaseModel):
    id: UUID
    nombre_completo: str
    correo: str
    rol: str
    telefono: Optional[str] = None
    activo: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


# ── Sede Schemas ─────────────────────────────────────────────

class SedeCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=150)
    direccion: str = Field(..., min_length=5, max_length=300)
    telefono: Optional[str] = None
    activa: bool = True


class SedeResponse(BaseModel):
    id: UUID
    nombre: str
    direccion: str
    telefono: Optional[str] = None
    activa: bool

    model_config = {"from_attributes": True}


# ── Especialidad Schemas ─────────────────────────────────────

class EspecialidadCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    descripcion: Optional[str] = None
    precio_base: float = Field(default=0, ge=0)


class EspecialidadResponse(BaseModel):
    id: UUID
    nombre: str
    descripcion: Optional[str] = None
    precio_base: float

    model_config = {"from_attributes": True}


# ── Médico Schemas ───────────────────────────────────────────

class MedicoCreate(BaseModel):
    usuario_id: Optional[UUID] = None  # If creating with existing user
    # Or create user inline
    nombre_completo: Optional[str] = None
    correo: Optional[EmailStr] = None
    password: Optional[str] = None
    telefono: Optional[str] = None
    especialidad_id: UUID
    sede_id: UUID
    tarjeta_profesional: str
    duracion_cita_minutos: int = Field(default=30, ge=10, le=120)
    genero: Optional[str] = "M"


class MedicoResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    especialidad_id: UUID
    sede_id: UUID
    tarjeta_profesional: str
    duracion_cita_minutos: int
    genero: Optional[str] = "M"
    activo: bool
    # Nested
    nombre_completo: Optional[str] = None
    correo: Optional[str] = None
    especialidad_nombre: Optional[str] = None
    sede_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class HorarioCreate(BaseModel):
    medico_id: UUID
    dia: str = Field(..., pattern="^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)$")
    hora_inicio: time
    hora_fin: time


class HorarioResponse(BaseModel):
    id: UUID
    medico_id: UUID
    dia: str
    hora_inicio: time
    hora_fin: time

    model_config = {"from_attributes": True}


# ── Cita Schemas ─────────────────────────────────────────────

class CitaCreate(BaseModel):
    medico_id: UUID
    fecha_hora: datetime
    motivo: Optional[str] = None


class CitaResponse(BaseModel):
    id: UUID
    paciente_id: UUID
    medico_id: UUID
    sede_id: UUID
    fecha_hora: datetime
    duracion_minutos: int
    estado: str
    motivo: Optional[str] = None
    creado_en: datetime
    # Nested display info
    paciente_nombre: Optional[str] = None
    medico_nombre: Optional[str] = None
    sede_nombre: Optional[str] = None
    especialidad_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class DisponibilidadRequest(BaseModel):
    especialidad_nombre: Optional[str] = None
    especialidad_id: Optional[UUID] = None
    fecha: date


class SlotDisponible(BaseModel):
    medico_id: UUID
    medico_nombre: str
    especialidad: str
    sede: str
    fecha: date
    hora_inicio: time
    hora_fin: time
    duracion_minutos: int
    precio: float


class DisponibilidadResponse(BaseModel):
    fecha: date
    especialidad: str
    slots: list[SlotDisponible]
    total_slots: int


# ── Pago Schemas ─────────────────────────────────────────────

class PagoSimular(BaseModel):
    cita_id: UUID
    metodo_pago: str = "sandbox"


class PagoResponse(BaseModel):
    id: UUID
    cita_id: UUID
    monto: float
    moneda: str
    referencia: str
    metodo_pago: str
    estado: str
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class WebhookPago(BaseModel):
    referencia: str
    estado: str = Field(..., pattern="^(aprobado|rechazado)$")


# ── Chat Schemas ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=2000)
    sesion_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    respuesta: str
    sesion_id: UUID
    emisor: str = "asistente"


class MensajeChatResponse(BaseModel):
    id: UUID
    sesion_id: UUID
    emisor: str
    contenido: str
    creado_en: datetime

    model_config = {"from_attributes": True}


class SesionChatResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    rol_origen: str
    creado_en: datetime
    ultimo_mensaje: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Consulta / Nota Schemas ──────────────────────────────────

class NotaCreate(BaseModel):
    cita_id: UUID
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    receta_medica: Optional[str] = None


class NotaResponse(BaseModel):
    id: UUID
    cita_id: UUID
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    receta_medica: Optional[str] = None
    creado_en: datetime

    model_config = {"from_attributes": True}
