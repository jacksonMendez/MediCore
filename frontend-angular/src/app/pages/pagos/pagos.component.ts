import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ModalPagoComponent } from '../../components/modal-pago/modal-pago.component';
import { PagosService } from '../../services/pagos.service';
import { CitasService } from '../../services/citas.service';
import { PagoItem } from '../../models/pago.model';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent, ModalPagoComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header title="Pagos y Facturación" subtitle="Historial de transacciones y estados de pago"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Total Transacciones</p>
              <p class="mt-2 font-display text-2xl font-bold text-foreground">{{ pagosService.pagos().length }}</p>
            </div>

            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Pagos Exitosos</p>
              <p class="mt-2 font-display text-2xl font-bold text-emerald-400">{{ exitososCount }}</p>
            </div>

            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Pendientes de Pago</p>
              <p class="mt-2 font-display text-2xl font-bold text-amber-400">{{ pendientesCount }}</p>
            </div>
          </div>

          <!-- Success Banner -->
          <div *ngIf="pagosService.lastSuccessMessage()" class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <svg class="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ pagosService.lastSuccessMessage() }}</span>
          </div>

          <!-- Pending Appointments Payment Trigger -->
          <div *ngIf="citasPendientes.length > 0" class="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
            <h3 class="font-display text-sm font-bold text-amber-400 flex items-center gap-2">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Tienes consultas pendientes por pagar</span>
            </h3>
            <p class="text-xs text-muted-foreground">Puedes transferir por Nequi (300 123 4567), Bancolombia (458-928172-10) o Daviplata y subir tu comprobante para autorización inmediata del personal.</p>

            <div class="grid gap-2 pt-1">
              <div *ngFor="let c of citasPendientes" class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-card border border-border text-xs gap-3">
                <div>
                  <p class="font-bold text-foreground text-sm">{{ c.especialidad_nombre || 'Consulta' }} - {{ c.medico_nombre }}</p>
                  <p class="text-muted-foreground mt-0.5">{{ c.fecha_hora | date:'fullDate' }} a las {{ c.fecha_hora | date:'shortTime' }}</p>
                  <p class="text-primary font-semibold mt-1">Valor consulta: $ 50.000 COP</p>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="abrirModalComprobante(c)"
                    class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Pagar / Subir Comprobante</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Payments table -->
          <div class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <h3 class="font-display text-sm font-bold text-foreground">Registro de Transacciones</h3>
              <button (click)="load()" class="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer">Recargar</button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">ID Transacción</th>
                    <th class="px-5 py-3">Concepto / Cita</th>
                    <th class="px-5 py-3">Monto</th>
                    <th class="px-5 py-3">Método / Canal</th>
                    <th class="px-5 py-3">Soporte</th>
                    <th class="px-5 py-3">Fecha</th>
                    <th class="px-5 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let p of pagosService.pagos()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ getPaymentRef(p) }}</td>
                    <td class="px-5 py-3.5 font-medium text-foreground">{{ p.especialidad_nombre || 'Consulta Médica' }}</td>
                    <td class="px-5 py-3.5 font-bold text-foreground">$ {{ p.monto | number:'1.0-0' }} {{ p.moneda || 'COP' }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground capitalize">
                      <span class="font-medium text-foreground">{{ p.banco_origen || p.metodo_pago?.replace('_', ' ') || 'Transferencia' }}</span>
                    </td>
                    <td class="px-5 py-3.5">
                      <button *ngIf="p.comprobante_archivo" (click)="comprobanteVisualizar = p"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 cursor-pointer">
                        Ver Adjunto
                      </button>
                      <span *ngIf="!p.comprobante_archivo" class="text-muted-foreground text-[10px] italic">-</span>
                    </td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ (p.fecha_pago || p.creado_en) | date:'shortDate' }}</td>
                    <td class="px-5 py-3.5 text-right">
                      <span [ngClass]="getStatusBadge(p.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {{ p.estado === 'pendiente' ? 'Pendiente de Autorización' : p.estado }}
                      </span>
                    </td>
                  </tr>

                  <tr *ngIf="pagosService.pagos().length === 0">
                    <td colspan="7" class="px-5 py-8 text-center text-muted-foreground italic">
                      No hay registros de pago disponibles.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <!-- Payment Voucher Modal -->
      <app-modal-pago
        *ngIf="citaParaComprobante"
        [cita]="citaParaComprobante"
        (closed)="citaParaComprobante = null"
        (pagado)="load()">
      </app-modal-pago>

      <!-- View Attachment Modal -->
      <div *ngIf="comprobanteVisualizar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 class="font-display text-base font-bold text-foreground">Soporte de Transferencia</h3>
            <button (click)="comprobanteVisualizar = null" class="text-muted-foreground hover:text-foreground cursor-pointer p-1">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="rounded-xl border border-border bg-secondary/40 p-2 max-h-80 overflow-y-auto flex items-center justify-center">
            <img *ngIf="comprobanteVisualizar.comprobante_archivo?.startsWith('data:image')"
              [src]="comprobanteVisualizar.comprobante_archivo"
              alt="Comprobante"
              class="max-w-full max-h-72 rounded-lg object-contain" />
            <div *ngIf="!comprobanteVisualizar.comprobante_archivo?.startsWith('data:image')" class="p-6 text-center text-xs text-muted-foreground">
              Documento digital registrado: {{ comprobanteVisualizar.referencia }}
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <button (click)="comprobanteVisualizar = null" class="px-4 py-2 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PagosComponent implements OnInit {
  pagosService = inject(PagosService);
  citasService = inject(CitasService);

  citaParaComprobante: any = null;
  comprobanteVisualizar: any = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.pagosService.loadMisPagos().subscribe();
    this.citasService.loadMisCitas().subscribe();
  }

  get exitososCount(): number {
    return this.pagosService.pagos().filter(p => (p.estado as string) === 'completado' || (p.estado as string) === 'aprobado').length;
  }

  get pendientesCount(): number {
    return this.pagosService.pagos().filter(p => (p.estado as string) === 'pendiente').length;
  }

  getPaymentRef(p: any): string {
    const val = p.transaccion_id || p.referencia || p.id || '';
    return String(val).substring(0, 16);
  }

  get citasPendientes() {
    return this.citasService.citas().filter(c => c.estado === 'pendiente_pago');
  }

  abrirModalComprobante(cita: any) {
    this.citaParaComprobante = cita;
  }

  getStatusBadge(estado: string): string {
    switch (estado) {
      case 'aprobado':
      case 'completado':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'pendiente':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'reembolsado':
        return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
      case 'fallido':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
