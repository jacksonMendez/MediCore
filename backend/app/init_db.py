"""
MediCore OS — Database Initializer & Seeder
Auto-creates tables and populates seed data for immediate testing.
"""

import sys
import asyncio
from datetime import date, time, datetime
from sqlalchemy import select
from app.core.database import engine, Base, async_session_factory
from app.models.models import (
    Usuario, Paciente, Medico, Sede, Especialidad, HorarioMedico
)
from app.core.security import hash_password

# Ensure UTF-8 stdout encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


async def init_db():
    print("[MediCore OS] Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[MediCore OS] Database schema created!")

    async with async_session_factory() as db:
        # Check if users already exist
        res = await db.execute(select(Usuario))
        existing_user = res.scalars().first()
        if existing_user:
            print("[MediCore OS] Seed data already present.")
            return

        print("[MediCore OS] Seeding initial data...")

        # 1. Sedes
        sede_central = Sede(
            nombre="Sede Central - Chapinero",
            direccion="Calle 67 # 10-15, Bogotá",
            telefono="+57 601 555 0101",
            activa=True
        )
        sede_norte = Sede(
            nombre="Sede Norte - Unicentro",
            direccion="Carrera 15 # 124-30, Bogotá",
            telefono="+57 601 555 0102",
            activa=True
        )
        db.add_all([sede_central, sede_norte])
        await db.flush()

        # 2. Especialidades
        esp_general = Especialidad(
            nombre="Medicina General",
            descripcion="Atención médica primaria y preventiva para toda la familia",
            precio_base=80000.00
        )
        esp_cardio = Especialidad(
            nombre="Cardiología",
            descripcion="Diagnóstico y tratamiento de enfermedades del corazón",
            precio_base=180000.00
        )
        esp_derma = Especialidad(
            nombre="Dermatología",
            descripcion="Cuidado de la piel, cabello y uñas",
            precio_base=150000.00
        )
        esp_pediatria = Especialidad(
            nombre="Pediatría",
            descripcion="Atención médica especializada para niños y adolescentes",
            precio_base=120000.00
        )
        db.add_all([esp_general, esp_cardio, esp_derma, esp_pediatria])
        await db.flush()

        # Hash password for demo accounts
        demo_pass_hash = hash_password("Password123!")

        # 3. Usuarios y Pacientes
        u_pac1 = Usuario(
            nombre_completo="Carlos Andrés Mendoza",
            correo="paciente@medicore.com",
            password_hash=demo_pass_hash,
            rol="paciente",
            telefono="+57 300 123 4567"
        )
        u_pac2 = Usuario(
            nombre_completo="María Fernanda Gómez",
            correo="maria.gomez@email.com",
            password_hash=demo_pass_hash,
            rol="paciente",
            telefono="+57 310 987 6543"
        )
        db.add_all([u_pac1, u_pac2])
        await db.flush()

        p_pac1 = Paciente(
            usuario_id=u_pac1.id,
            documento_tipo="CC",
            documento_numero="1018234567",
            fecha_nacimiento=date(1990, 5, 15),
            contacto_emergencia="Laura Mendoza (Esposa)",
            telefono_emergencia="+57 300 111 2233"
        )
        p_pac2 = Paciente(
            usuario_id=u_pac2.id,
            documento_tipo="CC",
            documento_numero="1020456789",
            fecha_nacimiento=date(1995, 8, 22),
            contacto_emergencia="Roberto Gómez (Padre)",
            telefono_emergencia="+57 310 444 5566"
        )
        db.add_all([p_pac1, p_pac2])

        # 4. Usuarios y Médicos
        u_med1 = Usuario(
            nombre_completo="Dr. Alejandro Silva",
            correo="medico@medicore.com",
            password_hash=demo_pass_hash,
            rol="medico",
            telefono="+57 315 555 7788"
        )
        u_med2 = Usuario(
            nombre_completo="Dra. Elena Rostova",
            correo="elena.rostova@medicore.com",
            password_hash=demo_pass_hash,
            rol="medico",
            telefono="+57 318 666 9900"
        )
        db.add_all([u_med1, u_med2])
        await db.flush()

        m_med1 = Medico(
            usuario_id=u_med1.id,
            especialidad_id=esp_general.id,
            sede_id=sede_central.id,
            tarjeta_profesional="TP-10982-COL",
            duracion_cita_minutos=30
        )
        m_med2 = Medico(
            usuario_id=u_med2.id,
            especialidad_id=esp_cardio.id,
            sede_id=sede_norte.id,
            tarjeta_profesional="TP-15432-COL",
            duracion_cita_minutos=45
        )
        db.add_all([m_med1, m_med2])
        await db.flush()

        # Horarios para médicos
        dias = ["lunes", "martes", "miercoles", "jueves", "viernes"]
        for dia in dias:
            db.add(HorarioMedico(
                medico_id=m_med1.id,
                dia=dia,
                hora_inicio=time(8, 0),
                hora_fin=time(16, 0)
            ))
            db.add(HorarioMedico(
                medico_id=m_med2.id,
                dia=dia,
                hora_inicio=time(9, 0),
                hora_fin=time(17, 0)
            ))

        # 5. Usuario Admin
        u_admin = Usuario(
            nombre_completo="Administrador General",
            correo="admin@medicore.com",
            password_hash=demo_pass_hash,
            rol="admin",
            telefono="+57 601 555 0000"
        )
        db.add(u_admin)

        await db.commit()
        print("[MediCore OS] Seed data created successfully!")
        print("\nDemo Credentials (Password for all: Password123!):")
        print("   - Paciente: paciente@medicore.com")
        print("   - Medico:   medico@medicore.com")
        print("   - Admin:    admin@medicore.com\n")


if __name__ == "__main__":
    asyncio.run(init_db())
