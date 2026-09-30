# Diagnóstico Técnico: Inestabilidad y Falsos Positivos en la Detección de Calendario/Horarios en el Chat

## 1. Resumen Ejecutivo
A lo largo de las iteraciones anteriores de MediCore, el frontend presentaba un defecto crítico recurrente: tras confirmar el agendamiento de una cita, tras una cancelación o ante respuestas de error, volvían a aparecer repentinamente en la pantalla del usuario el calendario de selección de días o la botonera de horarios.

Este informe detalla las causas raíz de este comportamiento, analiza la interacción negativa de los múltiples parches reactivos que se superpusieron en el código y fundamenta por qué la única solución definitiva y robusta es **desacoplar el renderizado del texto del LLM e implementar una máquina de estados finitos en el backend con campos estructurados (`requiere_seleccion`)**.

---

## 2. Causa Raíz Principal: Detección Heurística basada en Texto

El diseño original delegaba la decisión de renderizado de la interfaz al análisis del texto generado por el LLM o a marcadores textuales incrustados (`<!--CALENDAR:...-->` y <!--SLOTS:...-->`). 

### Problemas Fundamentales de este Paradigma:
1. **Ambigüedad Semántica del LLM:** Un modelo generativo (Groq / Llama 3.1) puede redactar una confirmación usando frases como: *"Tu cita ha sido confirmada para las 08:00 AM el 24 de septiembre. Recuerda que tenemos horarios disponibles para tus controles futuros"*. Cualquier heurística basada en regex detecta *"horarios disponibles"* o *"08:00 AM"* y asume falsamente que debe pintar botones.
2. **Ciclo de Inyección de Historial:** Al enviar el historial de mensajes de la sesión al LLM en el siguiente turno conversacional, si los marcadores `<!--SLOTS:...-->` o las menciones de horas quedaban en el historial del `assistant`, el modelo generaba texto condicionado por ese contexto previo, recreando el disparador en el siguiente turno.
3. **Falta de Fuente Única de la Verdad:** El frontend "adivinaba" si el usuario estaba a punto de elegir hora o si ya había terminado, en lugar de recibir una orden unívoca del backend sobre el estado del flujo.

---

## 3. Catálogo de Parches Anteriores y sus Conflictos Mutuos

Al examinar `apps/chatbot/services/llm_orchestrator.py` y los componentes de frontend, se identificaron cuatro capas de parches acumulados que competían entre sí:

### Parche 1: Lista Negra de Palabras de Negación (`is_negation_response`)
- **Implementación:** Una lista estática de más de 24 expresiones en español (`"no hay horario"`, `"no tenemos cupos"`, `"sin disponibilidad"`, `"lamentablemente no"`, etc.) evaluadas con expresiones regulares sobre la respuesta final.
- **Punto de Quiebre:** Altamente frágil ante variaciones de redacción del LLM. Por ejemplo, si el LLM respondía: *"No fue posible encontrar cupos en la mañana, pero sí en la tarde"* o *"Confirmamos tu cita con éxito"*, el analizador fallaba en ambos sentidos (falso positivo de negación o falso negativo).

### Parche 2: Inyección de Calendario Forzado (`is_broad_date_query`)
- **Implementación:** Si el texto del usuario contenía palabras como *"esta semana"*, *"qué días"* o *"agendar cita"*, y no había calendario generado por tools, se forzaba la invocación de `_tool_consultar_dias_disponibles` y se inyectaba el marcador `<!--CALENDAR:...-->`.
- **Conflicto:** Cuando el usuario decía *"agendar cita"* al inicio, el parche inyectaba el calendario; pero si el usuario decía *"muchas gracias por agendar la cita"* al final para agradecer la confirmación, el parche volvía a detectar *"agendar cita"* e inyectaba de nuevo el calendario sobre el mensaje de despedida.

### Parche 3: Recuperador Forzado de Horarios (`seleccione el que prefiera`)
- **Implementación:** Si el texto del LLM contenía frases como *"selecciona el que prefiera"*, pero `available_slots_12h` estaba vacío, el orquestador volvía a escanear el historial con regex de fechas y forzaba una consulta a la BD.
- **Conflicto:** Se ejecutaba incluso si el mensaje era informativo o si ya se había seleccionado un horario, generando slots fantasma duplicados.

### Parche 4: Fallback de Agendamiento Determinista (`DETERMINISTIC SCHEDULING SAFEGUARD`)
- **Implementación:** Si el LLM omitía llamar la tool `agendar_cita` a pesar de que el usuario pedía hora, una heurística intentaba extraer la fecha/hora con regex de los últimos cuatro mensajes y agendar directamente.
- **Conflicto:** Al intentar reescribir `final_content` y vaciar `available_slots_12h = []`, no cancelaba la evaluación de otros bloques de código que volvían a agregar marcadores más abajo.

---

## 4. Matriz de Interacción Fallida entre Parches

| Escenario de Usuario | Parche Activado | Efecto Secundario | Resultado Indeseado en Pantalla |
|---|---|---|---|
| Paciente elige hora: "A las 8:00 AM" | Fallback de Agendamiento + Heurística de slots | Se agenda la cita, pero el bloque de tags final evalúa `available_slots_12h` remanente | La cita queda agendada, pero reaparece la lista de botones de horario debajo del mensaje de éxito. |
| Paciente agradece: "Listo, gracias por confirmar mi cita" | Parche 2 (`is_broad_date_query` detecta "cita") | Asume que es una nueva consulta de fechas abiertas | Muestra el calendario mensual tras haber confirmado la cita. |
| Paciente cancela cita pagada | Tool `solicitar_pqr_reembolso` responde que se radicó PQR | El LLM menciona que puede "agendar una nueva cita en otro momento" | El sistema detecta "agendar" y vuelve a mostrar calendarios en el radicado de PQR. |

---

## 5. La Solución de Raíz: Arquitectura de Máquina de Estados Estructurada

Para erradicar definitivamente el bug sin agregar ningún parche textual adicional, se implementa la siguiente arquitectura técnica:

```
[ Solicitud del Usuario ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND CHAT ORCHESTRATOR                  │
│                                                        │
│  1. Guardrail Temático Determinista (Anti Off-Topic)  │
│  2. Máquina de Estados del Flujo (SesionChat.estado)   │
│     - Intención: agendar | cancelar | pqr | consulta   │
│     - Paso: especialidad → dia → hora → motivo → fin   │
│  3. Invocación Determinista de Tools Groq              │
│  4. Decisión de UI Estructurada en Respuesta JSON:     │
│     - requiere_seleccion: "ninguna" | "dia" | "hora"  │
│     - dias_disponibles: [ "YYYY-MM-DD", ... ]          │
│     - horarios: [ "8:00 a. m.", ... ]                  │
│     - Sin marcadores HTML/comentarios en el texto      │
└────────────────────────────────────────────────────────┘
           │
           │ (Contrato JSON Estructurado)
           ▼
┌────────────────────────────────────────────────────────┐
│                 FRONTEND ANGULAR                       │
│                                                        │
│  - Renderiza texto limpio del asistente                │
│  - *ngIf="msg.requiere_seleccion === 'dia'"            │
│      -> <app-chat-calendar-picker>                     │
│  - *ngIf="msg.requiere_seleccion === 'hora'"           │
│      -> Botonera de Horarios                           │
│  - Si requiere_seleccion === 'ninguna' (o undefined)   │
│      -> NUNCA renderiza calendarios ni horarios        │
└────────────────────────────────────────────────────────┘
```

### Reglas Inmutables del Nuevo Contrato:
1. **Ninguna decisión de UI depende del texto:** Ni el frontend ni el backend buscan palabras clave en el texto en español para decidir si pintar un botón.
2. **`requiere_seleccion` es la única fuente de verdad:**
   - `"dia"`: El sistema espera que el paciente elija un día. Provee `dias_disponibles`.
   - `"hora"`: El sistema espera que el paciente elija una hora. Provee `horarios`.
   - `"ninguna"`: Mensajes informativos, confirmaciones de cita agendada, cancelaciones, radicados de PQR, respuestas de consulta y orientaciones médicas.
3. **Cero marcadores en texto:** Se eliminan totalmente los tags `<!--CALENDAR:...-->` y `<!--SLOTS:...-->`. El texto viaja 100% limpio y apto para accesibilidad y lectura en pantalla.
