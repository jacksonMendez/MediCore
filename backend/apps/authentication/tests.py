from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import Usuario, Rol
from apps.authentication.authentication import create_access_token
from apps.clinica.models import Sede, Especialidad, Medico, Paciente
from apps.citas.models import Cita, EstadoCita


class RBACTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed roles if not present
        Rol.objects.get_or_create(codigo='paciente', defaults={'nombre': 'Paciente'})
        Rol.objects.get_or_create(codigo='medico', defaults={'nombre': 'Médico'})
        Rol.objects.get_or_create(codigo='admin', defaults={'nombre': 'Administrador'})
        Rol.objects.get_or_create(codigo='agente_atencion', defaults={'nombre': 'Agente'})

        # Seed catalog EstadoCita
        EstadoCita.objects.get_or_create(codigo='pendiente_pago', defaults={'nombre': 'Pendiente'})
        EstadoCita.objects.get_or_create(codigo='confirmada', defaults={'nombre': 'Confirmada'})
        EstadoCita.objects.get_or_create(codigo='cancelada', defaults={'nombre': 'Cancelada'})

        # Create test users
        self.user_paciente = Usuario.objects.create_user(
            correo='paciente.test@medicore.com',
            password='Password123!',
            nombre_completo='Paciente Test',
            rol_id='paciente'
        )
        self.user_paciente_2 = Usuario.objects.create_user(
            correo='paciente2.test@medicore.com',
            password='Password123!',
            nombre_completo='Paciente Dos',
            rol_id='paciente'
        )
        self.user_medico = Usuario.objects.create_user(
            correo='medico.test@medicore.com',
            password='Password123!',
            nombre_completo='Dr. Medico Test',
            rol_id='medico'
        )
        self.user_admin = Usuario.objects.create_superuser(
            correo='admin.test@medicore.com',
            password='Password123!',
            nombre_completo='Admin Test'
        )

        # Profiles
        self.sede = Sede.objects.create(nombre='Sede Test', direccion='Dir Test', telefono='123')
        self.esp = Especialidad.objects.create(nombre='Esp Test', precio_base=50000.00)
        self.medico = Medico.objects.create(
            usuario=self.user_medico,
            especialidad=self.esp,
            sede=self.sede,
            tarjeta_profesional='TP-TEST-001'
        )
        self.paciente = Paciente.objects.create(
            usuario=self.user_paciente,
            documento_tipo='CC',
            documento_numero='123456789'
        )
        self.paciente_2 = Paciente.objects.create(
            usuario=self.user_paciente_2,
            documento_tipo='CC',
            documento_numero='987654321'
        )

        # Appointment for paciente 2
        self.cita_p2 = Cita.objects.create(
            paciente=self.paciente_2,
            medico=self.medico,
            sede=self.sede,
            fecha_hora='2026-10-15 09:00:00',
            estado_id='pendiente_pago'
        )

        # Tokens
        self.token_paciente = create_access_token(self.user_paciente)
        self.token_medico = create_access_token(self.user_medico)
        self.token_admin = create_access_token(self.user_admin)

    def test_unauthenticated_denegado(self):
        """Peticiones sin autenticación a endpoints protegidos deben ser denegadas (401 o 403)."""
        response = self.client.get('/api/citas/mis-citas')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_paciente_acceso_permitido(self):
        """Paciente autenticado puede consultar sus propias citas."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_paciente}')
        response = self.client.get('/api/citas/mis-citas')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_paciente_acceso_denegado_admin(self):
        """Paciente no tiene permiso para crear sedes ni médicos (403 Forbidden)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_paciente}')
        response = self.client.post('/api/sedes/', {'nombre': 'Sede Ilegal', 'direccion': 'X', 'telefono': '0'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_paciente_no_puede_modificar_cita_ajena(self):
        """Paciente no puede cancelar ni modificar la cita de otro paciente."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_paciente}')
        response = self.client.patch(f'/api/citas/{self.cita_p2.id}/estado', {'nuevo_estado': 'cancelada'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_medico_acceso_agenda(self):
        """Médico puede consultar su agenda médica del día."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_medico}')
        response = self.client.get(f'/api/citas/agenda-hoy/{self.medico.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_acceso_total(self):
        """Administrador puede crear sedes y gestionar el sistema."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_admin}')
        response = self.client.post('/api/sedes/', {'nombre': 'Sede Nueva Admin', 'direccion': 'Calle 50', 'telefono': '555000'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
