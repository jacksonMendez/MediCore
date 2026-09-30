# 🏥 MediCore OS — Gestor Médico Inteligente

<p align="center">
  <strong>Plataforma full-stack de gestión hospitalaria, agendamiento asistido por IA, pasarela de pagos y auditoría inmutable</strong><br>
  <em>Django 6 · Django REST Framework · Angular 19 Standalone · Groq LLM con Failover · OpenAPI 3.0 / Swagger</em>
</p>

---

## 📋 Índice General

- [1. Descripción del Proyecto](#1-descripción-del-proyecto)
- [2. Arquitectura del Sistema](#2-arquitectura-del-sistema)
- [3. Enlaces a la Documentación Técnica](#3-enlaces-a-la-documentación-técnica)
- [4. Requisitos y Dependencias](#4-requisitos-y-dependencias)
- [5. Puesta en Marcha (Instalación y Ejecución)](#5-puesta-en-marcha-instalación-y-ejecución)
  - [Backend (Django REST Framework)](#backend-django-rest-framework)
  - [Frontend (Angular 19 Standalone)](#frontend-angular-19-standalone)
- [6. Variables de Entorno](#6-variables-de-entorno)
- [7. Credenciales y Usuarios de Prueba](#7-credenciales-y-usuarios-de-prueba)
- [8. Documentación OpenAPI y Swagger](#8-documentación-openapi-y-swagger)
- [9. Verificación y Pruebas Automatizadas](#9-verificación-y-pruebas-automatizadas)

---

## 1. Descripción del Proyecto

**MediCore OS** es un ecosistema médico inteligente diseñado para resolver de manera automatizada y segura las necesidades operativas de clínicas e instituciones de salud. Integra:
- **Portal de Paciente en Angular 19**: Experiencia fluida con copiloto conversacional para agendamiento médico, selección de horarios, consulta de citas y pasarela de pagos.
- **Backend Modular en Django REST Framework**: API robusta con control de acceso basado en roles (RBAC) a nivel de base de datos.
- **Orquestador LLM con Failover**: Conectado a la API de Groq Cloud (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) con arquitectura *Zero-Hallucination* mediante llamadas a funciones (*Tool Calling*) y guardrail determinista anti-desvíos.
- **Auditoría Inmutable**: Registro centralizado y a prueba de alteraciones que traza tanto operaciones humanas como autónomas del asistente (`bot_llm`).
- **Normalización Relacional**: Base de datos normalizada hasta Tercera Forma Normal (3NF) con tablas de catálogo y restricciones estrictas.

---

## 2. Arquitectura del Sistema

```text
MediCore OS
├── backend/ (Django + Django REST Framework)
│   ├── apps/
│   │   ├── authentication/  → Modelos Usuario, Rol, Permiso, RolPermiso, JWT Bearer
│   │   ├── clinica/         → Especialidades, Sedes, Médicos y Horarios de Atención
│   │   ├── citas/           → Motor de Disponibilidad, Citas Médicas y PQR / Reembolsos
│   │   ├── pagos/           → Transacciones, Pasarela simulada y Webhooks Wompi
│   │   ├── chatbot/         → Orquestador Groq con Failover, Guardrails y UI Estructurada
│   │   └── auditoria/       → Modelo inmutable RegistroAuditoria y servicio registrar_auditoria
│   └── medicore/            → Configuración global, Swagger UI (drf-spectacular) y URLs
│
├── frontend-angular/ (Angular 19 Standalone)
│   ├── src/app/
│   │   ├── pages/           → Login, Portal Paciente, Portal Médico, Portal Admin
│   │   ├── components/      → Chatbot interactivo, Calendario visual, Selector de Horas
│   │   ├── services/        → AuthService, ChatService, CitasService, PagosService
│   │   └── guards/          → AuthGuard y RoleGuard (RBAC)
│   └── tailwind.config.js   → Paleta clínica (azul institucional y tema oscuro)
│
└── docs/                    → Documentación técnica detallada
```

---

## 3. Enlaces a la Documentación Técnica

Todos los informes de arquitectura, diseño y decisiones se encuentran versionados en la carpeta [`docs/`](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs):

1. 🏛️ **[docs/ARQUITECTURA.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/ARQUITECTURA.md)** — Mapa de componentes, diagrama entidad-relación (Mermaid ER), flujo completo del orquestador Groq, tabla de validaciones y riesgos técnicos.
2. 📐 **[docs/NORMALIZACION.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/NORMALIZACION.md)** — Análisis de 1FN, 2FN y 3FN, esquema antes vs. después, creación de tablas de catálogo y migraciones seguras.
3. 🛡️ **[docs/ROLES_Y_PERMISOS.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/ROLES_Y_PERMISOS.md)** — Modelo RBAC en base de datos (`roles`, `permisos`, `roles_permisos`), matriz de permisos y aplicación de `permission_classes`.
4. 📜 **[docs/AUDITORIA.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/AUDITORIA.md)** — Módulo de auditoría inmutable, trazabilidad humana y de `bot_llm`, campos `JSONField` estructurados y endpoint protegido.
5. 🔍 **[docs/DIAGNOSTICO_CHAT.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/DIAGNOSTICO_CHAT.md)** — Diagnóstico de raíz del bug de calendario/horarios residuales, eliminación de marcadores regex y nueva máquina de estados en backend.
6. 📖 **[docs/API.md](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/API.md)** — Guía rápida de la API REST, autenticación JWT con botón "Authorize" en Swagger UI y especificación de endpoints.
7. 📄 **[docs/openapi.yaml](file:///c:/Users/Jeison%20-%20PC/Documents/Gestor%20Medico%20Inteligente/docs/openapi.yaml)** — Especificación completa de la API en formato OpenAPI 3.0.

---

## 4. Requisitos y Dependencias

- **Python**: 3.11 o superior.
- **Node.js**: v18.0 o superior (Node v20+ recomendado) con `npm`.
- **Angular CLI**: v19.x (incluido en dependencias locales).
- **SQLite / PostgreSQL**: Motor de base de datos relacional.

---

## 5. Puesta en Marcha (Instalación y Ejecución)

### Backend (Django REST Framework)

1. Ingrese a la carpeta del backend y active el entorno virtual:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   ```
2. Instale dependencias (si no están instaladas):
   ```powershell
   pip install -r requirements.txt
   ```
3. Aplique las migraciones de base de datos:
   ```powershell
   python manage.py migrate
   ```
4. Inicie el servidor de desarrollo:
   ```powershell
   python manage.py runserver 8000
   ```
   El backend estará disponible en `http://localhost:8000`.

### Frontend (Angular 19 Standalone)

1. En una nueva terminal, ingrese a la carpeta del frontend:
   ```powershell
   cd frontend-angular
   ```
2. Instale las dependencias de Node:
   ```powershell
   npm install
   ```
3. Inicie el servidor local de Angular:
   ```powershell
   npm start
   ```
   El aplicativo se abrirá en `http://localhost:4200` y se conectará automáticamente con el backend en el puerto 8000.

---

## 6. Variables de Entorno

El archivo `backend/.env` permite configurar las claves de servicios externos:

| Variable | Descripción | Valor por Defecto / Ejemplo |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Clave principal de Groq Cloud para inferencia LLM | `gsk_...` |
| `GROQ_API_KEYS` | Pool de claves separadas por coma para failover automático | `gsk_key1,gsk_key2` |
| `JWT_SECRET` | Clave secreta para firma HMAC de tokens de acceso | `medicore-super-secret-key-prod-2026` |
| `JWT_ALGORITHM` | Algoritmo criptográfico para JWT | `HS256` |
| `JWT_EXPIRE_MINUTES` | Duración de validez del token de acceso | `1440` (24 horas) |

---

## 7. Credenciales y Usuarios de Prueba

Para probar el inicio de sesión y los portales según cada rol:

| Rol | Correo Electrónico | Contraseña | Portal Principal |
| :--- | :--- | :--- | :--- |
| **Paciente** | `paciente@medicore.com` | `Password123!` | `/paciente` (Chatbot IA, Citas, Pagos) |
| **Médico** | `medico@medicore.com` | `Password123!` | `/medico` (Agenda del día, Pacientes) |
| **Administrador** | `admin@medicore.com` | `Password123!` | `/admin` (Sedes, Especialidades, Médicos, Auditoría) |

---

## 8. Documentación OpenAPI y Swagger

El backend expone interfaces interactivas para explorar y probar todos los endpoints:

- **Swagger UI**: [`http://localhost:8000/api/docs/`](http://localhost:8000/api/docs/)
  - Permite autenticarse mediante el botón verde **Authorize** ingresando: `Bearer <tu_token_jwt>`.
- **ReDoc**: [`http://localhost:8000/api/redoc/`](http://localhost:8000/api/redoc/)
- **Esquema Crudo OpenAPI**: [`http://localhost:8000/api/schema/`](http://localhost:8000/api/schema/)

---

## 9. Verificación y Pruebas Automatizadas

El proyecto cuenta con suites de pruebas unitarias y de extremo a extremo que validan la integridad de todo el sistema:

### Pruebas Unitarias del Backend (Django)
```powershell
cd backend
python manage.py test
```
*Resultado:* **23 de 23 pruebas pasando (100% OK)** en los módulos de autenticación, clínica, citas, pagos, chatbot y auditoría.

### Prueba Guiada de Extremo a Extremo (E2E)
```powershell
cd backend
python test_e2e_verification.py
```
*Valida automáticamente:*
1. Login por rol (`paciente`, `medico`, `admin`).
2. Intercepción y redirección determinista del chat ante temas fuera de contexto (*Anti-OffTopic Guardrail*).
3. Flujo conversacional completo de agendamiento sin marcadores de texto ni calendarios residuales.
4. Atención de solicitudes de PQR y reembolso.
5. Verificación de restricciones RBAC y registro inmutable de auditoría con origen `bot_llm`.
6. Disponibilidad y formato de los endpoints OpenAPI 3.0 / Swagger UI.

### Compilación de Producción del Frontend (Angular 19)
```powershell
cd frontend-angular
npm run build
```
*Resultado:* Compilación limpia sin errores ni advertencias (tiempo de bundle ~3.1s).
