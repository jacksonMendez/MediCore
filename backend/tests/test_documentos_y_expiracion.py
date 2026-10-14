import os
import sys
import django
from datetime import timedelta

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicore.settings')
django.setup()

from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.authentication.models import Usuario, Rol
from apps.clinica.models import Medico, Paciente, Especialidad, Sede
from apps.citas.models import Cita, EstadoCita, ConsultaNota
from apps.citas.views import ConsultaNotaView, MisCitasView

def test_documentos_y_expiracion():
    print("=== INICIANDO TEST DE DOCUMENTOS, EXPIRACIÓN Y NOTAS CLÍNICAS ===")
    factory = APIRequestFactory()

    # Obtener médico y paciente de prueba
    rol_medico = Rol.objects.get(codigo='medico')
    rol_paciente = Rol.objects.get(codigo='paciente')

    u_medico = Usuario.objects.filter(rol=rol_medico).first()
    medico = Medico.objects.filter(usuario=u_medico).first()

    u_paciente = Usuario.objects.filter(rol=rol_paciente).first()
    paciente = Paciente.objects.filter(usuario=u_paciente).first()

    estado_confirmada = EstadoCita.objects.get(codigo='confirmada')
    sede = Sede.objects.first()

    # 1. Crear cita futura para atender con documento Word / PDF
    ahora = timezone.now()
    cita_valida = Cita.objects.create(
        paciente=paciente,
        medico=medico,
        sede=sede,
        fecha_hora=ahora + timedelta(hours=1),
        duracion_minutos=30,
        estado=estado_confirmada,
        motivo="Revisión cardiológica anual"
    )

    # Doctor atiende la cita y sube documento Word
    payload_word = {
        "diagnostico": "Paciente con ritmo sinusal normal, sin soplos.",
        "tratamiento": "Continuar con dieta baja en sodio y actividad física 30 min diarios.",
        "receta_medica": "Losartán 50mg cada 24 horas si presenta presión alta.",
        "archivo_adjunto": "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQABgAIAAAAIQ...",
        "archivo_nombre": "Historia_Clinica_Cardiologia.docx",
        "archivo_tipo": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }

    req_doc = factory.post(f'/api/citas/{cita_valida.id}/nota', payload_word, format='json')
    force_authenticate(req_doc, user=u_medico)
    res_doc = ConsultaNotaView.as_view()(req_doc, cita_id=cita_valida.id)
    assert res_doc.status_code in [200, 201], f"Error al guardar nota con Word: {res_doc.data}"
    assert res_doc.data['archivo_nombre'] == "Historia_Clinica_Cardiologia.docx"
    print("  -> OK: Doctor atendió consulta y adjuntó archivo Word (.docx) exitosamente.")

    # 2. Paciente consulta la cita y su nota clínica con el archivo adjunto
    req_paciente = factory.get(f'/api/citas/{cita_valida.id}/nota')
    force_authenticate(req_paciente, user=u_paciente)
    res_paciente = ConsultaNotaView.as_view()(req_paciente, cita_id=cita_valida.id)
    assert res_paciente.status_code == 200, f"Error al consultar nota como paciente: {res_paciente.data}"
    assert res_paciente.data['diagnostico'] == payload_word['diagnostico']
    assert res_paciente.data['archivo_nombre'] == "Historia_Clinica_Cardiologia.docx"
    assert res_paciente.data['archivo_adjunto'] is not None
    print("  -> OK: Paciente pudo consultar la ficha clínica con diagnóstico y archivo adjunto descargable.")

    # 3. Paciente lista mis-citas y la nota clínica viene incrustada
    req_mis_citas = factory.get('/api/citas/mis-citas')
    force_authenticate(req_mis_citas, user=u_paciente)
    res_mis_citas = MisCitasView.as_view()(req_mis_citas)
    assert res_mis_citas.status_code == 200
    cita_en_lista = next((c for c in res_mis_citas.data if c['id'] == str(cita_valida.id)), None)
    assert cita_en_lista is not None
    assert cita_en_lista['estado'] == 'atendida'
    assert cita_en_lista['nota_clinica'] is not None
    assert cita_en_lista['nota_clinica']['archivo_nombre'] == "Historia_Clinica_Cardiologia.docx"
    print("  -> OK: 'mis-citas' incluye el campo 'nota_clinica' estructurado con archivo descargable.")

    # 4. Probar cita expirada (fecha pasada > 2 horas)
    cita_expirada = Cita.objects.create(
        paciente=paciente,
        medico=medico,
        sede=sede,
        fecha_hora=ahora - timedelta(hours=3),
        duracion_minutos=30,
        estado=estado_confirmada,
        motivo="Cita antigua que no se atendió a tiempo"
    )

    # Intento del médico de atender la cita expirada debe ser RECHAZADO
    req_exp = factory.post(f'/api/citas/{cita_expirada.id}/nota', {"diagnostico": "Intento fuera de tiempo"}, format='json')
    force_authenticate(req_exp, user=u_medico)
    res_exp = ConsultaNotaView.as_view()(req_exp, cita_id=cita_expirada.id)
    assert res_exp.status_code == 400, f"Debió rechazar cita expirada con 400, dio: {res_exp.status_code}"
    assert "expiró" in str(res_exp.data['detail']).lower()
    print("  -> OK: Sistema bloqueó al médico de atender una cita con fecha/hora expirada (400 Bad Request).")

    # 5. Verificación de auto-actualización del sistema:
    # Cuando se listan citas, las citas confirmadas con fecha vencida pasan a 'no_asistio' automáticamente
    req_auto = factory.get('/api/citas/mis-citas')
    force_authenticate(req_auto, user=u_medico)
    res_auto = MisCitasView.as_view()(req_auto)
    cita_expirada.refresh_from_db()
    assert str(cita_expirada.estado_id) == 'no_asistio', f"La cita expirada debió actualizarse a no_asistio, tiene: {cita_expirada.estado_id}"
    print("  -> OK: Sistema actualizó automáticamente la cita vencida a estado 'no_asistio'.")

    print("\n>>> TODOS LOS TESTS DE DOCUMENTOS Y EXPIRACIÓN PASARON AL 100% <<<")

if __name__ == '__main__':
    test_documentos_y_expiracion()
