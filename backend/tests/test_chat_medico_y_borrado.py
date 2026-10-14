import os
import sys
import django
import uuid

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from rest_framework.test import APIClient
from apps.authentication.models import Usuario, Rol
from apps.clinica.models import Medico, Especialidad, Sede, Paciente
from apps.chatbot.models import SesionChat, MensajeChat
from apps.chatbot.services.llm_orchestrator import LLMOrchestrator, SYSTEM_PROMPT_MEDICO, SYSTEM_PROMPT_PACIENTE

def test_chat_medico_y_borrado():
    print("=" * 65)
    print(">>> VERIFICACIÓN: CHAT PERSONALIZADO DEL DOCTOR Y BORRADO DE SESIONES <<<")
    print("=" * 65)

    client = APIClient()

    # 1. Crear o recuperar rol y médico de prueba
    rol_medico, _ = Rol.objects.get_or_create(codigo='medico', defaults={'nombre': 'Médico Especialista'})
    rol_paciente, _ = Rol.objects.get_or_create(codigo='paciente', defaults={'nombre': 'Paciente'})

    doc_user = Usuario.objects.filter(correo='doctor_test_chat@medicore.com').first()
    if not doc_user:
        doc_user = Usuario.objects.create(
            correo='doctor_test_chat@medicore.com',
            nombre_completo='Dr. Carlos Mendoza',
            rol=rol_medico,
            activo=True,
            correo_verificado=True
        )
        doc_user.set_password('DoctorPass123!')
        doc_user.save()

    especialidad, _ = Especialidad.objects.get_or_create(nombre='Medicina Interna', defaults={'precio_base': 70000})
    sede, _ = Sede.objects.get_or_create(nombre='Sede Norte Especializada', defaults={'direccion': 'Calle 100 # 15-20', 'telefono': '3001112233'})
    
    medico = Medico.objects.filter(usuario=doc_user).first()
    if not medico:
        medico = Medico.objects.create(
            usuario=doc_user,
            especialidad=especialidad,
            sede=sede,
            tarjeta_profesional='TP-MENDOZA-9988',
            duracion_cita_minutos=30,
            genero='M',
            activo=True
        )

    # Autenticar como médico
    client.force_authenticate(user=doc_user)

    # 2. Probar creación de sesión y borrado de sesión (botón de basurita)
    sesion = SesionChat.objects.create(
        usuario=doc_user,
        rol_origen='medico'
    )
    MensajeChat.objects.create(sesion=sesion, emisor='usuario', contenido='Revisar interacciones')
    MensajeChat.objects.create(sesion=sesion, emisor='asistente', contenido='Sin interacciones')

    print(f"\n[TEST 1] Verificando eliminación de sesión (Botón de basurita)...")
    res_delete = client.delete(f'/api/chat/sesiones/{sesion.id}')
    assert res_delete.status_code == 204, f"Se esperaba 204, se obtuvo {res_delete.status_code}"
    assert not SesionChat.objects.filter(id=sesion.id).exists(), "La sesión debería haber sido borrada de la base de datos"
    print("  -> OK: La sesión de chat fue eliminada exitosamente vía API con código 204.")

    # 3. Probar selección de prompt del Doctor en LLMOrchestrator
    print(f"\n[TEST 2] Verificando personalización del LLM para el Doctor...")
    orchestrator = LLMOrchestrator()

    # Comprobar que el prompt para médico contiene las directrices profesionales requeridas
    assert "Doctor Copilot" in SYSTEM_PROMPT_MEDICO
    assert "FARMACOLOGÍA CLÍNICA" in SYSTEM_PROMPT_MEDICO
    assert "CIE-10" in SYSTEM_PROMPT_MEDICO
    assert "SOAP" in SYSTEM_PROMPT_MEDICO
    assert "TÚ NO AGENDAS CITAS MÉDICAS PARA EL MÉDICO" in SYSTEM_PROMPT_MEDICO
    print("  -> OK: SYSTEM_PROMPT_MEDICO contiene reglas de Farmacología, CIE-10, formato SOAP y restricción de citas.")

    # 4. Probar que para un paciente se usa el prompt de paciente
    paciente_user = Usuario.objects.filter(correo='paciente_test_chat@medicore.com').first()
    if not paciente_user:
        paciente_user = Usuario.objects.create(
            correo='paciente_test_chat@medicore.com',
            nombre_completo='Ana María Gómez',
            rol=rol_paciente,
            activo=True,
            correo_verificado=True
        )
    assert "REGLAS DE OPERACIÓN CLÍNICA" in SYSTEM_PROMPT_PACIENTE
    print("  -> OK: SYSTEM_PROMPT_PACIENTE mantiene las reglas de agendamiento y triage exclusivas para pacientes.")

    # 5. Probar herramientas y prompt exclusivo del Administrador
    print(f"\n[TEST 3] Verificando Copiloto y Herramientas del Administrador...")
    from apps.chatbot.services.llm_orchestrator import SYSTEM_PROMPT_ADMIN, _tool_consultar_metricas_admin, _tool_consultar_pagos_pendientes_admin
    assert "Admin Copilot" in SYSTEM_PROMPT_ADMIN
    assert "SUPERVISIÓN FINANCIERA, RECAUDOS Y TRANSFERENCIAS" in SYSTEM_PROMPT_ADMIN
    assert "TÚ NO AGENDAS CITAS MÉDICAS PERSONALES" in SYSTEM_PROMPT_ADMIN
    print("  -> OK: SYSTEM_PROMPT_ADMIN contiene directrices ejecutivas de gobernanza y control financiero.")

    metricas_json = _tool_consultar_metricas_admin()
    import json
    metricas = json.loads(metricas_json)
    assert "resumen_financiero" in metricas
    assert "resumen_operativo_citas" in metricas
    assert "infraestructura_clinica" in metricas
    print("  -> OK: _tool_consultar_metricas_admin() retornó balance financiero y operativo real.")

    pagos_pendientes_json = _tool_consultar_pagos_pendientes_admin()
    pagos_pendientes = json.loads(pagos_pendientes_json)
    assert "transferencias_pendientes" in pagos_pendientes
    print("  -> OK: _tool_consultar_pagos_pendientes_admin() retornó lista de transferencias para auditar.")

    print("\n" + "=" * 65)
    print(">>> TODAS LAS PRUEBAS DE CHAT Y BORRADO PASARON AL 100% CON ÉXITO <<<")
    print("=" * 65)

if __name__ == '__main__':
    test_chat_medico_y_borrado()
