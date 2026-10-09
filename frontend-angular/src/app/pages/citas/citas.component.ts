import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ModalPagoComponent } from '../../components/modal-pago/modal-pago.component';
import { CitasService } from '../../services/citas.service';
import { PagosService } from '../../services/pagos.service';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, ModalPagoComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header title="Mis Citas Médicas" subtitle="Historial y gestión de consultas programadas"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Filter tabs -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border">
              <button *ngFor="let tab of tabs"
                (click)="activeTab = tab.id"
                [class.bg-primary]="activeTab === tab.id"
                [class.text-primary-foreground]="activeTab === tab.id"
                [class.text-muted-foreground]="activeTab !== tab.id"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                {{ tab.label }}
              </button>
            </div>

            <button (click)="load()" class="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 border border-border cursor-pointer">
              <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar</span>
            </button>
          </div>

          <!-- Appointments list -->
          <div class="grid gap-4">
            <div *ngFor="let cita of filteredCitas"
              class="p-5 rounded-xl border border-border bg-card/70 hover:bg-card transition-all shadow-md relative overflow-hidden">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2.5">
                    <h3 class="font-display text-base font-bold text-foreground">
                      {{ cita.especialidad_nombre || 'Consulta Médica General' }}
                    </h3>
                    <span [ngClass]="getStatusBadge(cita.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {{ cita.estado }}
                    </span>
                  </div>

                  <p class="text-xs text-muted-foreground flex items-center gap-2">
                    <span class="font-medium text-foreground">{{ cita.medico_nombre || 'Médico Asignado' }}</span>
                    <span>•</span>
                    <span>{{ cita.sede_nombre || 'Sede Central' }}</span>
                  </p>

                  <p *ngIf="cita.motivo" class="text-xs text-muted-foreground italic">
                    Motivo: "{{ cita.motivo }}"
                  </p>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="text-left sm:text-right">
                    <p class="text-sm font-bold text-foreground">{{ cita.fecha_hora | date:'fullDate' }}</p>
                    <p class="text-xs text-primary font-semibold">{{ cita.fecha_hora | date:'shortTime' }}</p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <button *ngIf="cita.estado === 'pendiente_pago'"
                      (click)="pagar(cita)"
                      class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                      <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>Pagar Cita ($ 50.000)</span>
                    </button>

                    <!-- Solo se puede cancelar si es futura y está pendiente o confirmada -->
                    <button *ngIf="puedeCancelar(cita)"
                      (click)="cancelar(cita)"
                      class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer">
                      Cancelar Cita
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div *ngIf="filteredCitas.length === 0" class="p-12 text-center rounded-xl border border-dashed border-border bg-card/30">
              <div class="grid size-12 mx-auto place-items-center rounded-full bg-secondary text-muted-foreground mb-3">
                <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p class="text-sm font-semibold text-foreground">No hay citas en este estado</p>
              <p class="text-xs text-muted-foreground mt-1">Todas tus consultas agendadas aparecerán en esta sección.</p>
            </div>
          </div>
        </main>
      </div>

      <!-- Payment & Voucher Modal -->
      <app-modal-pago
        *ngIf="mostrarModalPago && citaSeleccionadaParaPago"
        [cita]="citaSeleccionadaParaPago"
        (closed)="mostrarModalPago = false"
        (pagado)="onPagoCompletado()">
      </app-modal-pago>
    </div>
  `
})
export class CitasComponent implements OnInit {
  citasService = inject(CitasService);
  pagosService = inject(PagosService);

  activeTab: string = 'todas';
  mostrarModalPago: boolean = false;
  citaSeleccionadaParaPago: CitaItem | null = null;

  readonly tabs = [
    { id: 'todas', label: 'Todas' },
    { id: 'confirmada', label: 'Confirmadas' },
    { id: 'pendiente_pago', label: 'Pendientes' },
    { id: 'cancelada', label: 'Canceladas' }
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.citasService.loadMisCitas().subscribe();
  }

  get filteredCitas(): CitaItem[] {
    const list = this.citasService.citas();
    if (this.activeTab === 'todas') return list;
    return list.filter(c => c.estado === this.activeTab);
  }

  puedeCancelar(cita: CitaItem): boolean {
    const now = new Date().getTime();
    const fechaCita = new Date(cita.fecha_hora).getTime();
    return fechaCita >= now && ['confirmada', 'pendiente_pago'].includes(cita.estado);
  }

  pagar(cita: CitaItem) {
    this.citaSeleccionadaParaPago = cita;
    this.mostrarModalPago = true;
  }

  onPagoCompletado() {
    this.mostrarModalPago = false;
    this.citaSeleccionadaParaPago = null;
    this.load();
  }

  cancelar(cita: CitaItem) {
    if (confirm(`¿Estás seguro de que deseas cancelar tu cita de ${cita.especialidad_nombre || 'consulta'} con ${cita.medico_nombre}?`)) {
      this.citasService.cancelarCita(cita.id).subscribe({
        next: () => {
          this.load();
        },
        error: (err) => {
          alert(err?.error?.detail || 'No se pudo cancelar la cita.');
        }
      });
    }
  }

  getStatusBadge(estado: string): string {
    switch (estado) {
      case 'confirmada':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'pendiente_pago':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'cancelada':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'atendida':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
