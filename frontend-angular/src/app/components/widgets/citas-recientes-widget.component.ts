import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitasService } from '../../services/citas.service';

@Component({
  selector: 'app-citas-recientes-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rounded-xl border border-border bg-card p-5 shadow-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Actividad Reciente</span>
        </h3>
        <a routerLink="/citas" class="text-xs text-primary hover:text-primary-hover font-semibold">Ver historial</a>
      </div>

      <div class="space-y-2.5">
        <div *ngFor="let cita of citasService.citas().slice(0, 3)"
          class="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40 text-xs">
          <div>
            <p class="font-semibold text-foreground">{{ cita.especialidad_nombre || 'Consulta' }}</p>
            <p class="text-[11px] text-muted-foreground">{{ cita.fecha_hora | date:'shortDate' }} • {{ cita.medico_nombre }}</p>
          </div>

          <span [ngClass]="getStatusBadge(cita.estado)" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {{ cita.estado }}
          </span>
        </div>

        <div *ngIf="citasService.citas().length === 0" class="p-3 text-center text-xs text-muted-foreground italic">
          Sin registros recientes
        </div>
      </div>
    </div>
  `
})
export class CitasRecientesWidgetComponent {
  citasService = inject(CitasService);

  getStatusBadge(estado: string): string {
    switch (estado) {
      case 'confirmada':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'pendiente_pago':
        return 'bg-amber-500/20 text-amber-400';
      case 'cancelada':
        return 'bg-rose-500/20 text-rose-400';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
