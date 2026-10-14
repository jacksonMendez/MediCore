export interface SedeItem {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  activa: boolean;
}

export interface EspecialidadItem {
  id: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
}

export interface MedicoItem {
  id: string;
  usuario_id: string;
  nombre_completo: string;
  correo: string;
  especialidad_id: string;
  especialidad_nombre: string;
  sede_id: string;
  sede_nombre: string;
  tarjeta_profesional: string;
  duracion_cita_minutos: number;
  genero: string;
  activo?: boolean;
}
