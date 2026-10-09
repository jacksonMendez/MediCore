-- =====================================================================
-- MEDICORE OS — DDL COMPLETO DE BASE DE DATOS POSTGRESQL (3FN)
-- Sistema: MediCore OS — Gestor Médico Inteligente
-- Entregable Obligatorio de Modelado Relacional y Normalización
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. TABLAS DE CATÁLOGO Y ROLES (RBAC)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS permisos (
    codigo VARCHAR(60) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    modulo VARCHAR(40) NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id VARCHAR(30) NOT NULL REFERENCES roles(codigo) ON DELETE CASCADE,
    permiso_id VARCHAR(60) NOT NULL REFERENCES permisos(codigo) ON DELETE CASCADE,
    CONSTRAINT uq_rol_permiso UNIQUE (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS estados_cita (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS estados_pago (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS metodos_pago (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tipos_pqr (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS estados_pqr (
    codigo VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200)
);

-- ---------------------------------------------------------------------
-- 2. USUARIOS Y PERFILES (PACIENTE / MÉDICO)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(200) NOT NULL,
    correo VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(300) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'paciente' REFERENCES roles(codigo) ON DELETE RESTRICT,
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sedes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(300) NOT NULL,
    telefono VARCHAR(20),
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS especialidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    precio_base NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    documento_tipo VARCHAR(10) NOT NULL DEFAULT 'CC',
    documento_numero VARCHAR(30) NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    contacto_emergencia VARCHAR(200),
    telefono_emergencia VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS medicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad_id UUID NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
    sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    tarjeta_profesional VARCHAR(50) NOT NULL UNIQUE,
    duracion_cita_minutos INTEGER NOT NULL DEFAULT 30,
    genero VARCHAR(10) DEFAULT 'M',
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS horarios_medico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    dia VARCHAR(15) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

-- ---------------------------------------------------------------------
-- 3. TRANSACCIONAL: CITAS, NOTAS Y FACTURACIÓN
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    fecha_hora TIMESTAMPTZ NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_pago' REFERENCES estados_cita(codigo) ON DELETE RESTRICT,
    motivo TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultas_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cita_id UUID NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
    diagnostico TEXT,
    tratamiento TEXT,
    receta_medica TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cita_id UUID NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(5) NOT NULL DEFAULT 'COP',
    referencia VARCHAR(100) NOT NULL UNIQUE,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'sandbox' REFERENCES metodos_pago(codigo) ON DELETE RESTRICT,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' REFERENCES estados_pago(codigo) ON DELETE RESTRICT,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pqr_solicitudes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    tipo VARCHAR(30) DEFAULT 'reembolso' REFERENCES tipos_pqr(codigo) ON DELETE RESTRICT,
    motivo TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision' REFERENCES estados_pqr(codigo) ON DELETE RESTRICT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 4. CHATBOT IA Y AUDITORÍA INMUTABLE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sesiones_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_origen VARCHAR(20) NOT NULL DEFAULT 'paciente',
    resolucion_tipo VARCHAR(20) NOT NULL DEFAULT 'en_curso',
    estado_flujo JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensajes_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES sesiones_chat(id) ON DELETE CASCADE,
    emisor VARCHAR(20) NOT NULL,
    contenido TEXT NOT NULL,
    requiere_seleccion VARCHAR(20) NOT NULL DEFAULT 'ninguna',
    metadata_ui JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_registros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    rol_en_el_momENTO VARCHAR(40),
    accion VARCHAR(60) NOT NULL,
    entidad_tipo VARCHAR(60) NOT NULL,
    entidad_id VARCHAR(64),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datos_cambio JSONB NOT NULL DEFAULT '{}'::jsonb,
    origen VARCHAR(40) NOT NULL DEFAULT 'sistema',
    ip INET,
    session_id VARCHAR(64)
);

-- ---------------------------------------------------------------------
-- 5. ÍNDICES DE RENDIMIENTO Y DISPONIBILIDAD
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_citas_fecha_medico ON citas(fecha_hora, medico_id);
CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado_fecha ON citas(estado, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_pagos_estado_cita ON pagos(estado, cita_id);
CREATE INDEX IF NOT EXISTS idx_pagos_referencia ON pagos(referencia);
CREATE INDEX IF NOT EXISTS idx_pqr_paciente_estado ON pqr_solicitudes(paciente_id, estado);
CREATE INDEX IF NOT EXISTS idx_mensajes_sesion ON mensajes_chat(sesion_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON auditoria_registros(usuario_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON auditoria_registros(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_origin ON auditoria_registros(accion, origen);
