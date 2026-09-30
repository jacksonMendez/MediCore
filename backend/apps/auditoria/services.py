import logging
from typing import Any, Dict, Optional
from django.utils import timezone
from .models import RegistroAuditoria

logger = logging.getLogger(__name__)


def registrar_auditoria(
    accion: str,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    usuario: Any = None,
    rol_en_el_momento: Optional[str] = None,
    datos_cambio: Optional[Dict[str, Any]] = None,
    origen: Optional[str] = None,
    ip: Optional[str] = None,
    session_id: Optional[str] = None,
) -> RegistroAuditoria:
    """
    Servicio centralizado e inmutable para registrar eventos de auditoría clínica.
    Nunca depende del frontend; se invoca desde vistas REST, orquestador LLM o señales.
    """
    try:
        # Resolver rol si no se proveyó
        if not rol_en_el_momento and usuario and hasattr(usuario, 'rol_id'):
            rol_en_el_momento = str(usuario.rol_id)
        elif not rol_en_el_momento and usuario and hasattr(usuario, 'rol'):
            rol_en_el_momento = str(getattr(usuario.rol, 'codigo', usuario.rol))

        # Resolver origen automático si no se especificó
        if not origen:
            if rol_en_el_momento == 'paciente':
                origen = 'humano_paciente'
            elif rol_en_el_momento == 'medico':
                origen = 'humano_medico'
            elif rol_en_el_momento == 'admin':
                origen = 'humano_admin'
            elif rol_en_el_momento == 'agente_atencion':
                origen = 'humano_agente'
            else:
                origen = 'sistema'

        registro = RegistroAuditoria.objects.create(
            usuario=usuario if (usuario and getattr(usuario, 'is_authenticated', False)) else None,
            rol_en_el_momento=rol_en_el_momento,
            accion=accion,
            entidad_tipo=entidad_tipo,
            entidad_id=str(entidad_id) if entidad_id is not None else None,
            timestamp=timezone.now(),
            datos_cambio=datos_cambio or {},
            origen=origen,
            ip=ip,
            session_id=session_id,
        )

        logger.info(
            f"[Auditoría] {accion} registrado en {entidad_tipo}:{entidad_id} "
            f"por {usuario or 'Anónimo'} ({origen})"
        )
        return registro

    except Exception as e:
        logger.error(f"[Auditoría] Error registrando auditoría para {accion}: {e}", exc_info=True)
        raise
