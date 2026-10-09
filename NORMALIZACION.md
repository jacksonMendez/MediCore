# 🗄️ NORMALIZACIÓN DE BASE DE DATOS — MEDICORE OS (1FN, 2FN, 3FN)

> **Documento Oficial de Justificación Relacional y Académica**  
> **Sistema**: MediCore OS — Gestor Médico Inteligente  
> **Motor de Base de Datos**: PostgreSQL / SQLite  
> **Backend**: Django 5.1 + Django REST Framework  
> **Objetivo**: Sustentación oral y evaluación de la Rúbrica de Normalización de Base de Datos (1FN, 2FN, 3FN).

---

## 🎯 Guía Rápida para la Sustentación Oral

> *"Profesor, una base de datos normalizada busca tres metas esenciales: **cero redundancia**, **cero anomalías de modificación/eliminación**, y **máxima integridad referencial**. En MediCore OS no dejamos ningún concepto clave como texto suelto (`CharField` libre), sino que cada estado, rol, método de pago y tipo de trámite es una entidad de catálogo protegida con claves foráneas e integridad referencial (`PROTECT`), alcanzando la **Tercera Forma Normal (3FN)** en todo el esquema."*

---

## 📚 Marco Teórico Simplificado (Las 3 Formas Normales)

1. **Primera Forma Normal (1FN) — Valores Atómicos**:
   - Cada columna almacena un **único valor indivisible**.
   - No existen listas, arreglos separados por comas ni grupos repetitivos de columnas (ej. nada de `telefono1`, `telefono2`, `telefono3`).
   - Cada fila se identifica inequívocamente mediante una **Clave Primaria (Primary Key - PK)**.

2. **Segunda Forma Normal (2FN) — Dependencia Funcional Completa**:
   - Cumple con **1FN**.
   - Todo atributo que no forma parte de la clave depende de la **totalidad** de la clave primaria, no solo de una parte de ella (aplica especialmente en claves compuestas). En tablas con clave primaria simple (UUID o ID único), la 2FN se satisface por definición si cumple 1FN.

3. **Tercera Forma Normal (3FN) — Sin Dependencias Transitivas**:
   - Cumple con **2FN**.
   - **Ningún atributo no-clave depende de otro atributo no-clave** ($X \rightarrow Y$ donde ni $X$ es superclave ni $Y$ es parte de una clave).
   - Ejemplo clásico evitado: en la tabla `citas`, **no** guardamos el nombre del médico, el precio de la especialidad ni el teléfono de la sede, sino únicamente sus claves foráneas (`medico_id`, `sede_id`). Si el médico cambia de consultorio o nombre, la cita no queda desactualizada ni con datos contradictorios.

---

## 📋 Justificación Tabla por Tabla

A continuación se detalla cada tabla real del sistema, sus atributos, claves y la demostración formal y explicada de 1FN, 2FN y 3FN:

---

### 1. `usuarios` (`Usuario`)
*Entidad central de identidad, credenciales y autenticación.*

* **Estructura**:
  - `id` (UUID, PK)
  - `nombre_completo` (VARCHAR(200))
  - `correo` (VARCHAR(200), UNIQUE)
  - `password_hash` (VARCHAR(300))
  - `rol_id` (VARCHAR(30), FK a `roles.codigo`)
  - `telefono` (VARCHAR(20), NULL)
  - `activo` (BOOLEAN)
  - `creado_en` (TIMESTAMPTZ)
* **1FN**: Cada campo contiene un valor atómico (el correo es único y atómico; el hash de contraseña es indivisible). La clave primaria es `id` (UUID único).
* **2FN**: La clave primaria es simple (`id`). Todos los atributos dependen directamente de la identidad del usuario.
* **3FN**: No hay dependencias transitivas. El rol del usuario no se guarda como descripción duplicada en texto libre, sino como clave foránea referenciando a la tabla normalizada `roles`. Si cambia la descripción de un rol, se actualiza en un solo lugar.

---

### 2. `pacientes` (`Paciente`)
*Extensión de perfil clínico para usuarios con rol paciente.*

* **Estructura**:
  - `id` (UUID, PK)
  - `usuario_id` (UUID, OneToOne FK a `usuarios.id`)
  - `documento_tipo` (VARCHAR(10)) — 'CC', 'TI', 'CE', 'PAS'
  - `documento_numero` (VARCHAR(30), UNIQUE)
  - `fecha_nacimiento` (DATE, NULL)
  - `contacto_emergencia` (VARCHAR(200), NULL)
  - `telefono_emergencia` (VARCHAR(20), NULL)
* **1FN**: Todos los atributos son atómicos. La PK es `id`.
* **2FN**: Al tener clave primaria simple (`id`), cada atributo describe al paciente identificado por esa clave.
* **3FN**: **Punto clave de normalización**: En `pacientes` **no** se duplican el `nombre_completo`, `correo` ni `password`, los cuales ya pertenecen a `usuarios`. Se utiliza una relación OneToOne (`usuario_id`). Esto elimina la redundancia y evita anomalías donde el paciente actualiza su correo en una tabla y queda desfasado en otra.

---

### 3. `medicos` (`Medico`)
*Extensión de perfil profesional para el cuerpo médico.*

* **Estructura**:
  - `id` (UUID, PK)
  - `usuario_id` (UUID, OneToOne FK a `usuarios.id`)
  - `especialidad_id` (UUID, FK a `especialidades.id`)
  - `sede_id` (UUID, FK a `sedes.id`)
  - `tarjeta_profesional` (VARCHAR(50), UNIQUE)
  - `duracion_cita_minutos` (INTEGER)
  - `genero` (VARCHAR(10)) — 'M', 'F'
  - `activo` (BOOLEAN)
* **1FN**: Todos los campos son valores escalares indivisibles. La PK es `id`.
* **2FN**: Cumple 2FN al tener clave primaria única.
* **3FN**: `Medico` se vincula a `Especialidad` y `Sede` mediante claves foráneas. No se guarda el precio de la consulta ni la dirección de la sede en la fila del médico; si la sede cambia de dirección o la especialidad actualiza su arancel base, el médico no sufre anomalías de modificación.

---

### 4. `sedes` (`Sede`)
*Infraestructura física y centros de atención clínica.*

* **Estructura**:
  - `id` (UUID, PK)
  - `nombre` (VARCHAR(150))
  - `direccion` (VARCHAR(300))
  - `telefono` (VARCHAR(20), NULL)
  - `activa` (BOOLEAN)
* **1FN**: Valores atómicos.
* **2FN**: La PK es `id`. Todos los atributos dependen únicamente de la sede.
* **3FN**: No existen atributos dependientes entre sí. Cumple 3FN estrictamente.

---

### 5. `especialidades` (`Especialidad`)
*Catálogo médico y tarifas base de consulta.*

* **Estructura**:
  - `id` (UUID, PK)
  - `nombre` (VARCHAR(100), UNIQUE)
  - `descripcion` (TEXT, NULL)
  - `precio_base` (DECIMAL(10,2))
* **1FN**: Valores atómicos.
* **2FN**: La PK es `id`.
* **3FN**: El `precio_base` y la `descripcion` dependen funcionalmente del `id` de la especialidad.

---

### 6. `horarios_medico` (`HorarioMedico`)
*Franjas de atención y turnos laborales semanales del médico.*

* **Estructura**:
  - `id` (UUID, PK)
  - `medico_id` (UUID, FK a `medicos.id`)
  - `dia` (VARCHAR(15)) — 'lunes', 'martes', etc.
  - `hora_inicio` (TIME)
  - `hora_fin` (TIME)
* **1FN**: No hay listas de días en un solo campo (ej. nada de `'lunes, miercoles, viernes'`); cada turno es un registro independiente.
* **2FN**: La PK es `id`. `hora_inicio` y `hora_fin` dependen de ese turno específico.
* **3FN**: No hay atributos que dependan de otros atributos no-clave. Depende de `medico_id`.

---

### 7. `citas` (`Cita`)
*Entidad transaccional central del sistema clínico.*

* **Estructura**:
  - `id` (UUID, PK)
  - `paciente_id` (UUID, FK a `pacientes.id`)
  - `medico_id` (UUID, FK a `medicos.id`)
  - `sede_id` (UUID, FK a `sedes.id`)
  - `fecha_hora` (TIMESTAMPTZ)
  - `duracion_minutos` (INTEGER)
  - `estado` (VARCHAR(30), FK a `estados_cita.codigo`)
  - `motivo` (TEXT, NULL)
  - `creado_en` (TIMESTAMPTZ)
* **1FN**: Valores atómicos. PK es `id`.
* **2FN**: Clave simple.
* **3FN y Pregunta Típica de Sustentación**:
  - *¿Por qué `citas` tiene `sede_id` si el médico ya tiene una sede asignada?*  
    **Respuesta**: Porque un médico puede rotar de sede o cambiar de lugar de trabajo en el futuro. Si la cita no tuviera su propia `sede_id` como referencia histórica inmutable, cambiar la sede del médico alteraría retroactivamente el lugar físico donde se atendieron todas las citas del año pasado (anomalía de actualización). Por tanto, la sede de la cita representa el **lugar de prestación del servicio contratado**.
  - *¿Por qué el estado es una FK a `estados_cita`?*  
    Porque antes era un string libre (`CharField`), lo que permitía escribir errores tipográficos (`"confirmado"` vs `"confirmada"`). Al normalizar a `estados_cita(codigo)`, la base de datos rechaza cualquier estado que no exista en el catálogo oficial con integridad `PROTECT`.

---

### 8. `pagos` (`Pago`)
*Transacciones y comprobantes financieros de las citas.*

* **Estructura**:
  - `id` (UUID, PK)
  - `cita_id` (UUID, UNIQUE FK a `citas.id`)
  - `monto` (DECIMAL(10,2))
  - `moneda` (VARCHAR(5)) — 'COP'
  - `referencia` (VARCHAR(100), UNIQUE)
  - `metodo_pago` (VARCHAR(30), FK a `metodos_pago.codigo`)
  - `estado` (VARCHAR(30), FK a `estados_pago.codigo`)
  - `actualizado_en` (TIMESTAMPTZ)
* **1FN**: Valores atómicos.
* **2FN**: Clave primaria simple (`id`).
* **3FN y Pregunta Típica de Sustentación**:
  - *¿Por qué `monto` se guarda en `pagos` si ya existe `especialidades.precio_base`? ¿No viola 3FN?*  
    **Respuesta contundente**: **No viola 3FN**. En modelado relacional y contable, el precio de catálogo varía en el tiempo ($P(t)$), mientras que el pago representa una **obligación contractual histórica inmutable** (el paciente pagó $50.000 COP hoy, aunque el arancel de la especialidad suba mañana a $65.000 COP). Si se calculara dinámicamente de la especialidad, todos los balances contables pasados se adulterarían cada vez que la clínica ajuste sus precios.
  - Además, `metodo_pago` y `estado` son claves foráneas a `metodos_pago` y `estados_pago`, garantizando que ninguna pasarela no homologada pueda insertarse.

---

### 9. `consultas_notas` (`ConsultaNota`)
*Historia clínica y evolución médica de la cita.*

* **Estructura**:
  - `id` (UUID, PK)
  - `cita_id` (UUID, UNIQUE FK a `citas.id`)
  - `diagnostico` (TEXT, NULL)
  - `tratamiento` (TEXT, NULL)
  - `receta_medica` (TEXT, NULL)
  - `creado_en` (TIMESTAMPTZ)
* **1FN**: Atómico. PK es `id`.
* **2FN**: Clave simple.
* **3FN**: No duplica los datos del paciente ni del médico; se asocia estrictamente a la cita médica que originó la consulta.

---

### 10. `pqr_solicitudes` (`PQRSolicitud`)
*Peticiones, quejas, reclamos y solicitudes de reembolso.*

* **Estructura**:
  - `id` (UUID, PK)
  - `cita_id` (UUID, FK a `citas.id`)
  - `paciente_id` (UUID, FK a `pacientes.id`)
  - `tipo` (VARCHAR(30), FK a `tipos_pqr.codigo`)
  - `motivo` (TEXT)
  - `estado` (VARCHAR(30), FK a `estados_pqr.codigo`)
  - `creado_en` (TIMESTAMPTZ)
* **1FN**: Atómico.
* **2FN**: Clave simple.
* **3FN**: `tipo` y `estado` son entidades de catálogo (`tipos_pqr`, `estados_pqr`). Impide inconsistencias como estados inventados en solicitudes de reembolso.

---

### 11. `sesiones_chat` y `mensajes_chat` (`SesionChat`, `MensajeChat`)
*Persistencia del copiloto conversacional clínico.*

* **`sesiones_chat`**:
  - `id` (UUID, PK), `usuario_id` (FK), `rol_origen`, `resolucion_tipo`, `estado_flujo` (JSONB), `creado_en`.
* **`mensajes_chat`**:
  - `id` (UUID, PK), `sesion_id` (FK), `emisor` ('usuario'|'asistente'), `contenido` (TEXT), `requiere_seleccion`, `metadata_ui` (JSONB), `creado_en`.
* **1FN / 2FN / 3FN**:
  - Los mensajes no se almacenan como un arreglo de texto dentro de la sesión (violación común de 1FN). Cada mensaje es una fila atómica vinculada a la sesión por clave foránea (`sesion_id`).
  - La sesión pertenece al `usuario_id`, garantizando que el historial de chat no duplique información del usuario.

---

### 12. `auditoria_registros` (`RegistroAuditoria`)
*Bitácora inmutable de eventos clínicos y de seguridad.*

* **Estructura**:
  - `id` (UUID, PK)
  - `usuario_id` (UUID, FK a `usuarios.id`, NULL para eventos anónimos/sistema)
  - `rol_en_el_momento` (VARCHAR(40)) — snapshot histórico
  - `accion` (VARCHAR(60), FK conceptual a catálogo de acciones indexado)
  - `entidad_tipo` (VARCHAR(60), indexado)
  - `entidad_id` (VARCHAR(64), indexado)
  - `timestamp` (TIMESTAMPTZ, indexado)
  - `datos_cambio` (JSONB) — delta con estado anterior y nuevo
  - `origen` (VARCHAR(40)) — 'bot_llm', 'humano_paciente', 'humano_medico', 'humano_admin', 'sistema'
  - `ip` (INET / VARCHAR, NULL)
  - `session_id` (VARCHAR(64), NULL)
* **1FN**: Atómico.
* **2FN**: Clave primaria simple (`id`).
* **3FN**: Registra la trazabilidad inmutable sin modificar los registros originales. A nivel de base de datos y ORM se protege con métodos `save()` y `delete()` bloqueados contra alteraciones.

---

### 13. Tablas de Catálogo y RBAC (Lookup Tables)
Todas siguen el estándar de 3FN con claves semánticas primarias:
- **`roles`**: `codigo` (PK), `nombre`, `descripcion`, `activo`.
- **`permisos`**: `codigo` (PK), `nombre`, `modulo`, `descripcion`.
- **`roles_permisos`**: `id` (PK), `rol_id` (FK), `permiso_id` (FK), `UNIQUE(rol_id, permiso_id)`.
- **`estados_cita`**: `codigo` (PK), `nombre`, `descripcion`, `activo`.
- **`estados_pqr`**: `codigo` (PK), `nombre`, `descripcion`.
- **`tipos_pqr`**: `codigo` (PK), `nombre`, `descripcion`.
- **`estados_pago`**: `codigo` (PK), `nombre`, `descripcion`.
- **`metodos_pago`**: `codigo` (PK), `nombre`, `descripcion`, `activo`.

---

## 📊 Matriz Comparativa Resumen de Formas Normales

| Tabla | Clave Primaria (PK) | Cumple 1FN | Cumple 2FN | Cumple 3FN | Justificación 3FN Clave |
|:---|:---|:---:|:---:|:---:|:---|
| `usuarios` | `id` (UUID) | ✅ | ✅ | ✅ | Rol normalizado en tabla `roles`; datos personales atómicos. |
| `pacientes` | `id` (UUID) | ✅ | ✅ | ✅ | Relación 1:1 con `usuarios`; no repite correo, nombre ni password. |
| `medicos` | `id` (UUID) | ✅ | ✅ | ✅ | Relación 1:1 con `usuarios`; FK a `especialidades` y `sedes`. |
| `sedes` | `id` (UUID) | ✅ | ✅ | ✅ | Atributos propios de infraestructura física; sin transitividades. |
| `especialidades` | `id` (UUID) | ✅ | ✅ | ✅ | Catálogo único de especialidades médicas con precio base. |
| `horarios_medico` | `id` (UUID) | ✅ | ✅ | ✅ | Registros atómicos por franja de atención; FK a `medicos`. |
| `citas` | `id` (UUID) | ✅ | ✅ | ✅ | FKs a paciente, médico, sede y estado; sin datos derivados. |
| `pagos` | `id` (UUID) | ✅ | ✅ | ✅ | FK a cita y catálogos; monto es snapshot histórico contable. |
| `consultas_notas` | `id` (UUID) | ✅ | ✅ | ✅ | Relación 1:1 con `citas`; sin duplicación de historial. |
| `pqr_solicitudes` | `id` (UUID) | ✅ | ✅ | ✅ | Catálogos para `tipo` y `estado`; trazabilidad formal. |
| `sesiones_chat` | `id` (UUID) | ✅ | ✅ | ✅ | Cada sesión pertenece a un usuario; aislada por rol. |
| `mensajes_chat` | `id` (UUID) | ✅ | ✅ | ✅ | Desacoplado en 1:N; sin listas de mensajes dentro de la sesión. |
| `auditoria_registros` | `id` (UUID) | ✅ | ✅ | ✅ | Log inmutable e independiente; sin dependencias circulares. |
| `roles_permisos` | `id` (UUID) | ✅ | ✅ | ✅ | Tabla intermedia pura (asociación N:M) con restricción UNIQUE. |

---

## 🏆 Conclusión para la Rúbrica
El esquema relacional de **MediCore OS** se encuentra en **Tercera Forma Normal (3FN)** completa:
1. Elimina todo riesgo de redundancia inútil.
2. Garantiza integridad referencial con políticas `models.PROTECT` en catálogos críticos.
3. Preserva la validez histórica de transacciones contables (`pagos.monto`) y clínicas (`citas.sede`).
4. Soporta el aislamiento seguro y auditoría inmutable exigida en software de grado hospitalario.
