export type PaymentStatus = 'pendiente' | 'completado' | 'aprobado' | 'fallido' | 'reembolsado';

export interface PagoItem {
  id: string;
  cita_id: string;
  monto: number;
  moneda: string;
  estado: PaymentStatus;
  metodo_pago?: string;
  transaccion_id?: string;
  referencia?: string;
  concepto?: string;
  paciente_nombre?: string;
  fecha?: string;
  creado_en: string;
  fecha_pago?: string;
  cita_fecha_hora?: string;
  medico_nombre?: string;
  especialidad_nombre?: string;
}
