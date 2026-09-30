import uuid
from django.test import TestCase
from django.core.exceptions import PermissionDenied
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import Usuario, Rol
from apps.auditoria.models import RegistroAuditoria
from apps.auditoria.services import registrar_auditoria


class AuditoriaModelTestCase(TestCase):
    def setUp(self):
        self.rol_admin, _ = Rol.objects.get_or_create(codigo='admin', defaults={'nombre': 'Administrador'})
        self.rol_paciente, _ = Rol.objects.get_or_create(codigo='paciente', defaults={'nombre': 'Paciente'})

        self.user = Usuario.objects.create_user(
            correo='admin.audit@medicore.com',
            password='TestPassword123!',
            nombre_completo='Dr. Admin Audit',
            rol_id='admin',
        )

    def test_creacion_registro_auditoria(self):
        registro = registrar_auditoria(
            accion='cita_creada',
            entidad_tipo='Cita',
            entidad_id='12345',
            usuario=self.user,
            datos_cambio={'detalle': 'Cita de prueba'},
            origen='humano_admin',
        )
        self.assertIsNotNone(registro.id)
        self.assertEqual(registro.accion, 'cita_creada')
        self.assertEqual(registro.entidad_tipo, 'Cita')
        self.assertEqual(registro.entidad_id, '12345')
        self.assertEqual(registro.origen, 'humano_admin')
        self.assertEqual(registro.rol_en_el_momento, 'admin')
        self.assertEqual(registro.datos_cambio.get('detalle'), 'Cita de prueba')

    def test_inmutabilidad_bloquea_modificacion(self):
        registro = registrar_auditoria(
            accion='cita_creada',
            entidad_tipo='Cita',
            entidad_id='12345',
            usuario=self.user,
        )
        # Attempt to modify an existing record
        registro.accion = 'cita_cancelada'
        with self.assertRaises(PermissionDenied):
            registro.save()

    def test_inmutabilidad_bloquea_eliminacion(self):
        registro = registrar_auditoria(
            accion='pago_confirmado',
            entidad_tipo='Pago',
            entidad_id='pago-99',
            usuario=self.user,
        )
        # Attempt to delete existing record
        with self.assertRaises(PermissionDenied):
            registro.delete()

    def test_origen_bot_llm_registrado_correctamente(self):
        registro = registrar_auditoria(
            accion='cita_creada',
            entidad_tipo='Cita',
            entidad_id='bot-cita-01',
            usuario=self.user,
            rol_en_el_momento='paciente',
            origen='bot_llm',
            datos_cambio={'medico': 'Dra. María González'},
        )
        self.assertEqual(registro.origen, 'bot_llm')
        self.assertEqual(registro.accion, 'cita_creada')


class AuditoriaApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.rol_admin, _ = Rol.objects.get_or_create(codigo='admin', defaults={'nombre': 'Administrador'})
        self.rol_paciente, _ = Rol.objects.get_or_create(codigo='paciente', defaults={'nombre': 'Paciente'})

        self.admin = Usuario.objects.create_user(
            correo='admin.view@medicore.com',
            password='AdminPassword123!',
            nombre_completo='Super Admin',
            rol_id='admin',
        )

        self.paciente = Usuario.objects.create_user(
            correo='paciente.view@medicore.com',
            password='PacientePassword123!',
            nombre_completo='Juan Pérez',
            rol_id='paciente',
        )

        # Seed audit records
        registrar_auditoria(
            accion='login_exitoso',
            entidad_tipo='Usuario',
            entidad_id=str(self.admin.id),
            usuario=self.admin,
            origen='humano_admin',
        )
        registrar_auditoria(
            accion='cita_creada',
            entidad_tipo='Cita',
            entidad_id='cita-001',
            usuario=self.paciente,
            origen='bot_llm',
        )
        registrar_auditoria(
            accion='pago_confirmado',
            entidad_tipo='Pago',
            entidad_id='pago-001',
            usuario=self.paciente,
            origen='sistema',
        )

    def test_acceso_no_autenticado_denegado(self):
        response = self.client.get('/api/auditoria/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_acceso_paciente_denegado(self):
        self.client.force_authenticate(user=self.paciente)
        response = self.client.get('/api/auditoria/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_acceso_admin_permitido(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auditoria/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 3)

    def test_filtro_por_origen(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auditoria/?origen=bot_llm')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['origen'], 'bot_llm')
        self.assertEqual(response.data['results'][0]['accion'], 'cita_creada')

    def test_filtro_por_accion(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auditoria/?accion=login_exitoso')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['accion'], 'login_exitoso')
