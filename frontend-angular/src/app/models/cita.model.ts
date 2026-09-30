export type AppointmentStatus = 'pendiente_pago' | 'confirmada' | 'cancelada' | 'atendida' | 'no_asistio';

export interface CitaItem {
  id: string;
  fecha_hora: string;
  duracion_minutos?: number;
  estado: AppointmentStatus;
  motivo?: string;
  medico_id?: string;
  medico_nombre?: string;
  medico_genero?: string;
  paciente_id?: string;
  paciente_nombre?: string;
  sede_id?: string;
  sede_nombre?: string;
  especialidad_id?: string;
  especialidad_nombre?: string;
  pago_estado?: string;
  pago_monto?: number;
  creado_en?: string;
}

export interface DiasDisponiblesResponse {
  especialidad: string;
  dias_disponibles: string[];
  mes_inicial?: string;
  total_dias?: number;
}
