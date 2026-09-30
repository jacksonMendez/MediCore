# MediCore OS — Sistema Central de Auditoría Clínica e Inmutable

## 1. Introducción y Propósito
El módulo de Auditoría de **MediCore OS** (`apps.auditoria`) provee una traza inmutable, cronológica y verificable de todos los eventos críticos de negocio en la plataforma. 

A diferencia de un registro de logs convencional, el sistema de auditoría:
1. **Es inmutable a nivel de ORM y base de datos:** una vez creado un registro, está programáticamente prohibida su modificación o eliminación física.
2. **Es independiente del cliente frontend:** las auditorías se disparan automáticamente en el servidor (servicios internos, controladores REST y herramientas del LLM), garantizando que ningún usuario o cliente altere o evada la trazabilidad.
3. **Distingue el origen del evento:** diferencia inequívocamente entre acciones ejecutadas por humanos (pacientes, médicos, administradores, agentes) y acciones ejecutadas autónomamente por el asistente de inteligencia artificial (`bot_llm`) o procesos en segundo plano (`sistema`).

---

## 2. Modelo de Datos: `RegistroAuditoria`

Tabla en base de datos: `auditoria_registros`.

### 2.1 Definición de Campos

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | UUID (PK) | No | Identificador único universal del registro de auditoría. |
| `usuario` | FK (`Usuario`) | Sí | Usuario autenticado asociado al evento (`on_delete=SET_NULL`). |
| `rol_en_el_momento` | CharField(40) | Sí | Rol snapshot en el instante exacto del evento (`paciente`, `medico`, `admin`, etc.). |
| `accion` | CharField(60) | No | Código estandarizado de la acción (indexado). |
| `entidad_tipo` | CharField(60) | No | Nombre del recurso afectado (`Cita`, `Pago`, `PQRSolicitud`, `Usuario`, etc.). |
| `entidad_id` | CharField(64) | Sí | Identificador (UUID o clave) del recurso afectado (indexado). |
| `timestamp` | DateTime | No | Fecha y hora exacta con zona horaria del evento (auto, indexado). |
| `datos_cambio` | JSONField | No | Diccionario JSON con el delta de estados o metadatos del evento. |
| `origen` | CharField(40) | No | Canal/agente que ejecutó el evento (indexado). |
| `ip` | GenericIPAddress | Sí | Dirección IP de origen de la solicitud HTTP. |
| `session_id` | CharField(64) | Sí | ID de sesión de chat o contexto conversacional si aplica. |

### 2.2 Catálogos de Origen y Acción

#### Orígenes (`origen`):
- `bot_llm`: Acciones ejecutadas por el orquestador del chatbot Groq.
- `humano_paciente`: Acciones ejecutadas por pacientes desde el portal web/app.
- `humano_medico`: Acciones ejecutadas por médicos desde su panel clínico.
- `humano_admin`: Acciones de gestión y supervisión de administradores.
- `humano_agente`: Acciones de soporte y PQR por agentes de atención.
- `sistema`: Disparadores automáticos (webhooks de pagos, tareas cron, etc.).

#### Acciones (`accion`):
- `cita_creada`
- `cita_cancelada`
- `cita_reagendada`
- `cita_estado_cambiado`
- `pqr_radicada`
- `pqr_aprobada`
- `pqr_rechazada`
- `pago_simulado`
- `pago_confirmado`
- `pago_rechazado`
- `medico_creado` / `medico_editado`
- `sede_creada` / `sede_editada`
- `especialidad_creada` / `especialidad_editada`
- `login_exitoso` / `login_fallido`

### 2.3 Índices Compuestos para Alto Rendimiento
Para garantizar consultas ultra rápidas en el backoffice de auditoría, se configuraron los siguientes índices en la base de datos:
1. `idx_audit_user_time`: `(usuario, timestamp)` — Auditoría por usuario en ventanas de tiempo.
2. `idx_audit_entity`: `(entidad_tipo, entidad_id)` — Trazabilidad histórica completa de una entidad concreta (ej. todo el historial de la Cita #123).
3. `idx_audit_action_origin`: `(accion, origen)` — Métricas de acciones filtradas por canal (ej. cuántas citas creó el `bot_llm` vs. `humano_paciente`).

---

## 3. Garantía de Inmutabilidad Técnica

La inmutabilidad se implementa en dos niveles:

### 3.1 Nivel Modelo ORM
En `apps.auditoria.models.RegistroAuditoria`:
```python
def save(self, *args, **kwargs):
    if not self._state.adding and self.pk:
        raise PermissionDenied("Los registros de auditoría son inmutables y no pueden modificarse.")
    super().save(*args, **kwargs)

def delete(self, *args, **kwargs):
    raise PermissionDenied("Los registros de auditoría son inmutables y no pueden eliminarse.")
```
Cualquier intento programático de llamar a `.save()` sobre una instancia existente o invocar `.delete()` arrojará una excepción `PermissionDenied`.

### 3.2 Nivel Django Admin
En `apps.auditoria.admin.py`:
```python
@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'accion', 'origen', 'usuario', 'entidad_tipo', 'entidad_id')
    readonly_fields = [f.name for f in RegistroAuditoria._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
```
El panel de administración de Django ofrece visualización completa de los registros pero oculta y prohíbe permanentemente botones de adición, edición o borrado.

---

## 4. Servicio Central: `registrar_auditoria`

Ubicado en `apps.auditoria.services.py`, proporciona una firma desacoplada y robusta:

```python
def registrar_auditoria(
    accion: str,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    usuario: Any = None,
    rol_en_el_momento: Optional[str] = None,
    datos_cambio: Optional[Dict[str, Any]] = None,
    origen: Optional[str] = None,
    ip: Optional[str] = None,
    session_id: Optional[str] = None,
) -> RegistroAuditoria:
```

### Resolución Automática:
- **Rol:** Si no se especifica explícitamente, se extrae del objeto `usuario.rol_id` o `usuario.rol.codigo`.
- **Origen:** Si no se proporciona, mapea automáticamente según el rol (`paciente` → `humano_paciente`, `medico` → `humano_medico`, `admin` → `humano_admin`, o por defecto `sistema`).

---

## 5. Puntos de Integración

### 5.1 Endpoints REST
- **`POST /api/auth/login/` (`apps.authentication.views.LoginView`):** Registra `login_exitoso` con IP y rol del usuario.
- **`POST /api/citas/crear/` (`apps.citas.views.CitaCreateView`):** Registra `cita_creada` con `entidad_tipo='Cita'`, fecha_hora y médico asignado.
- **`PATCH /api/citas/<id>/estado/` (`apps.citas.views.CambiarEstadoCitaView`):** Registra `cita_cancelada` o `cita_estado_cambiado` con estado anterior y nuevo.
- **`POST /api/pagos/simular/` (`apps.pagos.views.SimularPagoView`):** Registra `pago_simulado` con referencia y monto.
- **`POST /api/pagos/webhook/` (`apps.pagos.views.WebhookPagoView`):** Registra `pago_confirmado` o `pago_rechazado` con `origen='sistema'`.

### 5.2 Asistente LLM (`apps.chatbot.services.llm_orchestrator.py`)
Cuando el LLM invoca herramientas internas mediante tool-calling:
- **`_tool_agendar_cita`:** Registra `cita_creada` con `origen='bot_llm'`, ID del paciente y datos de la cita.
- **`_tool_cancelar_cita`:** Registra `cita_cancelada` con `origen='bot_llm'` y delta de estado.
- **`_tool_solicitar_pqr_reembolso`:** Registra `pqr_radicada` con `origen='bot_llm'`, ID de la PQR y motivo del paciente.

---

## 6. API REST de Consulta: `GET /api/auditoria/`

### 6.1 Permisos y Seguridad
- **Permiso:** Requiere autenticación JWT y rol `admin` (`require_role(['admin'])`).
- Si un usuario no autenticado o con rol `paciente` / `medico` intenta acceder, recibe `403 Forbidden`.

### 6.2 Parámetros de Consulta (Query Params)
- `usuario_id` (UUID): Filtrar eventos de un usuario específico.
- `accion` (string): Filtrar por acción (ej. `cita_creada`, `login_exitoso`).
- `origen` (string): Filtrar por origen (`bot_llm`, `humano_paciente`, etc.).
- `entidad_tipo` (string): Filtrar por recurso (`Cita`, `Pago`, etc.).
- `fecha_inicio` (ISO datetime): Límite inferior de timestamp.
- `fecha_fin` (ISO datetime): Límite superior de timestamp.
- `page` (int) y `page_size` (int, default=20, max=100): Paginación estándar.

### 6.3 Ejemplo de Respuesta
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "e7c2f0a1-8d2b-4b09-918a-6f019c43d8a7",
      "usuario": {
        "id": "a1b2c3d4-0000-0000-0000-000000000001",
        "nombre_completo": "Juan Pérez",
        "correo": "juan.perez@example.com"
      },
      "rol_en_el_momento": "paciente",
      "accion": "cita_creada",
      "entidad_tipo": "Cita",
      "entidad_id": "c1d2e3f4-1111-2222-3333-444455556666",
      "timestamp": "2026-09-30T09:20:00Z",
      "datos_cambio": {
        "medico": "Dra. María González",
        "especialidad": "Medicina General",
        "fecha_hora": "2026-10-02 09:00",
        "estado": "pendiente_pago"
      },
      "origen": "bot_llm",
      "ip": null,
      "session_id": null
    }
  ]
}
```

---

## 7. Pruebas Automatizadas
La suite de pruebas en `apps/auditoria/tests.py` valida:
1. `test_creacion_registro_auditoria`: Creación y persistencia de campos.
2. `test_inmutabilidad_bloquea_modificacion`: Bloqueo de updates vía ORM.
3. `test_inmutabilidad_bloquea_eliminacion`: Bloqueo de deletes vía ORM.
4. `test_origen_bot_llm_registrado_correctamente`: Registro explícito del canal `bot_llm`.
5. `test_acceso_no_autenticado_denegado`: Validación de código HTTP 403.
6. `test_acceso_paciente_denegado`: Pacientes no pueden consultar la auditoría (403).
7. `test_acceso_admin_permitido`: Administrador autorizado con resultados paginados (200).
8. `test_filtro_por_origen`: Filtrado exacto de registros por canal.
9. `test_filtro_por_accion`: Filtrado exacto de registros por tipo de acción.
