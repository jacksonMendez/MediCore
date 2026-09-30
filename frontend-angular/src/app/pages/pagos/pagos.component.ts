import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { PagosService } from '../../services/pagos.service';
import { CitasService } from '../../services/citas.service';
import { PagoItem } from '../../models/pago.model';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
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

          <!-- Pending Appointments Payment Trigger -->
          <div *ngIf="citasPendientes.length > 0" class="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
            <h3 class="font-display text-sm font-bold text-amber-400 flex items-center gap-2">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Tienes citas pendientes de pago</span>
            </h3>
            <p class="text-xs text-muted-foreground">Puedes simular el pago en línea para confirmar inmediatamente la reserva de tu consulta médica.</p>

            <div class="grid gap-2 pt-1">
              <div *ngFor="let c of citasPendientes" class="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-xs">
                <div>
                  <p class="font-bold text-foreground">{{ c.especialidad_nombre || 'Consulta' }} - {{ c.medico_nombre }}</p>
                  <p class="text-muted-foreground">{{ c.fecha_hora | date:'medium' }}</p>
                </div>
                <button (click)="pagarCita(c.id)"
                  class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all cursor-pointer">
                  Simular Pago ($ 50.000 COP)
                </button>
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
                    <th class="px-5 py-3">Método</th>
                    <th class="px-5 py-3">Fecha</th>
                    <th class="px-5 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let p of pagosService.pagos()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ (p.transaccion_id || p.id).substring(0, 13) }}...</td>
                    <td class="px-5 py-3.5 font-medium text-foreground">{{ p.especialidad_nombre || 'Consulta Médica' }}</td>
                    <td class="px-5 py-3.5 font-bold text-foreground">$ {{ p.monto | number:'1.0-0' }} {{ p.moneda || 'COP' }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground capitalize">{{ p.metodo_pago?.replace('_', ' ') || 'Pasarela' }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ (p.fecha_pago || p.creado_en) | date:'shortDate' }}</td>
                    <td class="px-5 py-3.5 text-right">
                      <span [ngClass]="getStatusBadge(p.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {{ p.estado }}
                      </span>
                    </td>
                  </tr>

                  <tr *ngIf="pagosService.pagos().length === 0">
                    <td colspan="6" class="px-5 py-8 text-center text-muted-foreground italic">
                      No hay registros de pago disponibles.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  `
})
export class PagosComponent implements OnInit {
  pagosService = inject(PagosService);
  citasService = inject(CitasService);

  ngOnInit() {
    this.load();
  }

  load() {
    this.pagosService.loadMisPagos().subscribe();
    this.citasService.loadMisCitas().subscribe();
  }

  get exitososCount(): number {
    return this.pagosService.pagos().filter(p => p.estado === 'completado').length;
  }

  get pendientesCount(): number {
    return this.pagosService.pagos().filter(p => p.estado === 'pendiente').length;
  }

  get citasPendientes() {
    return this.citasService.citas().filter(c => c.estado === 'pendiente_pago');
  }

  pagarCita(citaId: string) {
    this.pagosService.simularPago(citaId).subscribe({
      next: () => {
        this.citasService.loadMisCitas().subscribe();
      }
    });
  }

  getStatusBadge(estado: string): string {
    switch (estado) {
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
