import logging
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def enviar_codigo_verificacion(usuario, codigo: str) -> bool:
    """
    Envía un código de verificación de 6 dígitos al correo del usuario registrado.
    """
    asunto = f"Tu código de verificación MediCore OS: {codigo}"
    mensaje = (
        f"Hola {usuario.nombre_completo},\n\n"
        f"Para verificar tu cuenta en MediCore OS y proteger tus datos médicos sensibles, "
        f"ingresa el siguiente código de verificación de 6 dígitos:\n\n"
        f"      👉 {codigo} 👈\n\n"
        f"Este código es válido por 15 minutos.\n\n"
        f"Si no solicitaste este registro, por favor ignora este mensaje.\n\n"
        f"Atentamente,\n"
        f"Equipo Clínico MediCore OS"
    )

    try:
        destinatario = usuario.correo
        remitente = getattr(settings, 'DEFAULT_FROM_EMAIL', 'notificaciones@medicore.com')
        logger.info(f"[EMAIL] Enviando código {codigo} a {destinatario}...")
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=remitente,
            recipient_list=[destinatario],
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.warning(f"[EMAIL ERROR] No se pudo enviar email por SMTP a {usuario.correo}: {e}")
        # En desarrollo o pruebas no bloqueamos, el log registra el código
        return False


def notificar_registro_admin(usuario, metodo: str = "formulario") -> bool:
    """
    Notifica al correo del administrador configurado cada vez que un paciente se registra.
    """
    admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'notificaciones-admin@medicore.com')
    if not admin_email:
        return False

    asunto = f"[MediCore Alerta] Nuevo paciente registrado vía {metodo}"
    mensaje = (
        f"Aviso del Sistema MediCore OS:\n\n"
        f"Se ha registrado un nuevo paciente en la plataforma:\n"
        f"- Nombre: {usuario.nombre_completo}\n"
        f"- Correo: {usuario.correo}\n"
        f"- Teléfono: {usuario.telefono or 'No registrado'}\n"
        f"- Método de registro: {metodo}\n"
        f"- Fecha de registro: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        f"Gestión clínica MediCore OS."
    )

    try:
        remitente = getattr(settings, 'DEFAULT_FROM_EMAIL', 'notificaciones@medicore.com')
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=remitente,
            recipient_list=[admin_email],
            fail_silently=True,
        )
        return True
    except Exception as e:
        logger.warning(f"[EMAIL ERROR ADMIN] Fallo al notificar al admin ({admin_email}): {e}")
        return False


def enviar_bienvenida_google(usuario) -> bool:
    """
    Envía un correo de bienvenida al paciente tras registrarse con Google.
    """
    asunto = "Bienvenido a MediCore OS"
    mensaje = (
        f"Hola {usuario.nombre_completo},\n\n"
        f"Te damos la bienvenida a MediCore OS. Tu cuenta ha sido verificada y vinculada exitosamente con tu cuenta de Google.\n\n"
        f"Desde tu portal de paciente podrás:\n"
        f"1. Consultar médicos y especialidades clínicas.\n"
        f"2. Agendar y gestionar tus citas médicas con nuestro copiloto clínico.\n"
        f"3. Realizar pagos y radicar transferencias de manera segura.\n\n"
        f"Atentamente,\n"
        f"Equipo Clínico MediCore OS"
    )

    try:
        remitente = getattr(settings, 'DEFAULT_FROM_EMAIL', 'notificaciones@medicore.com')
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=remitente,
            recipient_list=[usuario.correo],
            fail_silently=True,
        )
        return True
    except Exception as e:
        logger.warning(f"[EMAIL ERROR BIENVENIDA] No se pudo enviar bienvenida a {usuario.correo}: {e}")
        return False
