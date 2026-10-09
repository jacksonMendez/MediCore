# 🛡️ MediCore OS — Control de Roles y Matriz de Permisos en Base de Datos (RBAC)

> **Documento de Seguridad y Control de Acceso Basado en Roles**  
> **Sistema**: MediCore OS  
> **Fase**: Fase 3 — Control de Roles en BD y Permisos por Endpoint  
> **Fecha**: Septiembre 2026  

---

## 1. 🏛️ Decisión Arquitectónica: Modelos Propios (`Rol`, `Permiso`, `RolPermiso`)

Para el gobierno de acceso se evaluaron dos aproximaciones:
1. **Django Groups & Permissions (`auth_group` / `auth_permission`)**:
   - *Desventajas*: Alto acoplamiento a `django.contrib.contenttypes`, claves primarias enteras arbitrarias, dificultad para mapear UUIDs y sobrecarga innecesaria para un modelo de usuario desacoplado y personalizable.
2. **Modelos Propios de RBAC Relacional (`Rol`, `Permiso`, `RolPermiso`)** — **OPCIÓN ELEGIDA**:
   - *Ventajas*:
     - **Claves semánticas directas**: `Rol.codigo` (`'paciente'`, `'medico'`, `'admin'`, `'agente_atencion'`) y `Permiso.codigo` (`'citas.agendar_cita'`, `'auditoria.ver_registros'`).
     - **Integridad referencial estricta**: `Usuario.rol` es una clave foránea (`models.ForeignKey(Rol, db_column='rol')`), previniendo roles huérfanos o inválidos en la base de datos.
     - **Auditable y transparente**: La matriz completa reside en la tabla `roles_permisos`, accesible por SQL o mediante la interfaz de administración.
     - **Cero disrupción**: En tokens JWT y payloads JSON, `user.rol_id` se serializa como string, conservando la compatibilidad retroactiva total con el frontend Angular.

---

## 2. 📋 Matriz de Permisos por Rol en Base de Datos

El sistema inicializa la siguiente matriz mediante la migración de datos `authentication.0003`:

| Módulo | Código de Permiso | Nombre del Permiso | Paciente | Médico | Agente Atención | Administrador |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Auth** | `auth.ver_perfil` | Ver perfil propio | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `auth.modificar_perfil` | Modificar perfil propio | ✅ | ❌ | ❌ | ✅ |
| **Chat** | `chat.enviar_mensaje` | Chatear con copiloto IA | ✅ | ✅ | ✅ | ✅ |
| **Chat** | `chat.ver_sesiones` | Ver historial de sesiones | ✅ | ✅ | ✅ | ✅ |
| **Citas** | `citas.ver_mis_citas` | Consultar citas propias | ✅ | ✅ | ✅ | ✅ |
| **Citas** | `citas.agendar_cita` | Agendar cita médica | ✅ | ❌ | ✅ | ✅ |
| **Citas** | `citas.cancelar_cita` | Cancelar cita médica | ✅ | ❌ | ✅ | ✅ |
| **Citas** | `citas.ver_agenda_doctor`| Ver agenda médica del día | ❌ | ✅ | ✅ | ✅ |
| **Citas** | `citas.gestionar_estado` | Marcar atendida/inasistencia| ❌ | ✅ | ❌ | ✅ |
| **Citas** | `citas.ver_todas` | Ver todas las citas clínicas | ❌ | ❌ | ✅ | ✅ |
| **PQR** | `pqr.radicar` | Radicar queja/reembolso | ✅ | ❌ | ❌ | ✅ |
| **PQR** | `pqr.resolver` | Aprobar/Rechazar PQR | ❌ | ❌ | ✅ | ✅ |
| **Pagos** | `pagos.ver_mis_pagos` | Ver pagos propios | ✅ | ❌ | ✅ | ✅ |
| **Pagos** | `pagos.simular_pago` | Simular pago de consulta | ✅ | ❌ | ❌ | ✅ |
| **Pagos** | `pagos.gestionar_pagos` | Liquidar y auditar pagos | ❌ | ❌ | ✅ | ✅ |
| **Clínica**| `clinica.ver_catalogo` | Consultar sedes/médicos/esp | ✅ | ✅ | ✅ | ✅ |
| **Clínica**| `clinica.gestionar_medicos` | Crear y editar médicos | ❌ | ❌ | ❌ | ✅ |
| **Clínica**| `clinica.gestionar_sedes` | Crear y editar sedes | ❌ | ❌ | ❌ | ✅ |
| **Clínica**| `clinica.gestionar_especialidades` | Crear especialidades | ❌ | ❌ | ❌ | ✅ |
| **Auditoría**| `auditoria.ver_registros` | Consultar log inmutable | ❌ | ❌ | ❌ | ✅ |

---

## 3. 🔒 Aplicación de `permission_classes` y Control de Propiedad (Ownership)

Además de verificar el rol o permiso, las vistas implementan validaciones de **aislamiento de datos entre usuarios (Habeas Data / Privacidad Clínica)**:

1. **`CambiarEstadoCitaView` (`PATCH /api/citas/<cita_id>/estado`)**:
   - Si el usuario es `paciente`:
     - Solo puede alterar citas que le pertenezcan (`cita.paciente.usuario_id == request.user.id`).
     - Solo puede establecer el estado `'cancelada'`. Intentar marcar una cita como `'atendida'` o cancelar la de otro paciente retorna `HTTP 403 Forbidden`.
   - Si el usuario es `medico`:
     - Solo puede alterar citas asignadas a él (`cita.medico.usuario_id == request.user.id`).
2. **`SimularPagoView` (`POST /api/pagos/simular`)**:
   - Valida que la cita pertenezca al paciente autenticado antes de generar o confirmar el pago.
3. **`DetallePagoView` (`GET /api/pagos/<cita_id>`)**:
   - Impide que un paciente consulte recibos de transacciones financieras de terceros.

---

## 4. 🧪 Cobertura y Resultados de Pruebas Automatizadas

La suite unitaria `apps.authentication.tests.RBACTestCase` valida:
* `test_unauthenticated_denegado`: Peticiones anónimas rechazadas con `401/403`.
* `test_paciente_acceso_permitido`: Paciente consulta exitosamente sus citas con JWT.
* `test_paciente_acceso_denegado_admin`: Paciente intentando crear sedes administrativas recibe `HTTP 403 Forbidden`.
* `test_paciente_no_puede_modificar_cita_ajena`: Intento de cancelación de cita ajena bloqueado con `HTTP 403 Forbidden`.
* `test_medico_acceso_agenda`: Médico consulta su agenda diaria con código `200 OK`.
* `test_admin_acceso_total`: Administrador puede crear sedes y gestionar catálogos con código `201 CREATED`.

**Resultado**: 6/6 pruebas pasando al 100% de efectividad.
