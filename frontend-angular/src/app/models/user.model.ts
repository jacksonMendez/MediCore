export type UserRole = 'paciente' | 'medico' | 'admin' | 'agente_atencion';

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: UserRole;
  telefono?: string | null;
  activo: boolean;
  creado_en?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}
