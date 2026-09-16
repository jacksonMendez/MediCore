-- ============================================================
-- MediCore OS — Database Schema (PostgreSQL)
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE rol_usuario AS ENUM ('paciente', 'medico', 'admin');
CREATE TYPE estado_cita AS ENUM ('pendiente_pago', 'confirmada', 'cancelada', 'atendida', 'no_asistio');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE dia_semana AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- ============================================================
-- TABLES
-- ============================================================

-- Sedes (Clinic locations)
CREATE TABLE sedes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    direccion   VARCHAR(300) NOT NULL,
    telefono    VARCHAR(20),
    activa      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Especialidades (Medical specialties)
CREATE TABLE especialidades (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(100) NOT NULL UNIQUE,
    descripcion   TEXT,
    precio_base   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Usuarios (All system users: patients, doctors, admins)
CREATE TABLE usuarios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo  VARCHAR(200) NOT NULL,
    correo           VARCHAR(200) NOT NULL UNIQUE,
    password_hash    VARCHAR(300) NOT NULL,
    rol              rol_usuario NOT NULL DEFAULT 'paciente',
    telefono         VARCHAR(20),
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pacientes (Patient profile linked to usuario)
CREATE TABLE pacientes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id           UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    documento_tipo       VARCHAR(10) NOT NULL DEFAULT 'CC',
    documento_numero     VARCHAR(30) NOT NULL UNIQUE,
    fecha_nacimiento     DATE,
    contacto_emergencia  VARCHAR(200),
    telefono_emergencia  VARCHAR(20)
);

-- Médicos (Doctor profile linked to usuario)
CREATE TABLE medicos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad_id         UUID NOT NULL REFERENCES especialidades(id),
    sede_id                 UUID NOT NULL REFERENCES sedes(id),
    tarjeta_profesional     VARCHAR(50) NOT NULL UNIQUE,
    duracion_cita_minutos   INT NOT NULL DEFAULT 30,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE
);

-- Horarios del médico (Weekly schedule slots)
CREATE TABLE horarios_medico (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id   UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    dia         dia_semana NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    UNIQUE(medico_id, dia, hora_inicio)
);

-- Citas (Appointments)
CREATE TABLE citas (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id       UUID NOT NULL REFERENCES pacientes(id),
    medico_id         UUID NOT NULL REFERENCES medicos(id),
    sede_id           UUID NOT NULL REFERENCES sedes(id),
    fecha_hora        TIMESTAMP NOT NULL,
    duracion_minutos  INT NOT NULL DEFAULT 30,
    estado            estado_cita NOT NULL DEFAULT 'pendiente_pago',
    motivo            TEXT,
    creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pagos (Payments linked to appointments)
CREATE TABLE pagos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cita_id         UUID NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
    monto           NUMERIC(10,2) NOT NULL,
    moneda          VARCHAR(5) NOT NULL DEFAULT 'COP',
    referencia      VARCHAR(100) NOT NULL UNIQUE,
    metodo_pago     VARCHAR(50) NOT NULL DEFAULT 'sandbox',
    estado          estado_pago NOT NULL DEFAULT 'pendiente',
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Consultas / Notas clínicas (Clinical notes per appointment)
CREATE TABLE consultas_notas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cita_id          UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    diagnostico      TEXT,
    tratamiento      TEXT,
    receta_medica    TEXT,
    creado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sesiones de chat (Chat sessions per user)
CREATE TABLE sesiones_chat (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_origen   VARCHAR(20) NOT NULL DEFAULT 'paciente',
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Mensajes de chat (Individual messages in a chat session)
CREATE TABLE mensajes_chat (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id   UUID NOT NULL REFERENCES sesiones_chat(id) ON DELETE CASCADE,
    emisor      VARCHAR(20) NOT NULL, -- 'usuario' or 'asistente'
    contenido   TEXT NOT NULL,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX idx_citas_fecha_medico ON citas(fecha_hora, medico_id);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
CREATE INDEX idx_mensajes_sesion ON mensajes_chat(sesion_id, creado_en);
