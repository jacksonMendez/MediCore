"""
MediCore OS — SQLAlchemy 2.0 ORM Models
Maps all 11 database tables using the modern Mapped/mapped_column style.
Includes cross-dialect GUID type for PostgreSQL and SQLite support.
"""

import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── GUID Cross-Dialect Type ───────────────────────────────────

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type when available, otherwise CHAR(36).
    Handles string <-> uuid.UUID transparently.
    """
    impl = CHAR(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            try:
                return str(uuid.UUID(str(value)))
            except Exception:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except Exception:
            return value


# ── Helpers ──────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now().replace(tzinfo=None)


def _new_uuid():
    return uuid.uuid4()


# ── Sedes ────────────────────────────────────────────────────

class Sede(Base):
    __tablename__ = "sedes"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    direccion: Mapped[str] = mapped_column(String(300), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    medicos: Mapped[list["Medico"]] = relationship(back_populates="sede")
    citas: Mapped[list["Cita"]] = relationship(back_populates="sede")


# ── Especialidades ───────────────────────────────────────────

class Especialidad(Base):
    __tablename__ = "especialidades"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    precio_base: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    # Relationships
    medicos: Mapped[list["Medico"]] = relationship(back_populates="especialidad")


# ── Usuarios ─────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    nombre_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    correo: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    rol: Mapped[str] = mapped_column(
        Enum("paciente", "medico", "admin", name="rol_usuario", create_type=False),
        default="paciente",
    )
    telefono: Mapped[str | None] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    paciente: Mapped["Paciente | None"] = relationship(
        back_populates="usuario", uselist=False
    )
    medico: Mapped["Medico | None"] = relationship(
        back_populates="usuario", uselist=False
    )
    sesiones_chat: Mapped[list["SesionChat"]] = relationship(back_populates="usuario")


# ── Pacientes ────────────────────────────────────────────────

class Paciente(Base):
    __tablename__ = "pacientes"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    documento_tipo: Mapped[str] = mapped_column(String(10), default="CC")
    documento_numero: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    contacto_emergencia: Mapped[str | None] = mapped_column(String(200))
    telefono_emergencia: Mapped[str | None] = mapped_column(String(20))

    # Relationships
    usuario: Mapped["Usuario"] = relationship(back_populates="paciente")
    citas: Mapped[list["Cita"]] = relationship(back_populates="paciente")


# ── Médicos ──────────────────────────────────────────────────

class Medico(Base):
    __tablename__ = "medicos"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    especialidad_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("especialidades.id"), nullable=False
    )
    sede_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("sedes.id"), nullable=False
    )
    tarjeta_profesional: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    duracion_cita_minutos: Mapped[int] = mapped_column(Integer, default=30)
    genero: Mapped[str | None] = mapped_column(String(10), default="M")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    usuario: Mapped["Usuario"] = relationship(back_populates="medico")
    especialidad: Mapped["Especialidad"] = relationship(back_populates="medicos")
    sede: Mapped["Sede"] = relationship(back_populates="medicos")
    horarios: Mapped[list["HorarioMedico"]] = relationship(back_populates="medico")
    citas: Mapped[list["Cita"]] = relationship(back_populates="medico")


# ── Horarios Médico ──────────────────────────────────────────

class HorarioMedico(Base):
    __tablename__ = "horarios_medico"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    medico_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("medicos.id", ondelete="CASCADE"), nullable=False
    )
    dia: Mapped[str] = mapped_column(
        Enum(
            "lunes", "martes", "miercoles", "jueves",
            "viernes", "sabado", "domingo",
            name="dia_semana", create_type=False,
        ),
        nullable=False,
    )
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[time] = mapped_column(Time, nullable=False)

    # Relationships
    medico: Mapped["Medico"] = relationship(back_populates="horarios")


# ── Citas ────────────────────────────────────────────────────

class Cita(Base):
    __tablename__ = "citas"
    __table_args__ = (
        Index("idx_citas_fecha_medico", "fecha_hora", "medico_id"),
        Index("idx_citas_paciente", "paciente_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    paciente_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("pacientes.id"), nullable=False
    )
    medico_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("medicos.id"), nullable=False
    )
    sede_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("sedes.id"), nullable=False
    )
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duracion_minutos: Mapped[int] = mapped_column(Integer, default=30)
    estado: Mapped[str] = mapped_column(
        Enum(
            "pendiente_pago", "confirmada", "cancelada", "atendida", "no_asistio",
            name="estado_cita", create_type=False,
        ),
        default="pendiente_pago",
    )
    motivo: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    paciente: Mapped["Paciente"] = relationship(back_populates="citas")
    medico: Mapped["Medico"] = relationship(back_populates="citas")
    sede: Mapped["Sede"] = relationship(back_populates="citas")
    pago: Mapped["Pago | None"] = relationship(back_populates="cita", uselist=False)
    notas: Mapped["ConsultaNota | None"] = relationship(
        back_populates="cita", uselist=False
    )


# ── Pagos ────────────────────────────────────────────────────

class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    cita_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("citas.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    monto: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(5), default="COP")
    referencia: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    metodo_pago: Mapped[str] = mapped_column(String(50), default="sandbox")
    estado: Mapped[str] = mapped_column(
        Enum("pendiente", "aprobado", "rechazado", name="estado_pago", create_type=False),
        default="pendiente",
    )
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    cita: Mapped["Cita"] = relationship(back_populates="pago")


# ── Consultas / Notas Clínicas ───────────────────────────────

class ConsultaNota(Base):
    __tablename__ = "consultas_notas"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    cita_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("citas.id", ondelete="CASCADE"), nullable=False
    )
    diagnostico: Mapped[str | None] = mapped_column(Text)
    tratamiento: Mapped[str | None] = mapped_column(Text)
    receta_medica: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    cita: Mapped["Cita"] = relationship(back_populates="notas")


# ── Sesiones de Chat ─────────────────────────────────────────

class SesionChat(Base):
    __tablename__ = "sesiones_chat"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    rol_origen: Mapped[str] = mapped_column(String(20), default="paciente")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    usuario: Mapped["Usuario"] = relationship(back_populates="sesiones_chat")
    mensajes: Mapped[list["MensajeChat"]] = relationship(
        back_populates="sesion", order_by="MensajeChat.creado_en"
    )


# ── Mensajes de Chat ─────────────────────────────────────────

class MensajeChat(Base):
    __tablename__ = "mensajes_chat"
    __table_args__ = (
        Index("idx_mensajes_sesion", "sesion_id", "creado_en"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        GUID, primary_key=True, default=_new_uuid
    )
    sesion_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("sesiones_chat.id", ondelete="CASCADE"), nullable=False
    )
    emisor: Mapped[str] = mapped_column(String(20), nullable=False)  # 'usuario' | 'asistente'
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    sesion: Mapped["SesionChat"] = relationship(back_populates="mensajes")
