export interface ChatMessage {
  id?: string | number;
  emisor: 'usuario' | 'asistente' | 'sistema';
  contenido: string;
  creado_en?: string;
  // UI structured metadata
  requiere_seleccion?: 'ninguna' | 'dia' | 'hora';
  dias_disponibles?: string[];
  horarios?: string[];
  especialidad?: string;
}

export interface ChatSession {
  id: string;
  titulo?: string;
  rol_origen: string;
  creado_en: string;
  mensajes_count?: number;
  ultimo_mensaje?: string;
}

export interface ChatSendMessageRequest {
  mensaje: string;
  sesion_id?: string;
}

export interface ChatSendMessageResponse {
  respuesta: string;
  sesion_id: string;
  emisor: string;
  actualizo_citas?: boolean;
  herramientas_usadas?: string[];
  requiere_seleccion?: 'ninguna' | 'dia' | 'hora';
  dias_disponibles?: string[];
  horarios?: string[];
  especialidad?: string;
}
