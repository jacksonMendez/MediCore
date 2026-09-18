"""
MediCore OS — Database Seeder Management Command
Populates seed data for immediate testing and parity with previous backend.
"""

from datetime import date, time
from django.core.management.base import BaseCommand
from apps.authentication.models import Usuario
from apps.clinica.models import Sede, Especialidad, Paciente, Medico, HorarioMedico


class Command(BaseCommand):
    help = "Populate database with MediCore initial seed data."

    def handle(self, *args, **options):
        self.stdout.write("[MediCore OS] Checking existing data...")

        if Usuario.objects.exists():
            self.stdout.write(self.style.WARNING("[MediCore OS] Seed data already present."))
            return

        self.stdout.write("[MediCore OS] Seeding initial data...")

        # 1. Sedes
        sede_central = Sede.objects.create(
            nombre="Sede Central - Chapinero",
            direccion="Calle 67 # 10-15, Bogotá",
            telefono="+57 601 555 0101",
            activa=True,
        )
        sede_norte = Sede.objects.create(
            nombre="Sede Norte - Unicentro",
            direccion="Carrera 15 # 124-30, Bogotá",
            telefono="+57 601 555 0102",
            activa=True,
        )

        # 2. Especialidades
        esp_general = Especialidad.objects.create(
            nombre="Medicina General",
            descripcion="Atención médica primaria y preventiva para toda la familia",
            precio_base=80000.00,
        )
        esp_cardio = Especialidad.objects.create(
            nombre="Cardiología",
            descripcion="Diagnóstico y tratamiento de enfermedades del corazón",
            precio_base=180000.00,
        )
        esp_derma = Especialidad.objects.create(
            nombre="Dermatología",
            descripcion="Cuidado de la piel, cabello y uñas",
            precio_base=150000.00,
        )
        esp_pediatria = Especialidad.objects.create(
            nombre="Pediatría",
            descripcion="Atención médica especializada para niños y adolescentes",
            precio_base=120000.00,
        )

        demo_password = "Password123!"

        # 3. Pacientes
        u_pac1 = Usuario.objects.create_user(
            nombre_completo="Carlos Andrés Mendoza",
            correo="paciente@medicore.com",
            password=demo_password,
            rol="paciente",
            telefono="+57 300 123 4567",
        )
        Paciente.objects.create(
            usuario=u_pac1,
            documento_tipo="CC",
            documento_numero="1018234567",
            fecha_nacimiento=date(1990, 5, 15),
            contacto_emergencia="Laura Mendoza (Esposa)",
            telefono_emergencia="+57 300 111 2233",
        )

        u_pac2 = Usuario.objects.create_user(
            nombre_completo="María Fernanda Gómez",
            correo="maria.gomez@email.com",
            password=demo_password,
            rol="paciente",
            telefono="+57 310 987 6543",
        )
        Paciente.objects.create(
            usuario=u_pac2,
            documento_tipo="CC",
            documento_numero="1020456789",
            fecha_nacimiento=date(1995, 8, 22),
            contacto_emergencia="Roberto Gómez (Padre)",
            telefono_emergencia="+57 310 444 5566",
        )

        # 4. Médicos
        u_med1 = Usuario.objects.create_user(
            nombre_completo="Dr. Alejandro Silva",
            correo="medico@medicore.com",
            password=demo_password,
            rol="medico",
            telefono="+57 315 555 7788",
        )
        m_med1 = Medico.objects.create(
            usuario=u_med1,
            especialidad=esp_general,
            sede=sede_central,
            tarjeta_profesional="TP-10982-COL",
            duracion_cita_minutos=30,
            genero="M",
            activo=True,
        )

        u_med2 = Usuario.objects.create_user(
            nombre_completo="Dra. Elena Rostova",
            correo="elena.rostova@medicore.com",
            password=demo_password,
            rol="medico",
            telefono="+57 318 666 9900",
        )
        m_med2 = Medico.objects.create(
            usuario=u_med2,
            especialidad=esp_cardio,
            sede=sede_norte,
            tarjeta_profesional="TP-15432-COL",
            duracion_cita_minutos=45,
            genero="F",
            activo=True,
        )

        # Horarios médicos (Lunes a Viernes)
        dias = ["lunes", "martes", "miercoles", "jueves", "viernes"]
        for dia in dias:
            HorarioMedico.objects.create(
                medico=m_med1,
                dia=dia,
                hora_inicio=time(8, 0),
                hora_fin=time(16, 0),
            )
            HorarioMedico.objects.create(
                medico=m_med2,
                dia=dia,
                hora_inicio=time(9, 0),
                hora_fin=time(17, 0),
            )

        # 5. Usuario Administrador
        Usuario.objects.create_superuser(
            nombre_completo="Administrador General",
            correo="admin@medicore.com",
            password=demo_password,
            rol="admin",
            telefono="+57 601 555 0000",
        )

        self.stdout.write(self.style.SUCCESS("[MediCore OS] Seed data created successfully!"))
        self.stdout.write(
            "\nDemo Credentials (Password for all: Password123!):\n"
            "   - Paciente: paciente@medicore.com\n"
            "   - Medico:   medico@medicore.com\n"
            "   - Admin:    admin@medicore.com\n"
        )
