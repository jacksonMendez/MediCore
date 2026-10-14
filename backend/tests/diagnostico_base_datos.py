import os
import sys
import json
from datetime import datetime

# Garantizar salida UTF-8 en terminal de Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')

import django
django.setup()

from django.db import connection
from django.conf import settings
from django.apps import apps
from django.db.models import Count

from apps.authentication.models import Usuario, Rol
from apps.auditoria.models import RegistroAuditoria
from apps.auditoria.services import registrar_auditoria
from apps.clinica.models import Sede, Especialidad, Medico, HorarioMedico, Paciente
from apps.citas.models import EstadoCita, TipoPQR, EstadoPQR, Cita, ConsultaNota, PQRSolicitud
from apps.pagos.models import MetodoPago, EstadoPago, Pago
from apps.chatbot.models import SesionChat, MensajeChat

def ejecutar_diagnostico():
    print("=" * 80)
    print(">>> DIAGNÓSTICO INTEGRAL: BASE DE DATOS, TABLAS, ROLES Y AUDITORÍA <<<")
    print("=" * 80)

    # 1. INFORMACIÓN DEL MOTOR Y CONEXIÓN
    engine = settings.DATABASES['default']['ENGINE']
    db_name = settings.DATABASES['default']['NAME']
    print("\n[1] CONEXIÓN A BASE DE DATOS")
    print(f"  • Motor configurado: {engine}")
    print(f"  • Base de datos:     {db_name}")

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        test_conn = cursor.fetchone()[0]
    print(f"  • Estado conexión:   {'ACTIVA (OK)' if test_conn == 1 else 'FALLO'}")

    # 2. INVENTARIO COMPLETO DE TABLAS EN LA BASE DE DATOS
    print("\n[2] INVENTARIO DE TODAS LAS TABLAS EN LA BASE DE DATOS")
    with connection.cursor() as cursor:
        tables_in_db = connection.introspection.table_names(cursor)

    print(f"  Total tablas físicas en DB: {len(tables_in_db)}")

    app_models = [
        ('Autenticación', Rol),
        ('Autenticación', Usuario),
        ('Auditoría', RegistroAuditoria),
        ('Clínica', Sede),
        ('Clínica', Especialidad),
        ('Clínica', Medico),
        ('Clínica', HorarioMedico),
        ('Clínica', Paciente),
        ('Citas', EstadoCita),
        ('Citas', Cita),
        ('Citas', ConsultaNota),
        ('PQR', TipoPQR),
        ('PQR', EstadoPQR),
        ('PQR', PQRSolicitud),
        ('Pagos', MetodoPago),
        ('Pagos', EstadoPago),
        ('Pagos', Pago),
        ('Chatbot IA', SesionChat),
        ('Chatbot IA', MensajeChat),
    ]

    print(f"\n  {'MÓDULO':<16} {'MODELO DJANGO':<20} {'TABLA DB':<22} {'ESTADO EN DB':<15} {'REGISTROS'}")
    print("  " + "-" * 85)

    all_tables_ok = True
    for modulo, model in app_models:
        db_table = model._meta.db_table
        existe = db_table in tables_in_db
        if not existe:
            all_tables_ok = False
            estado_txt = "❌ NO EXISTE"
            count_txt = "N/A"
        else:
            estado_txt = "✅ EXISTE"
            try:
                count_txt = str(model.objects.count())
            except Exception as e:
                count_txt = f"ERROR ({e})"
                all_tables_ok = False

        print(f"  {modulo:<16} {model.__name__:<20} {db_table:<22} {estado_txt:<15} {count_txt}")

    # 3. VERIFICACIÓN DETALLADA DE LA TABLA DE ROLES
    print("\n[3] REVISIÓN DE LA TABLA DE ROLES ('roles')")
    roles = list(Rol.objects.all().order_by('codigo'))
    if roles:
        print(f"  ✅ Roles definidos en la base de datos ({len(roles)} encontrados):")
        for r in roles:
            print(f"     - Código: '{r.codigo:<15}' Nombre: '{r.nombre:<20}' Activo: {r.activo} | {r.descripcion or ''}")
    else:
        print("  ❌ No se encontraron roles en la tabla 'roles'.")

    # Usuarios agrupados por rol en la base de datos
    print("\n  • Usuarios por rol registrados en la base de datos:")
    usuarios_por_rol = Usuario.objects.values('rol__codigo').annotate(total=Count('id')).order_by('-total')
    for item in usuarios_por_rol:
        rol_cod = item['rol__codigo'] or 'Sin rol'
        print(f"     - Rol '{rol_cod}': {item['total']} usuario(s)")

    # Comprobación de usuarios demo principales
    print("\n  • Estado de cuentas principales demo:")
    demo_emails = ['paciente@medicore.com', 'medico@medicore.com', 'admin@medicore.com']
    for demail in demo_emails:
        u = Usuario.objects.filter(correo=demail).first()
        if u:
            print(f"     - {demail:<25} -> ID: {u.id} | Rol DB: '{u.rol_id}' | Activo: {u.activo} | Verificado: {u.correo_verificado}")
        else:
            print(f"     - {demail:<25} -> ⚠️ No encontrado en la base de datos.")

    # 4. VERIFICACIÓN PROFUNDA DE LA TABLA DE AUDITORÍA ('auditoria')
    print("\n[4] REVISIÓN DE LA TABLA DE AUDITORÍA ('auditoria')")
    total_auditorias = RegistroAuditoria.objects.count()
    print(f"  • Total registros de auditoría en la base de datos: {total_auditorias}")

    # Insertar un registro de prueba en vivo para certificar escritura
    test_token = f"TEST-AUDIT-{datetime.now().strftime('%H%M%S')}"
    admin_u = Usuario.objects.filter(rol='admin').first()
    nuevo_audit = registrar_auditoria(
        accion='diagnostico_sistema',
        entidad_tipo='Sistema',
        entidad_id=test_token,
        usuario=admin_u,
        datos_cambio={'verificacion': 'roles_y_tablas', 'resultado': 'en_proceso'},
        ip='127.0.0.1',
        origen='sistema'
    )
    if nuevo_audit and RegistroAuditoria.objects.filter(entidad_id=test_token).exists():
        print(f"  ✅ ESCRITURA EN AUDITORÍA CERTIFICADA: Registro {nuevo_audit.id} insertado y verificado en DB.")
    else:
        print("  ❌ ERROR: No se pudo persistir el registro de prueba en la tabla 'auditoria'.")

    # Mostrar las últimas 5 auditorías reales en la base de datos
    print("\n  • Últimos registros de auditoría persistidos en DB:")
    ultimas_auditorias = RegistroAuditoria.objects.all().order_by('-timestamp')[:5]
    for a in ultimas_auditorias:
        u_email = a.usuario.correo if a.usuario else 'Sistema/Anónimo'
        fecha_str = a.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        cambios_str = json.dumps(a.datos_cambio, ensure_ascii=False) if a.datos_cambio else '{}'
        if len(cambios_str) > 55:
            cambios_str = cambios_str[:55] + '...'
        print(f"     [{fecha_str}] Acción: {a.accion:<25} Entidad: {a.entidad_tipo:<12} Usuario: {u_email:<25} IP: {a.ip or 'N/A':<12}")
        print(f"          Datos: {cambios_str}")

    # Tipos de eventos auditados en el historial
    print("\n  • Distribución de eventos registrados en la auditoría:")
    eventos_audit = RegistroAuditoria.objects.values('accion').annotate(cant=Count('id')).order_by('-cant')[:8]
    for ev in eventos_audit:
        print(f"     - {ev['accion']:<30}: {ev['cant']} eventos")

    # 5. VERIFICACIÓN DE CONTROL DE ACCESO (RBAC) ENTRE BACKEND Y BASE DE DATOS
    print("\n[5] FUNCIONAMIENTO DE ROLES: BACKEND Y BASE DE DATOS")
    from apps.authentication.authentication import require_role, create_access_token, decode_access_token

    class MockRequest:
        def __init__(self, user):
            self.user = user

    paciente_u = Usuario.objects.filter(rol_id='paciente').first()
    admin_u = Usuario.objects.filter(rol_id='admin').first()
    medico_u = Usuario.objects.filter(rol_id='medico').first()

    perm_admin = require_role(['admin'])()
    perm_medico = require_role(['medico'])()
    perm_paciente = require_role(['paciente'])()

    req_pac = MockRequest(paciente_u)
    req_med = MockRequest(medico_u)
    req_adm = MockRequest(admin_u)

    pac_to_adm = perm_admin.has_permission(req_pac, None)
    pac_to_med = perm_medico.has_permission(req_pac, None)
    pac_to_pac = perm_paciente.has_permission(req_pac, None)

    med_to_adm = perm_admin.has_permission(req_med, None)
    med_to_med = perm_medico.has_permission(req_med, None)

    adm_to_adm = perm_admin.has_permission(req_adm, None)
    adm_to_med = perm_medico.has_permission(req_adm, None)

    print(f"  • Matriz de Permisos RBAC Backend (Roles desde PostgreSQL):")
    print(f"     - Paciente -> Vista Admin:    {'⛔ BLOQUEADO (OK)' if not pac_to_adm else '❌ FALLO'}")
    print(f"     - Paciente -> Vista Médico:   {'⛔ BLOQUEADO (OK)' if not pac_to_med else '❌ FALLO'}")
    print(f"     - Paciente -> Vista Paciente: {'✅ PERMITIDO (OK)' if pac_to_pac else '❌ FALLO'}")
    print(f"     - Médico   -> Vista Admin:    {'⛔ BLOQUEADO (OK)' if not med_to_adm else '❌ FALLO'}")
    print(f"     - Médico   -> Vista Médico:   {'✅ PERMITIDO (OK)' if med_to_med else '❌ FALLO'}")
    print(f"     - Admin    -> Vista Admin:    {'✅ PERMITIDO (OK)' if adm_to_adm else '❌ FALLO'}")
    print(f"     - Admin    -> Vista General:  {'✅ PERMITIDO (OK)' if adm_to_med else '❌ FALLO'} (Superusuario administrativo)")

    # Validación de generación y firma JWT con rol de DB
    print("\n  • Validación de emisión y desencriptación de Tokens JWT:")
    tok_pac = create_access_token(paciente_u)
    payload_pac = decode_access_token(tok_pac)
    print(f"     - Token Paciente -> Rol emitido en payload: '{payload_pac.get('rol')}' (Esperado: 'paciente') {'✅' if payload_pac.get('rol') == 'paciente' else '❌'}")

    tok_med = create_access_token(medico_u)
    payload_med = decode_access_token(tok_med)
    print(f"     - Token Médico   -> Rol emitido en payload: '{payload_med.get('rol')}' (Esperado: 'medico') {'✅' if payload_med.get('rol') == 'medico' else '❌'}")

    tok_adm = create_access_token(admin_u)
    payload_adm = decode_access_token(tok_adm)
    print(f"     - Token Admin    -> Rol emitido en payload: '{payload_adm.get('rol')}' (Esperado: 'admin') {'✅' if payload_adm.get('rol') == 'admin' else '❌'}")

    # 6. RESUMEN FINAL
    print("\n" + "=" * 80)
    if all_tables_ok:
        print(">>> RESULTADO: TODAS LAS 19 TABLAS PRINCIPALES ESTÁN OPERATIVAS EN LA BASE DE DATOS <<<")
    else:
        print(">>> RESULTADO: ALGUNAS TABLAS PRESENTAN ADVERTENCIAS O ERRORES <<<")
    print("=" * 80)

if __name__ == '__main__':
    ejecutar_diagnostico()
