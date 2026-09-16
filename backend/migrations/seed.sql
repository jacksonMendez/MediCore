-- ============================================================
-- MediCore OS — Seed Data (Valid PostgreSQL UUIDs)
-- ============================================================
-- Password hashes for 'Password123!' and 'MediCore2024!'
-- $2b$12$e/a6iS5o3yC51H90t0Cpeum5gC2WjKkR1K6pYqV7nQ8fX9y0Z1A2B (Password123!)
-- $2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6 (MediCore2024!)

-- SEDES
INSERT INTO sedes (id, nombre, direccion, telefono, activa) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sede Norte - Centro Médico Aurora', 'Calle 100 #15-25, Bogotá', '+57 601 555 0101', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Sede Centro - Clínica del Parque', 'Carrera 7 #45-10, Bogotá', '+57 601 555 0202', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ESPECIALIDADES
INSERT INTO especialidades (id, nombre, descripcion, precio_base) VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Medicina General', 'Consulta médica general, chequeos preventivos y diagnóstico primario', 50000.00),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Cardiología', 'Evaluación cardiovascular, electrocardiogramas y seguimiento de patologías cardíacas', 80000.00),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Pediatría', 'Atención integral para pacientes pediátricos, vacunación y control de crecimiento', 60000.00)
ON CONFLICT (id) DO NOTHING;

-- USUARIOS
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Administrador MediCore', 'admin@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'admin', '+57 300 111 1111'),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Carlos García López', 'medico@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'medico', '+57 300 222 2222'),
    ('33333333-3333-3333-3333-333333333333', 'Dra. Ana Martínez Ruiz', 'dra.martinez@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'medico', '+57 300 333 3333'),
    ('44444444-4444-4444-4444-444444444444', 'Carlos Andrés Mendoza', 'paciente@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'paciente', '+57 300 444 4444'),
    ('55555555-5555-5555-5555-555555555555', 'María López Torres', 'maria.lopez@email.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'paciente', '+57 300 555 5555')
ON CONFLICT (id) DO NOTHING;

-- MÉDICOS
INSERT INTO medicos (id, usuario_id, especialidad_id, sede_id, tarjeta_profesional, duracion_cita_minutos, genero) VALUES
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', '22222222-2222-2222-2222-222222222222',
     'd4e5f6a7-b8c9-0123-defa-234567890123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
     'TP-CARD-001', 45, 'M'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', '33333333-3333-3333-3333-333333333333',
     'c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
     'TP-MG-002', 30, 'F')
ON CONFLICT (id) DO NOTHING;

-- PACIENTES
INSERT INTO pacientes (id, usuario_id, documento_tipo, documento_numero, fecha_nacimiento, contacto_emergencia, telefono_emergencia) VALUES
    ('f0f01111-2222-3333-4444-555511111111', '44444444-4444-4444-4444-444444444444',
     'CC', '1098765432', '1990-05-15', 'Laura Mendoza', '+57 300 666 6666'),
    ('f0f02222-2222-3333-4444-555522222222', '55555555-5555-5555-5555-555555555555',
     'CC', '1087654321', '1985-11-22', 'Roberto López', '+57 300 777 7777')
ON CONFLICT (id) DO NOTHING;

-- HORARIOS MÉDICOS
INSERT INTO horarios_medico (medico_id, dia, hora_inicio, hora_fin) VALUES
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'lunes',     '08:00', '12:00'),
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'lunes',     '14:00', '17:00'),
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'miercoles', '08:00', '12:00'),
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'miercoles', '14:00', '17:00'),
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'viernes',   '08:00', '12:00'),
    ('a0a01111-bbbb-cccc-dddd-eeee11111111', 'viernes',   '14:00', '17:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'lunes',   '07:00', '12:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'lunes',   '13:00', '16:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'martes',  '07:00', '12:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'martes',  '13:00', '16:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'jueves',  '07:00', '12:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'jueves',  '13:00', '16:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'viernes', '07:00', '12:00'),
    ('a0a02222-bbbb-cccc-dddd-eeee22222222', 'viernes', '13:00', '16:00')
ON CONFLICT DO NOTHING;
