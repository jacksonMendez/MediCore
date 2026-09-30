# MediCore OS — Guía Rápida y Documentación de la API REST (OpenAPI 3.0)

Bienvenido a la documentación oficial de la API de **MediCore OS (Gestor Médico Inteligente)**. El sistema expone una arquitectura REST modular desarrollada sobre Django REST Framework y documentada mediante el estándar **OpenAPI 3.0** a través de `drf-spectacular`.

---

## 1. Acceso a la Documentación Interactiva

Con el servidor backend en ejecución (`python manage.py runserver`), se encuentran disponibles las siguientes interfaces interactivas:

| Interfaz | URL | Descripción |
| :--- | :--- | :--- |
| **Swagger UI** | [`http://localhost:8000/api/docs/`](http://localhost:8000/api/docs/) | Explorador interactivo que permite probar endpoints en vivo, examinar esquemas y autenticarse con JWT. |
| **ReDoc** | [`http://localhost:8000/api/redoc/`](http://localhost:8000/api/redoc/) | Documentación estructurada de tres columnas optimizada para lectura técnica profunda y especificación de modelos. |
| **Esquema OpenAPI** | [`http://localhost:8000/api/schema/`](http://localhost:8000/api/schema/) | Archivo de especificación en formato YAML/JSON para generación de SDKs clientes o importación en Postman/Insomnia. |
| **Archivo Local** | [`docs/openapi.yaml`](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/openapi.yaml) | Copia offline generada de la especificación completa OpenAPI 3.0. |

---

## 2. Autenticación y Botón "Authorize" en Swagger UI

La API utiliza tokens de acceso **JSON Web Token (JWT)** firmados con el algoritmo HMAC-SHA256 (`HS256`).

### Flujo de Autenticación
1. Realice una petición `POST` al endpoint `/api/auth/login` con sus credenciales:
   ```json
   {
     "email": "paciente1@medicore.com",
     "password": "Password123!"
   }
   ```
2. La respuesta entregará un objeto con el token de acceso:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "bearer",
     "user": {
       "id": "e2a1b3c4-...",
       "nombre_completo": "Juan Pérez",
       "email": "paciente1@medicore.com",
       "rol": "paciente"
     }
   }
   ```
3. En la cabecera superior derecha de Swagger UI (`/api/docs/`), haga clic en el botón verde **Authorize** 🔓.
4. En el campo **Value**, ingrese el token precedido de la palabra `Bearer`:
   ```text
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Presione **Authorize** y luego **Close**. A partir de ese momento, todas las peticiones interactivas incluirán automáticamente el encabezado:
   ```http
   Authorization: Bearer <token>
   ```

---

## 3. Matriz de Endpoints y Control de Acceso por Roles (RBAC)

La API cuenta con control estricto de roles tanto a nivel de middleware como en las clases de permisos (`permission_classes`).

| Módulo / Tag | Método | Ruta | Roles Permitidos | Requiere Token |
| :--- | :---: | :--- | :--- | :---: |
| **Autenticación** | `POST` | `/api/auth/login` | Público | No |
| | `POST` | `/api/auth/register` | Público | No |
| | `GET` | `/api/auth/me` | `paciente`, `medico`, `admin`, `agente_atencion` | Sí |
| **Chatbot Asistente** | `POST` | `/api/chat/mensaje` | `paciente`, `admin` | Sí |
| | `GET` | `/api/chat/sesiones` | `paciente`, `admin` (filtrado a sesiones propias) | Sí |
| | `GET` | `/api/chat/sesiones/{id}/mensajes`| `paciente`, `admin` (propia sesión) | Sí |
| | `DELETE` | `/api/chat/sesiones/{id}` | `paciente`, `admin` (propia sesión) | Sí |
| **Citas Médicas** | `GET` | `/api/citas/dias-disponibles` | Público (calendario de agenda) | No |
| | `GET` | `/api/citas/disponibilidad` | Público (ranuras horarias) | No |
| | `POST` | `/api/citas/` | `paciente`, `admin` | Sí |
| | `GET` | `/api/citas/mis-citas` | `paciente`, `medico`, `admin` | Sí |
| | `GET` | `/api/citas/agenda-hoy/{medico_id}`| `medico`, `admin` | Sí |
| | `PATCH` | `/api/citas/{id}/estado` | `paciente` (cancelar), `medico` (atender), `admin` | Sí |
| **Pasarela Pagos** | `POST` | `/api/pagos/simular` | `paciente`, `admin` | Sí |
| | `GET` | `/api/pagos/mis-pagos` | `paciente`, `admin` | Sí |
| | `GET` | `/api/pagos/{cita_id}` | `paciente` (dueño), `medico`, `admin` | Sí |
| | `POST` | `/api/pagos/webhook` | Público (Validación HMAC pasarela) | No |
| **Clínica / Catálogo**| `GET` | `/api/sedes/` | Público | No |
| | `POST` | `/api/sedes/` | `admin` | Sí |
| | `GET` | `/api/especialidades/` | Público | No |
| | `POST` | `/api/especialidades/` | `admin` | Sí |
| | `GET` | `/api/medicos/` | Público | No |
| | `POST` | `/api/medicos/` | `admin` | Sí |
| | `GET` | `/api/medicos/{id}/horarios` | Público | No |
| | `POST` | `/api/medicos/horarios` | `admin` | Sí |
| **Auditoría** | `GET` | `/api/auditoria/` | `admin` exclusivamente | Sí |

---

## 4. Estructura Especial: Endpoint de Chat Asistente (`POST /api/chat/mensaje`)

A partir de la Fase 5, el endpoint de chat ya no requiere que el cliente frontend analice texto ni interprete marcadores regex (`<!--CALENDAR:...-->`). Toda la directiva de renderizado de interfaz gráfica se entrega en campos estructurados de primer nivel:

### Petición (`POST /api/chat/mensaje`)
```json
{
  "mensaje": "Quiero una cita con cardiología",
  "sesion_id": "7f8b3c9a-1122-3344-5566-778899aabbcc" // Opcional en el primer mensaje
}
```

### Respuesta Estructurada
```json
{
  "respuesta": "Excelente, para Cardiología contamos con disponibilidad en las siguientes fechas. Por favor, selecciona el día que prefieras:",
  "sesion_id": "7f8b3c9a-1122-3344-5566-778899aabbcc",
  "emisor": "asistente",
  "actualizo_citas": false,
  "herramientas_usadas": ["consultar_disponibilidad"],
  "requiere_seleccion": "dia",
  "dias_disponibles": [
    "2026-10-01",
    "2026-10-02",
    "2026-10-05"
  ],
  "horarios": [],
  "especialidad": "Cardiología"
}
```

### Valores del campo `requiere_seleccion`:
- `"dia"`: El frontend Angular debe desplegar el calendario interactivo con los días activos especificados en `dias_disponibles`.
- `"hora"`: El frontend Angular debe renderizar los botones de horarios extraídos de `horarios` (ej. `["08:00", "09:00", "10:00"]`).
- `"ninguna"`: Mensaje puramente conversacional, confirmación de cita o cancelación. **El frontend nunca muestra calendarios ni horarios residuales**.

---

## 5. Estructura Especial: Módulo de Auditoría Inmutable (`GET /api/auditoria/`)

Permite a los administradores inspeccionar la traza inalterable de operaciones del sistema.

### Parámetros de Filtro Soportados:
- `usuario_id` (UUID): Filtrar por el identificador del usuario actor.
- `accion` (string): Código de la acción (ej. `cita_creada`, `cita_cancelada`, `pago_confirmado`, `login_exitoso`).
- `origen` (string):
  - `bot_llm`: Acciones ejecutadas por el copiloto IA (Groq).
  - `humano_paciente`: Acciones directas del portal de paciente.
  - `humano_medico`: Acciones de la agenda médica.
  - `humano_admin`: Operaciones de configuración administrativa.
  - `sistema`: Tareas automatizadas del servidor.
- `entidad_tipo` (string): Nombre del modelo afectado (`Cita`, `Pago`, `Usuario`, etc.).
- `fecha_inicio` / `fecha_fin` (ISO DateTime): Ventana temporal de consulta.
- `page` / `page_size`: Paginación estandarizada.

### Ejemplo de Respuesta:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "c1d2e3f4-55aa-66bb-77cc-889900aabbcc",
      "usuario_id": "e2a1b3c4-...",
      "usuario_email": "paciente1@medicore.com",
      "rol_en_el_momento": "paciente",
      "accion": "cita_creada",
      "entidad_tipo": "Cita",
      "entidad_id": "a9b8c7d6-...",
      "origen": "bot_llm",
      "ip": "127.0.0.1",
      "session_id": "7f8b3c9a-...",
      "datos_cambio": {
        "medico": "Dr. Carlos Mendoza",
        "especialidad": "Cardiología",
        "fecha_hora": "2026-10-02T09:00:00Z"
      },
      "timestamp": "2026-09-30T14:35:10.123456Z"
    }
  ]
}
```

---

## 6. Formato Estándar de Errores

Las respuestas de error siguen el formato JSON estructurado de DRF:

- **400 Bad Request**: Parámetros faltantes o validación fallida.
  ```json
  {
    "mensaje": ["Este campo es requerido."]
  }
  ```
- **401 Unauthorized**: Falta de cabecera `Authorization` o token expirado.
  ```json
  {
    "detail": "Token inválido o expirado"
  }
  ```
- **403 Forbidden**: El usuario autenticado no posee el rol necesario según la matriz RBAC.
  ```json
  {
    "detail": "Acceso denegado. Roles permitidos: admin"
  }
  ```
- **404 Not Found**: El recurso solicitado no existe o no pertenece al usuario.
  ```json
  {
    "detail": "No encontrado."
  }
  ```
