import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { CitasService } from '../../services/citas.service';
import { AuthService } from '../../services/auth.service';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-medico',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header [title]="'Portal Médico — ' + doctorName" subtitle="Agenda clínica y control de pacientes"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Doctor Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Total Citas Asignadas</p>
              <p class="mt-2 font-display text-2xl font-bold text-foreground">{{ citasService.citas().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Consultas Confirmadas</p>
              <p class="mt-2 font-display text-2xl font-bold text-emerald-400">{{ confirmadasCount }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Pendientes / En Espera</p>
              <p class="mt-2 font-display text-2xl font-bold text-amber-400">{{ pendientesCount }}</p>
            </div>
          </div>

          <!-- Doctor Appointments Table -->
          <div class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <h3 class="font-display text-sm font-bold text-foreground">Agenda de Citas Programadas</h3>
              <button (click)="load()" class="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer">Actualizar Agenda</button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Paciente</th>
                    <th class="px-5 py-3">Fecha y Hora</th>
                    <th class="px-5 py-3">Motivo Consulta</th>
                    <th class="px-5 py-3">Sede</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3 text-right">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let cita of citasService.citas()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-bold text-foreground">{{ cita.paciente_nombre || 'Paciente' }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground">
                      <span class="font-semibold text-foreground">{{ cita.fecha_hora | date:'shortDate' }}</span> • {{ cita.fecha_hora | date:'shortTime' }}
                    </td>
                    <td class="px-5 py-3.5 text-muted-foreground max-w-xs truncate">{{ cita.motivo || 'Consulta médica general' }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ cita.sede_nombre || 'Sede Central' }}</td>
                    <td class="px-5 py-3.5">
                      <span [ngClass]="getStatusBadge(cita.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {{ cita.estado }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-right space-x-1.5">
                      <button *ngIf="cita.estado === 'confirmada'"
                        (click)="cambiarEstado(cita, 'atendida')"
                        class="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white font-semibold transition-all cursor-pointer">
                        Atender
                      </button>
                      <button *ngIf="cita.estado !== 'cancelada' && cita.estado !== 'atendida'"
                        (click)="cambiarEstado(cita, 'no_asistio')"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground font-semibold transition-all cursor-pointer">
                        No asistió
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="citasService.citas().length === 0">
                    <td colspan="6" class="px-5 py-8 text-center text-muted-foreground italic">
                      No hay citas asignadas en tu agenda médica actualmente.
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
export class MedicoComponent implements OnInit {
  private auth = inject(AuthService);
  citasService = inject(CitasService);

  ngOnInit() {
    this.load();
  }

  load() {
    this.citasService.loadMisCitas().subscribe();
  }

  get doctorName(): string {
    return this.auth.currentUser()?.nombre_completo || 'Doctor';
  }

  get confirmadasCount(): number {
    return this.citasService.citas().filter(c => c.estado === 'confirmada').length;
  }

  get pendientesCount(): number {
    return this.citasService.citas().filter(c => c.estado === 'pendiente_pago').length;
  }

  cambiarEstado(cita: CitaItem, nuevoEstado: string) {
    this.citasService.cancelarCita(cita.id, `Estado actualizado a ${nuevoEstado}`).subscribe({
      next: () => this.load()
    });
  }

  getStatusBadge(estado: string): string {
    switch (estado) {
      case 'confirmada':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'atendida':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'pendiente_pago':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'cancelada':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
