-- ============================================================
-- MediCore OS — Seed Data
-- ============================================================
-- Passwords are bcrypt-hashed versions of 'MediCore2024!'
-- $2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6

-- ============================================================
-- SEDES
-- ============================================================

INSERT INTO sedes (id, nombre, direccion, telefono, activa) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sede Norte - Centro Médico Aurora', 'Calle 100 #15-25, Bogotá', '+57 601 555 0101', TRUE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Sede Centro - Clínica del Parque', 'Carrera 7 #45-10, Bogotá', '+57 601 555 0202', TRUE);

-- ============================================================
-- ESPECIALIDADES
-- ============================================================

INSERT INTO especialidades (id, nombre, descripcion, precio_base) VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Medicina General', 'Consulta médica general, chequeos preventivos y diagnóstico primario', 50000.00),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Cardiología', 'Evaluación cardiovascular, electrocardiogramas y seguimiento de patologías cardíacas', 80000.00),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Pediatría', 'Atención integral para pacientes pediátricos, vacunación y control de crecimiento', 60000.00);

-- ============================================================
-- USUARIOS
-- ============================================================

-- Admin user (admin@medicore.com / MediCore2024!)
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Administrador MediCore', 'admin@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'admin', '+57 300 111 1111');

-- Doctor 1: Cardiología (dr.garcia@medicore.com / MediCore2024!)
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Dr. Carlos García López', 'dr.garcia@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'medico', '+57 300 222 2222');

-- Doctor 2: Medicina General (dra.martinez@medicore.com / MediCore2024!)
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('33333333-3333-3333-3333-333333333333', 'Dra. Ana Martínez Ruiz', 'dra.martinez@medicore.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'medico', '+57 300 333 3333');

-- Paciente 1 (juan.perez@email.com / MediCore2024!)
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Juan Pérez Gómez', 'juan.perez@email.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'paciente', '+57 300 444 4444');

-- Paciente 2 (maria.lopez@email.com / MediCore2024!)
INSERT INTO usuarios (id, nombre_completo, correo, password_hash, rol, telefono) VALUES
    ('55555555-5555-5555-5555-555555555555', 'María López Torres', 'maria.lopez@email.com',
     '$2b$12$LJ3m4ys5Lz0ZUOR7qNcaGOYF4E6VpH8Kxq3cXM5IjkZ1v3n5W6Dq6', 'paciente', '+57 300 555 5555');

-- ============================================================
-- MÉDICOS
-- ============================================================

INSERT INTO medicos (id, usuario_id, especialidad_id, sede_id, tarjeta_profesional, duracion_cita_minutos) VALUES
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', '22222222-2222-2222-2222-222222222222',
     'd4e5f6a7-b8c9-0123-defa-234567890123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
     'TP-CARD-001', 45),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', '33333333-3333-3333-3333-333333333333',
     'c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
     'TP-MG-002', 30);

-- ============================================================
-- PACIENTES
-- ============================================================

INSERT INTO pacientes (id, usuario_id, documento_tipo, documento_numero, fecha_nacimiento, contacto_emergencia, telefono_emergencia) VALUES
    ('pppp1111-qqqq-rrrr-ssss-tttt11111111', '44444444-4444-4444-4444-444444444444',
     'CC', '1098765432', '1990-05-15', 'Laura Pérez', '+57 300 666 6666'),
    ('pppp2222-qqqq-rrrr-ssss-tttt22222222', '55555555-5555-5555-5555-555555555555',
     'CC', '1087654321', '1985-11-22', 'Roberto López', '+57 300 777 7777');

-- ============================================================
-- HORARIOS MÉDICOS
-- ============================================================

-- Dr. García (Cardiólogo) - Sede Norte: Lun-Mié-Vie 8:00-12:00 y 14:00-17:00
INSERT INTO horarios_medico (medico_id, dia, hora_inicio, hora_fin) VALUES
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'lunes',     '08:00', '12:00'),
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'lunes',     '14:00', '17:00'),
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'miercoles', '08:00', '12:00'),
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'miercoles', '14:00', '17:00'),
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'viernes',   '08:00', '12:00'),
    ('aaaa1111-bbbb-cccc-dddd-eeee11111111', 'viernes',   '14:00', '17:00');

-- Dra. Martínez (Med. General) - Sede Centro: Lun-Mar-Jue-Vie 7:00-12:00 y 13:00-16:00
INSERT INTO horarios_medico (medico_id, dia, hora_inicio, hora_fin) VALUES
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'lunes',   '07:00', '12:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'lunes',   '13:00', '16:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'martes',  '07:00', '12:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'martes',  '13:00', '16:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'jueves',  '07:00', '12:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'jueves',  '13:00', '16:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'viernes', '07:00', '12:00'),
    ('aaaa2222-bbbb-cccc-dddd-eeee22222222', 'viernes', '13:00', '16:00');
