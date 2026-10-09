# 🏗️ ARQUITECTURA GENERAL — MEDICORE OS

> **Guía Ejecutiva y Didáctica del Sistema**  
> **Stack Tecnológico**: Angular 19 + Django REST Framework + PostgreSQL  
> **Objetivo**: Explicación clara de la arquitectura del proyecto para sustentación académica.

---

## 1. 🏛️ Separación del Proyecto en 3 Capas (Three-Tier Architecture)

El sistema opera bajo una arquitectura cliente-servidor desacoplada con tres capas independientes:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: Angular 19 (SPA)                               │
│    • Componentes Standalone, Angular Signals, Tailwind CSS   │
│    • Portales: Paciente, Médico y Administrador              │
│    • Cliente HTTP con interceptores JWT Bearer              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Peticiones HTTPS / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND: Django 5.1 + Django REST Framework              │
│    • Control de acceso RBAC por endpoints (`require_role`)  │
│    • Copiloto IA con failover (Groq Cloud -> Qwen / Llama)  │
│    • Auditoría inmutable automática en base de datos        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Conexión ORM / SQL
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BASE DE DATOS: PostgreSQL / SQLite Relacional (3FN)      │
│    • Tablas normalizadas, restricciones de integridad referencial│
│    • Índices compuestos para disponibilidad y auditoría     │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por qué esta separación?
1. **Desacoplamiento total**: El frontend Angular solo consume contratos JSON. Si se cambia la interfaz gráfica o se crea una app móvil, el backend no sufre ninguna modificación.
2. **Seguridad real**: Toda la lógica de autorización vive en el backend; el usuario no puede vulnerar reglas del negocio manipulando el código del navegador.
3. **Escalabilidad y mantenibilidad**: La base de datos relacional asegura consistencia estricta (transacciones ACID) y evita datos duplicados.

---

## 2. 📁 Estructura de Carpetas del Backend (`backend/apps/`)

El backend de Django está modularizado en aplicaciones de responsabilidad única:

| Carpeta / Módulo | Responsabilidad Principal |
|:---|:---|
| `backend/medicore/` | **Configuración global**: `settings.py` (CORS, JWT, base de datos, drf-spectacular), `urls.py` (enrutamiento general), y `wsgi.py`. |
| `apps/authentication/` | **Identidad y Seguridad**: Modelos `Usuario`, `Rol`, `Permiso`, `RolPermiso`. Manejo de hashing bcrypt, autenticación por Bearer Tokens JWT y decoradores RBAC (`require_role`). |
| `apps/clinica/` | **Entidades Hospitalarias**: Sedes físicas (`Sede`), especialidades médicas (`Especialidad`), perfiles profesionales (`Medico`), turnos (`HorarioMedico`) y pacientes (`Paciente`). |
| `apps/citas/` | **Agendamiento y Atención**: Disponibilidad de horarios en tiempo real, reserva de citas (`Cita`), notas médicas de consulta (`ConsultaNota`) y trámites (`PQRSolicitud`). |
| `apps/pagos/` | **Módulo Financiero**: Registro de pagos (`Pago`), métodos de pago, estados de cobro y webhooks de pasarelas de pago sandbox. |
| `apps/chatbot/` | **Copiloto Clínico Inteligente**: Orquestador LLM multi-proveedor (Groq Cloud), historial de chat (`SesionChat`, `MensajeChat`), ejecución determinista de herramientas (*tool calling*) y salvaguardas de seguridad. |
| `apps/auditoria/` | **Trazabilidad Inmutable**: Registro automático de eventos (`RegistroAuditoria`). Inmodificable e ineliminable a nivel de ORM. Permite auditar qué hizo un humano vs. qué hizo el bot de IA. |

---

## 3. 🔄 Ciclo de Vida de una Petición Típica (Paso a Paso)

### 📌 Ejemplo Real: *"El Paciente agenda una cita médica"*

```
[Angular (Frontend)]
   │ 1. El paciente selecciona médico, fecha y hora en el portal.
   │ 2. Clic en "Confirmar Cita" -> Dispara servicio de Angular:
   │    POST /api/citas/  Headers: { Authorization: "Bearer eyJhbGci..." }
   │    Payload: { "medico_id": "uuid-...", "fecha_hora": "2026-10-15T09:00:00Z" }
   ▼
[Django Router & Middleware]
   │ 3. CorsMiddleware valida que el origen sea permitido (ej. localhost:4200).
   │ 4. medicore/urls.py redirige hacia apps.citas.urls.
   ▼
[Autenticación & Permisos DRF]
   │ 5. JWTAuthentication extrae el Bearer token, verifica la firma criptográfica (HS256)
   │    y carga la instancia del request.user en la memoria de la petición.
   │ 6. require_role(['paciente', 'admin']) valida que el usuario tenga rol autorizado.
   ▼
[CitaCreateView & Serializer]
   │ 7. CitaCreateSerializer valida tipos de datos y formato ISO-8601 de la fecha.
   │ 8. Regla de Negocio Anti-Colisión:
   │    SELECT EXISTS(SELECT 1 FROM citas WHERE medico_id=... AND fecha_hora=... AND estado IN ('confirmada','pendiente_pago'))
   │    Si el médico ya está ocupado en ese horario, retorna HTTP 409 Conflict de inmediato.
   ▼
[Persistencia en Base de Datos (ORM)]
   │ 9. Cita.objects.create(): Inserta la nueva fila en la tabla 'citas'.
   │ 10. Pago.objects.create(): Genera automáticamente la orden de cobro en estado 'pendiente'
   │     con el precio base de la especialidad del médico.
   ▼
[Auditoría Inmutable Automática]
   │ 11. registrar_auditoria(accion='cita_creada', entidad_tipo='Cita', entidad_id=cita.id, origen='humano_paciente'):
   │     Inserta el evento en 'auditoria_registros' con timestamp, usuario, IP y rol.
   ▼
[Respuesta HTTP al Cliente]
   │ 12. CitaResponseSerializer transforma el modelo Cita a formato JSON estructurado.
   │ 13. Retorna HTTP 201 Created al cliente Angular.
   ▼
[Angular (UI Update)]
   │ 14. El servicio recibe el JSON, actualiza la Signal de citas (`citasSignal.update(...)`)
   │     y la interfaz se refresca instantáneamente mostrando la cita agendada.
```

---

## 4. 🧠 El Copiloto Clínico con IA (¿Cómo se integra?)

Cuando el paciente conversa con el asistente virtual en lugar de usar los formularios tradicionales:
1. Angular envía el mensaje a `POST /api/chat/mensaje`.
2. El **`LLMOrchestrator`** consulta las herramientas registradas (*tool calling*).
3. Si el usuario escribe *"Quiero cita con dermatología el lunes"*, el modelo de lenguaje **no inventa** horarios: invoca la función interna `consultar_disponibilidad` ejecutada contra la base de datos real.
4. Una vez el usuario confirma, el orquestador llama internamente a `agendar_cita` y registra la auditoría con `origen='bot_llm'`, manteniendo la misma integridad y seguridad que el flujo web manual.
