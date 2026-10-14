export type AppointmentStatus = 'pendiente_pago' | 'confirmada' | 'cancelada' | 'atendida' | 'no_asistio';

export interface NotaClinicaItem {
  id?: string;
  diagnostico: string;
  tratamiento?: string;
  receta_medica?: string;
  archivo_adjunto?: string | null;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
  creado_en?: string;
}

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
  precio?: number;
  pago_estado?: string;
  pago_monto?: number;
  tiene_comprobante?: boolean;
  pago_referencia?: string;
  nota_clinica?: NotaClinicaItem | null;
  creado_en?: string;
}

export interface DiasDisponiblesResponse {
  especialidad: string;
  dias_disponibles: string[];
  mes_inicial?: string;
  total_dias?: number;
}
