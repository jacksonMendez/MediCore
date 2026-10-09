import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitasService } from '../../services/citas.service';
import { PagosService } from '../../services/pagos.service';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-proxima-cita-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rounded-xl border border-primary/30 bg-card p-5 shadow-lg relative overflow-hidden">
      <div class="absolute inset-y-0 left-0 w-1.5 bg-primary"></div>

      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Próxima Cita</span>
        </h3>
        <a routerLink="/citas" class="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 transition-colors">
          <span>Ver todas</span>
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <ng-container *ngIf="proximaCita; else noCita">
        <div class="space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-base font-bold text-foreground">{{ proximaCita.especialidad_nombre || 'Consulta Médica' }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ proximaCita.medico_nombre || 'Médico Asignado' }}</p>
            </div>
            <span [ngClass]="getStatusBadgeClass(proximaCita.estado)" class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
              {{ proximaCita.estado }}
            </span>
          </div>

          <div class="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <svg class="size-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ proximaCita.fecha_hora | date:'fullDate' }}</span>
            </div>
            <div class="flex items-center gap-1.5 font-semibold text-foreground">
              <svg class="size-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ proximaCita.fecha_hora | date:'shortTime' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <svg class="size-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="truncate">{{ proximaCita.sede_nombre || 'Sede Central' }}</span>
          </div>
          <div *ngIf="proximaCita.estado === 'pendiente_pago'" class="pt-2">
            <button (click)="pagarProximaCita()" [disabled]="pagosService.payingCitaId() === proximaCita.id"
              class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
              <span *ngIf="pagosService.payingCitaId() === proximaCita.id" class="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ pagosService.payingCitaId() === proximaCita.id ? 'Aprobando Pago...' : 'Pagar Cita Ahora ($ 50.000 COP)' }}</span>
            </button>
          </div>
        </div>
      </ng-container>

      <ng-template #noCita>
        <div class="p-6 text-center space-y-2">
          <div class="grid size-10 mx-auto place-items-center rounded-full bg-secondary text-muted-foreground">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-xs font-semibold text-foreground">No tienes citas activas próximas</p>
          <p class="text-[11px] text-muted-foreground">Escríbele al copiloto para agendar una nueva consulta médica en segundos.</p>
        </div>
      </ng-template>
    </div>
  `
})
export class ProximaCitaWidgetComponent implements OnInit {
  private citasService = inject(CitasService);
  pagosService = inject(PagosService);

  ngOnInit() {
    this.citasService.loadMisCitas().subscribe();
  }

  get proximaCita(): CitaItem | undefined {
    const list = this.citasService.citas();
    const now = new Date().toISOString();
    // Priorizar citas activas futuras
    const upcoming = list.filter(c => c.estado !== 'cancelada' && c.fecha_hora >= now)
                         .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    if (upcoming.length > 0) return upcoming[0];
    // Fallback: cualquier cita no cancelada
    return list.find(c => c.estado !== 'cancelada');
  }

  pagarProximaCita() {
    if (!this.proximaCita) return;
    this.pagosService.simularPago(this.proximaCita.id).subscribe({
      next: () => {
        this.citasService.loadMisCitas().subscribe();
      }
    });
  }

  getStatusBadgeClass(estado: string): string {
    switch (estado) {
      case 'confirmada':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'pendiente_pago':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'cancelada':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
