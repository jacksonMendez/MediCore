import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagosService } from '../../services/pagos.service';
import { CitasService } from '../../services/citas.service';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-modal-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div class="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border/80 pb-3">
          <div>
            <h3 class="font-display text-base font-bold text-foreground flex items-center gap-2">
              <svg class="size-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Pagar Consulta Médica</span>
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5">Realiza la transferencia y adjunta tu soporte de pago digital.</p>
          </div>
          <button (click)="close()" class="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-secondary">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Appointment Summary -->
        <div *ngIf="cita" class="p-3.5 rounded-xl bg-secondary/50 border border-border/80 flex items-center justify-between text-xs">
          <div>
            <p class="font-bold text-foreground text-sm">{{ cita.especialidad_nombre || 'Consulta Médica' }}</p>
            <p class="text-muted-foreground">{{ cita.medico_nombre }} • {{ cita.sede_nombre || 'Sede Central' }}</p>
            <p class="text-primary font-medium mt-0.5">{{ cita.fecha_hora | date:'fullDate' }} - {{ cita.fecha_hora | date:'shortTime' }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase font-bold text-muted-foreground">Valor a Pagar</p>
            <p class="text-base font-extrabold text-emerald-400">$ 50.000 COP</p>
          </div>
        </div>

        <!-- Official Clinic Accounts Info Card -->
        <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2 text-xs">
          <p class="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Cuentas Oficiales para Transferencia (MediCore IPS)</span>
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div class="p-2 rounded bg-card/60 border border-border">
              <span class="text-muted-foreground block font-medium">🟣 Nequi:</span>
              <span class="font-mono font-bold text-foreground text-xs select-all">300 123 4567</span>
            </div>
            <div class="p-2 rounded bg-card/60 border border-border">
              <span class="text-muted-foreground block font-medium">🟡 Bancolombia Ahorros:</span>
              <span class="font-mono font-bold text-foreground text-xs select-all">458-928172-10</span>
            </div>
            <div class="p-2 rounded bg-card/60 border border-border">
              <span class="text-muted-foreground block font-medium">🔴 Daviplata:</span>
              <span class="font-mono font-bold text-foreground text-xs select-all">300 123 4567</span>
            </div>
            <div class="p-2 rounded bg-card/60 border border-border">
              <span class="text-muted-foreground block font-medium">🏢 Titular / NIT:</span>
              <span class="font-medium text-foreground text-xs">MediCore IPS • 901.847.293-1</span>
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="space-y-3 text-xs">
          <div>
            <label class="text-muted-foreground mb-1 block font-medium">1. Medio / Banco de Origen</label>
            <select [(ngModel)]="bancoOrigen" class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
              <option value="nequi">Nequi (Transferencia Celular)</option>
              <option value="bancolombia">Bancolombia (Cuenta de Ahorros / App)</option>
              <option value="daviplata">Daviplata</option>
              <option value="pse">PSE / Otra Entidad Bancaria</option>
            </select>
          </div>

          <div>
            <label class="text-muted-foreground mb-1 block font-medium">2. Número de Comprobante / Aprobación</label>
            <input type="text" [(ngModel)]="numeroComprobante" placeholder="Ej. TRF-9382104 ó # de recibo Nequi"
              class="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-semibold placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:outline-none"
              style="color: #000000 !important; background-color: #ffffff !important;" />
          </div>

          <div>
            <label class="text-muted-foreground mb-1 block font-medium">3. Comprobante de Pago (Imagen o PDF)</label>
            <div class="border-2 border-dashed border-border rounded-xl p-3 text-center bg-secondary/30 hover:bg-secondary/60 transition-colors relative cursor-pointer">
              <input type="file" (change)="onFileSelected($event)" accept="image/*,application/pdf"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              
              <div *ngIf="!archivoNombre" class="space-y-1">
                <svg class="size-6 mx-auto text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-xs font-semibold text-foreground">Haz clic para adjuntar imagen o comprobante</p>
                <p class="text-[10px] text-muted-foreground">Formatos soportados: JPG, PNG, WEBP, PDF (Máx 5MB)</p>
              </div>

              <div *ngIf="archivoNombre" class="flex items-center justify-between text-left p-1">
                <div class="flex items-center gap-2 overflow-hidden">
                  <img *ngIf="archivoPreview" [src]="archivoPreview" class="size-10 rounded object-cover border border-border shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-foreground truncate">{{ archivoNombre }}</p>
                    <p class="text-[10px] text-emerald-400">✓ Archivo cargado correctamente</p>
                  </div>
                </div>
                <span class="text-[11px] text-primary font-semibold shrink-0 ml-2">Cambiar</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-3 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button (click)="simularDirecto()" [disabled]="pagosService.loading()"
            class="text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer disabled:opacity-50">
            Simular Aprobación Directa (Sandbox)
          </button>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button (click)="close()" class="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              Cancelar
            </button>
            <button (click)="radicarComprobante()"
              [disabled]="!numeroComprobante.trim() || pagosService.loading()"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2">
              <span *ngIf="pagosService.loading()" class="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ pagosService.loading() ? 'Radicando...' : 'Subir Comprobante y Radicar Pago' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalPagoComponent {
  @Input() cita: CitaItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() pagado = new EventEmitter<void>();

  pagosService = inject(PagosService);
  citasService = inject(CitasService);

  bancoOrigen: string = 'nequi';
  numeroComprobante: string = '';
  archivoNombre: string = '';
  archivoComprobante: string = '';
  archivoPreview: string = '';

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.archivoNombre = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.archivoComprobante = result;
      if (file.type.startsWith('image/')) {
        this.archivoPreview = result;
      } else {
        this.archivoPreview = '';
      }
    };
    reader.readAsDataURL(file);
  }

  radicarComprobante() {
    if (!this.cita || !this.numeroComprobante.trim()) return;

    this.pagosService.reportarTransferencia(
      this.cita.id,
      this.numeroComprobante.trim(),
      this.bancoOrigen,
      this.archivoComprobante,
      'transferencia'
    ).subscribe({
      next: () => {
        this.citasService.loadMisCitas().subscribe();
        this.pagado.emit();
        this.close();
      }
    });
  }

  simularDirecto() {
    if (!this.cita) return;
    this.pagosService.simularPago(this.cita.id, 'wompi_sandbox').subscribe({
      next: () => {
        this.citasService.loadMisCitas().subscribe();
        this.pagado.emit();
        this.close();
      }
    });
  }

  close() {
    this.closed.emit();
  }
}
