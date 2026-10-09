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

    def test_auditoria_creacion_sede_y_especialidad(self):
        self.client.force_authenticate(user=self.admin)
        resp_sede = self.client.post('/api/sedes/', {
            'nombre': 'Sede Auditoría Test',
            'direccion': 'Calle 100 # 15-20',
            'telefono': '3001234567',
        })
        self.assertEqual(resp_sede.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RegistroAuditoria.objects.filter(accion='sede_creada', entidad_tipo='Sede').exists())

        resp_esp = self.client.post('/api/especialidades/', {
            'nombre': 'Neurología Test',
            'descripcion': 'Atención neurológica',
            'precio_base': 120000.00,
        })
        self.assertEqual(resp_esp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RegistroAuditoria.objects.filter(accion='especialidad_creada', entidad_tipo='Especialidad').exists())

    def test_auditoria_login_fallido_y_logout(self):
        # Login fallido registra auditoría
        resp_fail = self.client.post('/api/auth/login/', {
            'correo': 'admin.view@medicore.com',
            'password': 'WrongPassword!',
        })
        self.assertEqual(resp_fail.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(RegistroAuditoria.objects.filter(accion='login_fallido').exists())

        # Logout registra auditoría
        self.client.force_authenticate(user=self.admin)
        resp_logout = self.client.post('/api/auth/logout/')
        self.assertEqual(resp_logout.status_code, status.HTTP_200_OK)
        self.assertTrue(RegistroAuditoria.objects.filter(accion='logout').exists())

    def test_rbac_paciente_bloqueado_en_endpoints_admin(self):
        self.client.force_authenticate(user=self.paciente)

        # Paciente no puede crear sedes
        resp_sede = self.client.post('/api/sedes/', {'nombre': 'Sede Hack', 'direccion': 'Cra 1'})
        self.assertEqual(resp_sede.status_code, status.HTTP_403_FORBIDDEN)

        # Paciente no puede crear especialidades
        resp_esp = self.client.post('/api/especialidades/', {'nombre': 'Cardio Hack'})
        self.assertEqual(resp_esp.status_code, status.HTTP_403_FORBIDDEN)

        # Paciente no puede ver registros de auditoría
        resp_audit = self.client.get('/api/auditoria/')
        self.assertEqual(resp_audit.status_code, status.HTTP_403_FORBIDDEN)
