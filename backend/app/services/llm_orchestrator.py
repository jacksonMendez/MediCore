"""
MediCore OS — LLM Orchestrator (Groq Cloud)
Zero-hallucination medical assistant with tool calling.

Architecture:
1. Load last N messages from the session for context
2. Send to Groq with tools and temperature=0.0
3. If response has tool_calls → execute against the real DB
4. Send tool results back to the model
5. Return final natural-language response
"""

import json
import logging
from datetime import date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.models import (
    Cita,
    ConsultaNota,
    Especialidad,
    HorarioMedico,
    Medico,
    Paciente,
    MensajeChat,
    Sede,
    Usuario,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Day name mapping
DIAS_SEMANA = {
    0: "lunes", 1: "martes", 2: "miercoles", 3: "jueves",
    4: "viernes", 5: "sabado", 6: "domingo",
}

# ── System Prompt ────────────────────────────────────────────

SYSTEM_PROMPT = """Eres MediCore, un asistente clínico resolutivo y conciso del sistema médico oficial MediCore OS.

REGLAS ESTRICTAS DE RESPUESTA:
1. PROHIBIDO dar explicaciones largas sobre lo que puedes o no puedes hacer.
2. PROHIBIDO listar tus herramientas internas o hablar de tu arquitectura.
3. PROHIBIDO decir al usuario que vaya a "otro portal web" o a "otra plataforma", porque ESTE ES EL PORTAL OFICIAL de MediCore OS.
4. Si el usuario consulta por sus citas agendadas ("mis citas", "cuáles son mis citas", "ver mis citas"), DEBES LLAMAR DE INMEDIATO a la herramienta `consultar_mis_citas`.
5. Si el usuario pide especialista hombre o mujer ("doctora", "médico hombre"), USA el parámetro 'genero' ('F' o 'M') en `consultar_disponibilidad`.
6. NUNCA inventes horarios. Toda disponibilidad proviene EXCLUSIVAMENTE de `consultar_disponibilidad`.
7. NUNCA recetes medicamentos ni des diagnósticos médicos definitivos.
8. Sé directo, formal, empático y resolutivo. Responde en 1 a 3 oraciones claras utilizando viñetas limpias si se requieren opciones de horarios o citas.
"""

# ── Tool Definitions ─────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "consultar_disponibilidad",
            "description": "Consulta los horarios disponibles para una especialidad médica en una fecha específica. Opcionalmente filtra por género del médico ('M' o 'F'). Cruza los horarios con citas existentes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "especialidad_nombre": {
                        "type": "string",
                        "description": "Nombre de la especialidad médica (ej: 'Medicina General', 'Cardiología', 'Pediatría')",
                    },
                    "fecha": {
                        "type": "string",
                        "description": "Fecha para consultar disponibilidad en formato YYYY-MM-DD",
                    },
                    "genero": {
                        "type": "string",
                        "description": "Filtro opcional por género del médico: 'M' (hombre) o 'F' (mujer)",
                    },
                },
                "required": ["especialidad_nombre", "fecha"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_mis_citas",
            "description": "Consulta las citas registradas y activas del paciente autenticado actual.",
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {
                        "type": "string",
                        "description": "UUID del paciente",
                    },
                },
                "required": ["paciente_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "registrar_paciente",
            "description": "Registra un nuevo paciente en el sistema. Crea un usuario y perfil de paciente si no existen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": "Nombre completo del paciente",
                    },
                    "documento": {
                        "type": "string",
                        "description": "Número de documento de identidad",
                    },
                    "correo": {
                        "type": "string",
                        "description": "Correo electrónico del paciente",
                    },
                    "telefono": {
                        "type": "string",
                        "description": "Teléfono de contacto",
                    },
                },
                "required": ["nombre", "documento", "correo", "telefono"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "agendar_cita",
            "description": "Agenda una cita médica para un paciente con un médico específico. La cita se crea en estado 'pendiente_pago'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {
                        "type": "string",
                        "description": "UUID del paciente",
                    },
                    "medico_id": {
                        "type": "string",
                        "description": "UUID del médico",
                    },
                    "fecha_hora": {
                        "type": "string",
                        "description": "Fecha y hora de la cita en formato YYYY-MM-DD HH:MM",
                    },
                    "motivo": {
                        "type": "string",
                        "description": "Motivo de la consulta",
                    },
                },
                "required": ["paciente_id", "medico_id", "fecha_hora", "motivo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_agenda_hoy",
            "description": "Obtiene la lista de citas programadas para hoy de un médico específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "medico_id": {
                        "type": "string",
                        "description": "UUID del médico",
                    },
                },
                "required": ["medico_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_historial_paciente",
            "description": "Obtiene el historial de notas clínicas y diagnósticos previos de un paciente por su número de documento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "documento_numero": {
                        "type": "string",
                        "description": "Número de documento del paciente",
                    },
                },
                "required": ["documento_numero"],
            },
        },
    },
]


# ── Tool Implementations ─────────────────────────────────────

async def _tool_consultar_disponibilidad(
    db: AsyncSession,
    especialidad_nombre: str,
    fecha: str,
    genero: str | None = None,
) -> str:
    """Query real availability from the database with optional gender filter."""
    try:
        fecha_dt = date.fromisoformat(fecha)
    except ValueError:
        return json.dumps({"error": "Formato de fecha inválido. Use YYYY-MM-DD"})

    # Find specialty
    result = await db.execute(
        select(Especialidad).where(
            func.lower(Especialidad.nombre) == func.lower(especialidad_nombre)
        )
    )
    especialidad = result.scalar_one_or_none()
    if not especialidad:
        return json.dumps({
            "error": f"No se encontró la especialidad '{especialidad_nombre}'. "
                     "Especialidades disponibles: Medicina General, Cardiología, Pediatría"
        })

    dia_semana = DIAS_SEMANA[fecha_dt.weekday()]

    # Build doctor filter
    filters = [
        Medico.especialidad_id == especialidad.id,
        Medico.activo == True,
    ]
    if genero:
        filters.append(func.upper(Medico.genero) == genero.upper())

    # Find doctors for this specialty
    medicos_result = await db.execute(
        select(Medico)
        .options(selectinload(Medico.usuario), selectinload(Medico.sede))
        .where(and_(*filters))
    )
    medicos = medicos_result.scalars().all()

    if not medicos:
        gen_str = " " + ("femeninos" if genero == "F" else "masculinos") if genero else ""
        return json.dumps({
            "disponibilidad": [],
            "mensaje": f"No hay médicos{gen_str} disponibles para {especialidad_nombre} en esa fecha.",
        }, ensure_ascii=False)

    slots_disponibles = []

    for medico in medicos:
        # Get schedules for this day
        horarios_result = await db.execute(
            select(HorarioMedico).where(and_(
                HorarioMedico.medico_id == medico.id,
                HorarioMedico.dia == dia_semana,
            ))
        )
        horarios = horarios_result.scalars().all()

        # Get booked appointments
        start_of_day = datetime.combine(fecha_dt, time(0, 0))
        end_of_day = datetime.combine(fecha_dt, time(23, 59, 59))
        citas_result = await db.execute(
            select(Cita).where(and_(
                Cita.medico_id == medico.id,
                Cita.fecha_hora >= start_of_day,
                Cita.fecha_hora <= end_of_day,
                Cita.estado.in_(["pendiente_pago", "confirmada"]),
            ))
        )
        booked_times = {c.fecha_hora.time() for c in citas_result.scalars().all()}

        for horario in horarios:
            current = datetime.combine(fecha_dt, horario.hora_inicio)
            end = datetime.combine(fecha_dt, horario.hora_fin)

            while current + timedelta(minutes=medico.duracion_cita_minutos) <= end:
                if current.time() not in booked_times:
                    slots_disponibles.append({
                        "medico_id": str(medico.id),
                        "medico_nombre": medico.usuario.nombre_completo,
                        "genero": medico.genero or "M",
                        "sede": medico.sede.nombre,
                        "hora": current.strftime("%H:%M"),
                        "duracion_minutos": medico.duracion_cita_minutos,
                        "precio": float(especialidad.precio_base),
                    })
                current += timedelta(minutes=medico.duracion_cita_minutos)

    return json.dumps({
        "especialidad": especialidad.nombre,
        "fecha": fecha,
        "dia": dia_semana,
        "filtro_genero": genero or "todos",
        "slots_disponibles": slots_disponibles,
        "total": len(slots_disponibles),
    }, ensure_ascii=False)


async def _tool_consultar_mis_citas(
    db: AsyncSession,
    paciente_id: str,
) -> str:
    """Consult active and past appointments for a patient."""
    result = await db.execute(
        select(Cita)
        .options(
            selectinload(Cita.medico).selectinload(Medico.usuario),
            selectinload(Cita.medico).selectinload(Medico.especialidad),
            selectinload(Cita.sede),
        )
        .where(Cita.paciente_id == paciente_id)
        .order_by(Cita.fecha_hora.desc())
    )
    citas = result.scalars().all()

    citas_list = []
    for c in citas:
        citas_list.append({
            "cita_id": str(c.id),
            "fecha_hora": c.fecha_hora.strftime("%Y-%m-%d %H:%M"),
            "especialidad": c.medico.especialidad.nombre if c.medico and c.medico.especialidad else "General",
            "medico": c.medico.usuario.nombre_completo if c.medico and c.medico.usuario else "N/A",
            "sede": c.sede.nombre if c.sede else "N/A",
            "estado": c.estado,
            "motivo": c.motivo or "Sin motivo especificado",
        })

    return json.dumps({
        "paciente_id": paciente_id,
        "total_citas": len(citas_list),
        "citas": citas_list,
    }, ensure_ascii=False)


async def _tool_registrar_paciente(
    db: AsyncSession,
    nombre: str,
    documento: str,
    correo: str,
    telefono: str,
) -> str:
    """Register a new patient if not already in the system."""
    from app.core.security import hash_password

    # Check if document already exists
    existing = await db.execute(
        select(Paciente).where(Paciente.documento_numero == documento)
    )
    pac = existing.scalar_one_or_none()
    if pac:
        return json.dumps({
            "ya_registrado": True,
            "paciente_id": str(pac.id),
            "mensaje": f"El paciente con documento {documento} ya está registrado.",
        })

    # Create user
    user = Usuario(
        nombre_completo=nombre,
        correo=correo,
        password_hash=hash_password("Temporal123!"),
        rol="paciente",
        telefono=telefono,
    )
    db.add(user)
    await db.flush()

    # Create patient profile
    paciente = Paciente(
        usuario_id=user.id,
        documento_tipo="CC",
        documento_numero=documento,
    )
    db.add(paciente)
    await db.flush()

    return json.dumps({
        "registrado": True,
        "paciente_id": str(paciente.id),
        "usuario_id": str(user.id),
        "mensaje": f"Paciente {nombre} registrado exitosamente.",
    })


async def _tool_agendar_cita(
    db: AsyncSession,
    paciente_id: str,
    medico_id: str,
    fecha_hora: str,
    motivo: str,
) -> str:
    """Book an appointment."""
    try:
        dt = datetime.strptime(fecha_hora, "%Y-%m-%d %H:%M")
    except ValueError:
        return json.dumps({"error": "Formato de fecha/hora inválido. Use YYYY-MM-DD HH:MM"})

    # Verify no conflict
    conflict = await db.execute(
        select(Cita).where(and_(
            Cita.medico_id == medico_id,
            Cita.fecha_hora == dt,
            Cita.estado.in_(["pendiente_pago", "confirmada"]),
        ))
    )
    if conflict.scalar_one_or_none():
        return json.dumps({"error": "Este horario ya está ocupado. Por favor elija otro."})

    # Get doctor info
    med_result = await db.execute(
        select(Medico).options(selectinload(Medico.sede)).where(Medico.id == medico_id)
    )
    medico = med_result.scalar_one_or_none()
    if not medico:
        return json.dumps({"error": "Médico no encontrado"})

    cita = Cita(
        paciente_id=paciente_id,
        medico_id=medico_id,
        sede_id=medico.sede_id,
        fecha_hora=dt,
        duracion_minutos=medico.duracion_cita_minutos,
        motivo=motivo,
        estado="pendiente_pago",
    )
    db.add(cita)
    await db.flush()

    return json.dumps({
        "agendada": True,
        "cita_id": str(cita.id),
        "fecha_hora": fecha_hora,
        "sede": medico.sede.nombre,
        "estado": "pendiente_pago",
        "mensaje": "Cita agendada exitosamente. Pendiente de pago para confirmación.",
    }, ensure_ascii=False)


async def _tool_consultar_agenda_hoy(
    db: AsyncSession,
    medico_id: str,
) -> str:
    """Get today's appointments for a doctor."""
    hoy = date.today()
    start = datetime.combine(hoy, time(0, 0))
    end = datetime.combine(hoy, time(23, 59, 59))

    result = await db.execute(
        select(Cita)
        .options(selectinload(Cita.paciente).selectinload(Paciente.usuario))
        .where(and_(
            Cita.medico_id == medico_id,
            Cita.fecha_hora >= start,
            Cita.fecha_hora <= end,
        ))
        .order_by(Cita.fecha_hora)
    )
    citas = result.scalars().all()

    agenda = []
    for c in citas:
        agenda.append({
            "hora": c.fecha_hora.strftime("%H:%M"),
            "paciente": c.paciente.usuario.nombre_completo if c.paciente else "N/A",
            "documento": c.paciente.documento_numero if c.paciente else "N/A",
            "motivo": c.motivo or "No especificado",
            "estado": c.estado,
            "cita_id": str(c.id),
        })

    return json.dumps({
        "fecha": str(hoy),
        "total_citas": len(agenda),
        "agenda": agenda,
    }, ensure_ascii=False)


async def _tool_consultar_historial_paciente(
    db: AsyncSession,
    documento_numero: str,
    medico_id: str = None,
) -> str:
    """Get clinical history for an attended patient by document number."""
    pac_result = await db.execute(
        select(Paciente)
        .options(selectinload(Paciente.usuario))
        .where(Paciente.documento_numero == documento_numero)
    )
    paciente = pac_result.scalar_one_or_none()
    if not paciente:
        return json.dumps({"error": f"No se encontró paciente con documento {documento_numero}"})

    if medico_id:
        citas_atendidas_res = await db.execute(
            select(Cita)
            .where(Cita.paciente_id == paciente.id, Cita.medico_id == medico_id, Cita.estado == 'atendida')
        )
        if not citas_atendidas_res.scalars().first():
            return json.dumps({
                "error": "acceso_restringido_no_atendido",
                "mensaje": f"Por políticas de privacidad médica y Habeas Data clínico, solo tienes autorización para consultar el historial de pacientes que has atendido en consulta. El paciente con documento {documento_numero} no registra atenciones previas contigo."
            }, ensure_ascii=False)

    # Get clinical notes
    query = (
        select(ConsultaNota)
        .join(Cita, ConsultaNota.cita_id == Cita.id)
        .where(Cita.paciente_id == paciente.id)
    )
    if medico_id:
        query = query.where(Cita.medico_id == medico_id)

    notas_result = await db.execute(query.order_by(ConsultaNota.creado_en.desc()).limit(10))
    notas = notas_result.scalars().all()

    historial = []
    for n in notas:
        historial.append({
            "fecha": str(n.creado_en),
            "diagnostico": n.diagnostico or "Sin diagnóstico registrado",
            "tratamiento": n.tratamiento or "Sin tratamiento registrado",
            "receta": n.receta_medica or "Sin receta",
        })

    return json.dumps({
        "paciente": paciente.usuario.nombre_completo,
        "documento": documento_numero,
        "total_consultas_atendidas": len(historial),
        "historial": historial,
    }, ensure_ascii=False)


# ── Tool Dispatcher ──────────────────────────────────────────

TOOL_FUNCTIONS = {
    "consultar_disponibilidad": _tool_consultar_disponibilidad,
    "consultar_mis_citas": _tool_consultar_mis_citas,
    "registrar_paciente": _tool_registrar_paciente,
    "agendar_cita": _tool_agendar_cita,
    "consultar_agenda_hoy": _tool_consultar_agenda_hoy,
    "consultar_historial_paciente": _tool_consultar_historial_paciente,
}


# ── Orchestrator Class ───────────────────────────────────────

class LLMOrchestrator:
    """
    Orchestrates chat interactions with Groq Cloud LLM.
    Implements the tool-calling loop for zero-hallucination responses.
    """

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize the Groq client if API key is available."""
        if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_your_key"):
            try:
                from groq import Groq
                self.client = Groq(api_key=settings.GROQ_API_KEY)
            except ImportError:
                logger.warning("groq package not installed. Chat will use fallback mode.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

    async def _load_context(self, sesion_id: UUID, db: AsyncSession) -> list[dict]:
        """Load the last 6 messages from the session for context."""
        result = await db.execute(
            select(MensajeChat)
            .where(MensajeChat.sesion_id == sesion_id)
            .order_by(MensajeChat.creado_en.desc())
            .limit(6)
        )
        mensajes = list(reversed(result.scalars().all()))

        context = []
        for m in mensajes:
            role = "user" if m.emisor == "usuario" else "assistant"
            context.append({"role": role, "content": m.contenido})

        return context

    async def _execute_tool(
        self,
        tool_name: str,
        arguments: dict,
        db: AsyncSession,
    ) -> str:
        """Execute a tool function and return the result as JSON string."""
        func = TOOL_FUNCTIONS.get(tool_name)
        if not func:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})

        try:
            result = await func(db=db, **arguments)
            return result
        except Exception as e:
            logger.error(f"Tool execution error ({tool_name}): {e}")
            return json.dumps({"error": f"Error al ejecutar {tool_name}: {str(e)}"})

    async def chat(
        self,
        mensaje: str,
        sesion_id: UUID,
        usuario: Usuario,
        db: AsyncSession,
    ) -> str:
        """
        Main chat method. Orchestrates the conversation with Groq LLM.
        Implements the tool-calling loop.
        """
        # Fallback if no Groq client
        if not self.client:
            return (
                "🏥 ¡Hola! Soy MediCore, tu asistente médico virtual. "
                "Actualmente el servicio de IA no está configurado. "
                "Por favor, contacta al administrador para configurar la API Key de Groq. "
                "Mientras tanto, puedes usar el sistema de citas directamente desde el panel."
            )

        # Build messages with context
        context = await self._load_context(sesion_id, db)

        # Add user context to system prompt
        user_context = f"\n\nContexto del usuario actual:\n- Nombre: {usuario.nombre_completo}\n- Rol: {usuario.rol}\n- ID: {str(usuario.id)}"

        # If user is a patient, get their patient ID
        if usuario.rol == "paciente":
            pac_result = await db.execute(
                select(Paciente).where(Paciente.usuario_id == usuario.id)
            )
            paciente = pac_result.scalar_one_or_none()
            if paciente:
                user_context += f"\n- Paciente ID: {str(paciente.id)}\n- Documento: {paciente.documento_numero}"
        elif usuario.rol == "medico":
            med_result = await db.execute(
                select(Medico).where(Medico.usuario_id == usuario.id)
            )
            medico = med_result.scalar_one_or_none()
            if medico:
                user_context += f"\n- Médico ID: {str(medico.id)}"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + user_context},
            *context,
            {"role": "user", "content": mensaje},
        ]

        try:
            # First API call
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.0,
                max_tokens=350,
            )

            response_message = response.choices[0].message

            # Tool-calling loop (max 3 iterations to prevent infinite loops)
            iterations = 0
            while response_message.tool_calls and iterations < 3:
                iterations += 1

                # Append assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in response_message.tool_calls
                    ],
                })

                # Execute each tool call
                for tool_call in response_message.tool_calls:
                    func_name = tool_call.function.name
                    func_args = json.loads(tool_call.function.arguments)

                    logger.info(f"Executing tool: {func_name} with args: {func_args}")
                    tool_result = await self._execute_tool(func_name, func_args, db)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result,
                    })

                # Second API call with tool results
                response = self.client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    temperature=0.0,
                    max_tokens=350,
                )
                response_message = response.choices[0].message

            return response_message.content or "No pude generar una respuesta. ¿Podrías reformular tu pregunta?"

        except Exception as e:
            logger.error(f"LLM orchestration error: {e}")
            return (
                "⚠️ Lo siento, ocurrió un error al procesar tu solicitud. "
                "Por favor, intenta de nuevo en unos momentos. "
                f"Error: {str(e)[:100]}"
            )
