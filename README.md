# 🏥 MediCore OS — Sistema Médico Integral Asistido por IA

<p align="center">
  <strong>Plataforma full-stack de gestión médica con inteligencia artificial</strong><br>
  <em>FastAPI · PostgreSQL · Groq LLM · React · Tailwind CSS · Liquid Glass UI</em>
</p>

---

## 📋 Tabla de Contenidos

- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Variables de Entorno](#-variables-de-entorno)
- [Usuarios de Prueba](#-usuarios-de-prueba)
- [Endpoints API](#-endpoints-api)
- [Diseño Visual](#-diseño-visual)
- [Conventional Commits](#-conventional-commits)

---

## 🏗 Arquitectura

```
MediCore OS
├── Backend (FastAPI)
│   ├── API REST con autenticación JWT + RBAC
│   ├── Orquestador LLM (Groq Cloud) con Tool Calling
│   ├── SQLAlchemy 2.0 Async + asyncpg
│   └── 5 módulos de routers: auth, citas, médicos, pagos, chatbot
│
├── Base de Datos (PostgreSQL)
│   ├── 4 ENUMs, 11 tablas, 3 índices
│   └── Datos seed: 2 sedes, 3 especialidades, 5 usuarios
│
└── Frontend (Vite + React + Tailwind v4)
    ├── Portal Paciente: Chatbot IA para agendar citas
    ├── Portal Doctor: Dashboard clínico + Copiloto IA
    └── Panel Admin: Gestión de médicos, sedes y especialidades
```

### Flujo de Datos

```
[Frontend React] → fetch /api/* → [FastAPI Backend]
                                       ↓
                          [PostgreSQL] ← SQLAlchemy Async
                                       ↓
                          [Groq Cloud] ← Tool Calling (LLM)
                                       ↓
                          [Respuesta IA] → Frontend
```

### Zero-Hallucination LLM Architecture

El orquestador LLM implementa un patrón de **tool calling** que previene alucinaciones:

1. El modelo **NUNCA** inventa datos — toda información de disponibilidad proviene de `consultar_disponibilidad` que consulta la BD real
2. Temperature fijada en **0.0** para máxima determinismo
3. System prompt estricto que prohíbe diagnósticos, recetas y datos inventados
4. Ventana de contexto limitada a **6 mensajes** para latencia óptima
5. Loop de tool calling con **máximo 3 iteraciones** anti-recursión

---

## 🛠 Tecnologías

| Componente | Stack |
|:-----------|:------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 Async, Pydantic v2 |
| **Base de Datos** | PostgreSQL 15+, asyncpg driver |
| **Autenticación** | JWT (python-jose), bcrypt (passlib) |
| **LLM** | Groq Cloud API, Llama 3.1 8B Instant |
| **Frontend** | Vite 6, React 19, Tailwind CSS v4 |
| **Iconos** | Lucide React |
| **Routing** | React Router v7 |
| **Diseño** | Apple Liquid Glass + Paleta Clínica |

---

## 📦 Requisitos Previos

- **Python 3.11+** con pip
- **Node.js 18+** con npm
- **PostgreSQL 15+** corriendo en `localhost:5432`
- **Groq API Key** (gratuita en [console.groq.com](https://console.groq.com))

---

## 🚀 Instalación y Ejecución

### 1. Clonar y Configurar

```bash
git clone <url-del-repo>
cd Gestor-Medico-Inteligente
```

### 2. Base de Datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE medicore;"

# Ejecutar esquema
psql -U postgres -d medicore -f backend/migrations/schema.sql

# Cargar datos de prueba
psql -U postgres -d medicore -f backend/migrations/seed.sql
```

### 3. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus valores (DATABASE_URL, GROQ_API_KEY, JWT_SECRET)

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 5. Abrir en el navegador

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/

---

## 🔐 Variables de Entorno

Crear archivo `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/medicore
GROQ_API_KEY=gsk_tu_clave_aqui
JWT_SECRET=tu-secreto-aleatorio-cambiar-en-produccion
FRONTEND_URL=http://localhost:5173
```

---

## 👥 Usuarios de Prueba

| Rol | Correo | Contraseña |
|:----|:-------|:-----------|
| **Admin** | admin@medicore.com | MediCore2024! |
| **Doctor** (Cardiología) | dr.garcia@medicore.com | MediCore2024! |
| **Doctora** (Med. General) | dra.martinez@medicore.com | MediCore2024! |
| **Paciente** | juan.perez@email.com | MediCore2024! |
| **Paciente** | maria.lopez@email.com | MediCore2024! |

---

## 📡 Endpoints API

### Autenticación
| Método | Ruta | Descripción |
|:-------|:-----|:------------|
| POST | `/api/auth/login` | Login con JWT |
| POST | `/api/auth/register` | Registro de usuario |
| GET | `/api/auth/me` | Perfil del usuario |

### Citas
| Método | Ruta | Descripción |
|:-------|:-----|:------------|
| GET | `/api/citas/disponibilidad` | Consultar slots libres |
| POST | `/api/citas` | Agendar cita |
| GET | `/api/citas/mis-citas` | Mis citas |
| GET | `/api/citas/agenda-hoy/{id}` | Agenda del día |
| PATCH | `/api/citas/{id}/estado` | Cambiar estado |

### Catálogos
| Método | Ruta | Descripción |
|:-------|:-----|:------------|
| GET/POST | `/api/sedes` | CRUD Sedes |
| GET/POST | `/api/especialidades` | CRUD Especialidades |
| GET/POST | `/api/medicos` | CRUD Médicos |

### Pagos (Sandbox)
| Método | Ruta | Descripción |
|:-------|:-----|:------------|
| POST | `/api/pagos/simular` | Simular pago |
| POST | `/api/pagos/webhook` | Webhook confirmación |

### Chat IA
| Método | Ruta | Descripción |
|:-------|:-----|:------------|
| POST | `/api/chat/mensaje` | Enviar mensaje al IA |
| GET | `/api/chat/sesiones` | Listar sesiones |
| GET | `/api/chat/sesiones/{id}/mensajes` | Mensajes de sesión |

---

## 🎨 Diseño Visual

### Apple Liquid Glass

Inspirado en la estética de iOS Liquid Glass:

- **Paneles translúcidos** con `backdrop-blur-xl` y `bg-white/55`
- **Bordes cristalinos** simulando bisel de vidrio (`border-white/80`)
- **Sombras suaves** de profundidad (`0 8px 32px rgba(31,38,135,0.06)`)
- **Esferas de gradiente** difuminadas como decoración de fondo
- **Micro-animaciones** en hover, entrada de elementos y typing indicator

### Paleta Clínica

| Color | Uso | Hex |
|:------|:----|:----|
| 🔵 Cyan Quirúrgico | Acciones principales, branding | `#0891b2` |
| 🔷 Azul Médico | Enlaces, información | `#0284c7` |
| 🟢 Verde Antiséptico | Confirmaciones, éxito | `#0d9488` |
| 🟡 Ámbar | Observación, pendientes | `#d97706` |
| 🔴 Rose Clínico | Alertas, cancelaciones | `#e11d48` |
| ⬜ Fondo Clínico | Fondo general | `#f1f5f9` |

---

## 📝 Conventional Commits

| Prefijo | Descripción |
|:--------|:------------|
| `chore(setup)` | Configuración inicial, scaffolding |
| `feat(db)` | Esquema de base de datos, migraciones |
| `feat(api)` | Endpoints, routers, modelos |
| `feat(llm)` | Orquestador LLM, tool calling |
| `feat(frontend)` | Componentes React, vistas |
| `style(ui)` | Sistema de diseño, CSS, animaciones |
| `docs(readme)` | Documentación |

---

## 📄 Licencia

Este proyecto es de uso educativo y demostrativo.

---

<p align="center">
  <strong>MediCore OS v1.0</strong> — Construido con 💚 y IA
</p>
