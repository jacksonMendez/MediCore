export type UserRole = 'paciente' | 'medico' | 'admin' | 'agente_atencion';

export interface PacienteInfo {
  documento_tipo?: string;
  documento_numero?: string;
  fecha_nacimiento?: string | null;
}

export interface MedicoInfo {
  tarjeta_profesional?: string;
  especialidad?: string;
  sede?: string;
}

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: UserRole;
  telefono?: string | null;
  activo: boolean;
  correo_verificado?: boolean;
  creado_en?: string;
  paciente?: PacienteInfo | null;
  medico?: MedicoInfo | null;
  perfil_completo?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}
