"""
MediCore OS — LLM Orchestrator (Groq Cloud) with Django ORM
Zero-hallucination medical assistant with tool calling.
"""

import json
import logging
from datetime import date, datetime, time
from django.conf import settings
from django.utils import timezone
from apps.authentication.models import Usuario
from apps.clinica.models import Especialidad, Medico, Paciente
from apps.citas.models import Cita, ConsultaNota, PQRSolicitud
from apps.pagos.models import Pago
from apps.citas.services import get_disponibilidad
from apps.chatbot.models import MensajeChat

logger = logging.getLogger(__name__)

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
9. CANCELACIÓN DE CITAS Y REEMBOLSOS:
   - Si el usuario quiere cancelar una cita pero no especifica cuál, consulta primero `consultar_mis_citas` para identificarla.
   - Si la cita está en estado 'pendiente_pago' (sin pagar), procede a cancelarla usando la herramienta `cancelar_cita`.
   - Si la cita YA FUE PAGADA o está en estado 'confirmada': NO puedes cancelarla de inmediato. Explica de forma empática que, debido a que el pago ya fue procesado, se debe radicar una solicitud formal de PQR (Petición, Queja o Reclamo) para el reembolso del dinero. Solicita el motivo si no fue provisto y utiliza la herramienta `solicitar_pqr_reembolso`. Confírmale al paciente que su solicitud de PQR fue registrada con éxito y que el equipo administrativo la evaluará.
10. FORMATO DE HORARIOS:
   - Al presentar opciones de horarios disponibles al paciente, preséntalos SIEMPRE en formato de 12 horas con a.m. o p.m. (por ejemplo: '8:00 a. m.', '9:30 a. m.', '2:00 p. m.').
"""

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
    {
        "type": "function",
        "function": {
            "name": "cancelar_cita",
            "description": "Cancela una cita médica que se encuentra en estado 'pendiente_pago' (sin pagar). Si la cita ya está pagada o confirmada, la herramienta rechaza la cancelación directa e indica que se debe radicar una PQR de reembolso.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cita_id": {
                        "type": "string",
                        "description": "UUID de la cita médica a cancelar",
                    },
                },
                "required": ["cita_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "solicitar_pqr_reembolso",
            "description": "Registra una solicitud formal de PQR (Petición, Queja, Reclamo) y devolución/reembolso de dinero para una cita médica que ya fue pagada. Registra la solicitud en estado 'pendiente_revision' para administración.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cita_id": {
                        "type": "string",
                        "description": "UUID de la cita médica sobre la que se solicita el reembolso",
                    },
                    "motivo": {
                        "type": "string",
                        "description": "Motivo o explicación del paciente para solicitar la cancelación y reembolso",
                    },
                },
                "required": ["cita_id", "motivo"],
            },
        },
    },
]


def _tool_consultar_disponibilidad(especialidad_nombre: str, fecha: str, genero: str = None) -> str:
    try:
        fecha_dt = date.fromisoformat(fecha)
    except ValueError:
        return json.dumps({"error": "Formato de fecha inválido. Use YYYY-MM-DD"})

    data, err = get_disponibilidad(
        fecha=fecha_dt,
        especialidad_nombre=especialidad_nombre,
        genero=genero,
    )
    if err:
        return json.dumps({"error": err})

    # Format slots
    slots_formatted = [
        {
            "medico_id": str(s["medico_id"]),
            "medico_nombre": s["medico_nombre"],
            "genero": s.get("genero", "M"),
            "sede": s["sede"],
            "hora": s["hora_inicio"].strftime("%H:%M") if isinstance(s["hora_inicio"], time) else str(s["hora_inicio"]),
            "duracion_minutos": s["duracion_minutos"],
            "precio": s["precio"],
        }
        for s in data["slots"]
    ]

    return json.dumps({
        "especialidad": data["especialidad"],
        "fecha": fecha,
        "filtro_genero": genero or "todos",
        "slots_disponibles": slots_formatted,
        "total": len(slots_formatted),
    }, ensure_ascii=False)


def _tool_consultar_mis_citas(paciente_id: str) -> str:
    try:
        paciente = Paciente.objects.select_related('usuario').get(id=paciente_id)
    except (Paciente.DoesNotExist, ValueError):
        return json.dumps({"error": "Paciente no encontrado"})

    citas = Cita.objects.filter(
        paciente=paciente,
        estado__in=["pendiente_pago", "confirmada"],
    ).select_related('medico__usuario', 'medico__especialidad', 'sede').order_by('fecha_hora')

    citas_list = []
    for c in citas:
        citas_list.append({
            "cita_id": str(c.id),
            "medico": c.medico.usuario.nombre_completo,
            "especialidad": c.medico.especialidad.nombre,
            "sede": c.sede.nombre,
            "fecha_hora": c.fecha_hora.strftime("%Y-%m-%d %H:%M"),
            "estado": c.estado,
            "motivo": c.motivo or "Control general",
        })

    return json.dumps({
        "paciente": paciente.usuario.nombre_completo,
        "total_citas": len(citas_list),
        "citas": citas_list,
    }, ensure_ascii=False)


def _tool_registrar_paciente(nombre: str, documento: str, correo: str, telefono: str) -> str:
    existing_paciente = Paciente.objects.filter(documento_numero=documento).first()
    if existing_paciente:
        return json.dumps({
            "mensaje": "El paciente ya se encuentra registrado en el sistema.",
            "paciente_id": str(existing_paciente.id),
            "nombre": existing_paciente.usuario.nombre_completo,
            "documento": existing_paciente.documento_numero,
        }, ensure_ascii=False)

    user = Usuario.objects.filter(correo=correo).first()
    if not user:
        user = Usuario.objects.create_user(
            correo=correo,
            password="Password123!",
            nombre_completo=nombre,
            rol="paciente",
            telefono=telefono,
        )

    paciente = Paciente.objects.create(
        usuario=user,
        documento_tipo="CC",
        documento_numero=documento,
    )

    return json.dumps({
        "mensaje": "Paciente registrado exitosamente.",
        "paciente_id": str(paciente.id),
        "nombre": user.nombre_completo,
        "documento": documento,
    }, ensure_ascii=False)


def _tool_agendar_cita(paciente_id: str, medico_id: str, fecha_hora: str, motivo: str) -> str:
    try:
        paciente = Paciente.objects.select_related('usuario').get(id=paciente_id)
    except (Paciente.DoesNotExist, ValueError):
        return json.dumps({"error": f"Paciente con ID {paciente_id} no encontrado"})

    try:
        medico = Medico.objects.select_related('usuario', 'especialidad', 'sede').get(id=medico_id)
    except (Medico.DoesNotExist, ValueError):
        return json.dumps({"error": f"Médico con ID {medico_id} no encontrado"})

    try:
        fecha_dt = datetime.fromisoformat(fecha_hora)
    except ValueError:
        return json.dumps({"error": "Formato de fecha_hora inválido. Use YYYY-MM-DD HH:MM"})

    # Check for conflict
    conflict = Cita.objects.filter(
        medico=medico,
        fecha_hora=fecha_dt,
        estado__in=["pendiente_pago", "confirmada"],
    ).exists()

    if conflict:
        return json.dumps({
            "error": "El horario seleccionado ya no está disponible. Por favor elija otro horario."
        })

    cita = Cita.objects.create(
        paciente=paciente,
        medico=medico,
        sede=medico.sede,
        fecha_hora=fecha_dt,
        duracion_minutos=medico.duracion_cita_minutos,
        motivo=motivo,
        estado="pendiente_pago",
    )

    return json.dumps({
        "mensaje": "Cita agendada exitosamente.",
        "cita_id": str(cita.id),
        "paciente": paciente.usuario.nombre_completo,
        "medico": medico.usuario.nombre_completo,
        "especialidad": medico.especialidad.nombre,
        "sede": medico.sede.nombre,
        "fecha_hora": cita.fecha_hora.strftime("%Y-%m-%d %H:%M"),
        "estado": cita.estado,
        "precio": float(medico.especialidad.precio_base),
        "instrucciones_pago": "La cita está en estado 'pendiente_pago'. Puede proceder al pago con Wompi para confirmarla.",
    }, ensure_ascii=False)


def _tool_consultar_agenda_hoy(medico_id: str) -> str:
    try:
        medico = Medico.objects.select_related('usuario', 'especialidad', 'sede').get(id=medico_id)
    except (Medico.DoesNotExist, ValueError):
        return json.dumps({"error": f"Médico con ID {medico_id} no encontrado"})

    tz = timezone.get_current_timezone()
    hoy = timezone.localdate()
    start_of_day = timezone.make_aware(datetime.combine(hoy, time(0, 0)), tz)
    end_of_day = timezone.make_aware(datetime.combine(hoy, time(23, 59, 59)), tz)

    citas = Cita.objects.filter(
        medico=medico,
        fecha_hora__range=(start_of_day, end_of_day),
    ).select_related('paciente__usuario').order_by('fecha_hora')

    agenda = []
    for c in citas:
        agenda.append({
            "cita_id": str(c.id),
            "hora": c.fecha_hora.strftime("%H:%M"),
            "paciente": c.paciente.usuario.nombre_completo,
            "estado": c.estado,
            "motivo": c.motivo or "Control",
        })

    return json.dumps({
        "medico": medico.usuario.nombre_completo,
        "especialidad": medico.especialidad.nombre,
        "fecha": str(hoy),
        "total_citas": len(agenda),
        "agenda": agenda,
    }, ensure_ascii=False)


def _tool_consultar_historial_paciente(documento_numero: str) -> str:
    paciente = Paciente.objects.filter(documento_numero=documento_numero).select_related('usuario').first()
    if not paciente:
        return json.dumps({"error": f"No se encontró paciente con documento {documento_numero}"})

    notas = ConsultaNota.objects.filter(
        cita__paciente=paciente
    ).order_by('-creado_en')[:10]

    historial = []
    for n in notas:
        historial.append({
            "fecha": n.creado_en.strftime("%Y-%m-%d"),
            "diagnostico": n.diagnostico or "Sin diagnóstico registrado",
            "tratamiento": n.tratamiento or "Sin tratamiento registrado",
            "receta": n.receta_medica or "Sin receta",
        })

    return json.dumps({
        "paciente": paciente.usuario.nombre_completo,
        "documento": documento_numero,
        "total_consultas": len(historial),
        "historial": historial,
    }, ensure_ascii=False)


def _tool_cancelar_cita(cita_id: str) -> str:
    try:
        cita = Cita.objects.select_related('paciente__usuario', 'medico__usuario', 'medico__especialidad').get(id=cita_id)
    except (Cita.DoesNotExist, ValueError):
        return json.dumps({"error": f"No se encontró ninguna cita con el identificador {cita_id}."})

    # Verificar si la cita ya está pagada
    pago_aprobado = Pago.objects.filter(cita=cita, estado="aprobado").exists()

    if pago_aprobado or cita.estado == "confirmada":
        return json.dumps({
            "error": "cita_ya_pagada",
            "mensaje": (
                f"La cita de {cita.medico.especialidad.nombre} programada para el {cita.fecha_hora.strftime('%Y-%m-%d %H:%M')} "
                "ya fue pagada y confirmada. Por políticas clínicas y de seguridad financiera, las citas pagadas no pueden "
                "cancelarse directamente. Para solicitar la devolución del dinero, es necesario radicar una solicitud de PQR "
                "(Petición, Queja o Reclamo) de reembolso que será evaluada por el área administrativa."
            ),
            "cita_id": str(cita.id),
            "requiere_pqr": True,
        }, ensure_ascii=False)

    if cita.estado == "cancelada":
        return json.dumps({
            "mensaje": "La cita ya se encontraba cancelada en el sistema.",
            "cita_id": str(cita.id),
        }, ensure_ascii=False)

    cita.estado = "cancelada"
    cita.save(update_fields=['estado'])

    return json.dumps({
        "mensaje": "Cita cancelada exitosamente.",
        "cita_id": str(cita.id),
        "especialidad": cita.medico.especialidad.nombre,
        "medico": cita.medico.usuario.nombre_completo,
        "fecha_hora": cita.fecha_hora.strftime("%Y-%m-%d %H:%M"),
        "estado": "cancelada",
    }, ensure_ascii=False)


def _tool_solicitar_pqr_reembolso(cita_id: str, motivo: str) -> str:
    try:
        cita = Cita.objects.select_related('paciente__usuario', 'medico__usuario', 'medico__especialidad').get(id=cita_id)
    except (Cita.DoesNotExist, ValueError):
        return json.dumps({"error": f"No se encontró la cita con identificador {cita_id}."})

    pqr = PQRSolicitud.objects.create(
        cita=cita,
        paciente=cita.paciente,
        motivo=motivo,
        estado="pendiente_revision",
    )

    return json.dumps({
        "mensaje": "Solicitud de PQR y reembolso radicada exitosamente.",
        "pqr_id": str(pqr.id),
        "cita_id": str(cita.id),
        "paciente": cita.paciente.usuario.nombre_completo,
        "especialidad": cita.medico.especialidad.nombre,
        "medico": cita.medico.usuario.nombre_completo,
        "fecha_cita": cita.fecha_hora.strftime("%Y-%m-%d %H:%M"),
        "motivo": motivo,
        "estado": pqr.estado,
        "fecha_radicacion": pqr.creado_en.strftime("%Y-%m-%d %H:%M"),
        "aviso": "Su solicitud ha quedado registrada en el sistema bajo el número de radicado indicado y será revisada por el área administrativa.",
    }, ensure_ascii=False)


TOOL_FUNCTIONS = {
    "consultar_disponibilidad": _tool_consultar_disponibilidad,
    "consultar_mis_citas": _tool_consultar_mis_citas,
    "registrar_paciente": _tool_registrar_paciente,
    "agendar_cita": _tool_agendar_cita,
    "consultar_agenda_hoy": _tool_consultar_agenda_hoy,
    "consultar_historial_paciente": _tool_consultar_historial_paciente,
    "cancelar_cita": _tool_cancelar_cita,
    "solicitar_pqr_reembolso": _tool_solicitar_pqr_reembolso,
}


class LLMOrchestrator:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_your_key"):
            try:
                from groq import Groq
                self.client = Groq(api_key=settings.GROQ_API_KEY)
            except ImportError:
                logger.warning("groq package not installed. Chat will use fallback mode.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

    def _load_context(self, sesion_id) -> list[dict]:
        mensajes = list(
            MensajeChat.objects.filter(sesion_id=sesion_id)
            .order_by('-creado_en')[:6]
        )
        mensajes.reverse()

        context = []
        for m in mensajes:
            role = "user" if m.emisor == "usuario" else "assistant"
            context.append({"role": role, "content": m.contenido})
        return context

    def _execute_tool(self, tool_name: str, arguments: dict) -> str:
        func = TOOL_FUNCTIONS.get(tool_name)
        if not func:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})

        try:
            return func(**arguments)
        except Exception as e:
            logger.error(f"Tool execution error ({tool_name}): {e}")
            return json.dumps({"error": f"Error al ejecutar {tool_name}: {str(e)}"})

    def chat(self, mensaje: str, sesion_id, usuario: Usuario) -> str:
        if not self.client:
            return (
                "🏥 ¡Hola! Soy MediCore, tu asistente médico virtual. "
                "Actualmente el servicio de IA no está configurado. "
                "Por favor, contacta al administrador para configurar la API Key de Groq. "
                "Mientras tanto, puedes usar el sistema de citas directamente desde el panel."
            )

        context = self._load_context(sesion_id)

        user_context = f"\n\nContexto del usuario actual:\n- Nombre: {usuario.nombre_completo}\n- Rol: {usuario.rol}\n- ID: {str(usuario.id)}"
        if usuario.rol == "paciente":
            paciente = Paciente.objects.filter(usuario=usuario).first()
            if paciente:
                user_context += f"\n- Paciente ID: {str(paciente.id)}\n- Documento: {paciente.documento_numero}"
        elif usuario.rol == "medico":
            medico = Medico.objects.filter(usuario=usuario).first()
            if medico:
                user_context += f"\n- Médico ID: {str(medico.id)}"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + user_context},
            *context,
            {"role": "user", "content": mensaje},
        ]

        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.0,
                max_tokens=350,
            )

            response_message = response.choices[0].message
            iterations = 0

            while response_message.tool_calls and iterations < 3:
                iterations += 1
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

                for tool_call in response_message.tool_calls:
                    func_name = tool_call.function.name
                    func_args = json.loads(tool_call.function.arguments)

                    logger.info(f"Executing tool: {func_name} with args: {func_args}")
                    tool_result = self._execute_tool(func_name, func_args)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result,
                    })

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
