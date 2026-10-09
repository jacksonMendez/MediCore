import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { CitasService } from '../../services/citas.service';
import { AuthService } from '../../services/auth.service';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-medico',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header [title]="'Portal Médico — ' + doctorName" subtitle="Agenda clínica, atención de consultas y fichas médicas"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Notification Alert -->
          <div *ngIf="mensajeExito" class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <svg class="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ mensajeExito }}</span>
          </div>

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
              <p class="text-xs text-muted-foreground uppercase font-semibold">Consultas Atendidas</p>
              <p class="mt-2 font-display text-2xl font-bold text-blue-400">{{ atendidasCount }}</p>
            </div>
          </div>

          <!-- Doctor Appointments Table -->
          <div class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Agenda de Citas Programadas</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Atiende consultas médicas y registra diagnósticos clínicos en la base de datos.</p>
              </div>
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
                    <th class="px-5 py-3 text-right">Acción Médica</th>
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
                    <td class="px-5 py-3.5 text-right space-x-2">
                      <!-- Atender con nota clínica -->
                      <button *ngIf="cita.estado === 'confirmada'"
                        (click)="abrirModalNota(cita)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-semibold transition-all cursor-pointer border border-emerald-500/40">
                        Atender Consulta
                      </button>

                      <!-- Ver nota ya registrada -->
                      <button *ngIf="cita.estado === 'atendida'"
                        (click)="abrirModalNota(cita, true)"
                        class="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white font-semibold transition-all cursor-pointer border border-blue-500/30">
                        Ver Ficha Clínica
                      </button>

                      <button *ngIf="cita.estado === 'confirmada'"
                        (click)="cambiarEstado(cita, 'no_asistio')"
                        class="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground font-semibold transition-all cursor-pointer">
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

      <!-- Modal: Ficha Clínica y Registro de Diagnóstico -->
      <div *ngIf="citaSeleccionada" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
        <div class="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 class="font-display text-base font-bold text-foreground">
                {{ soloLectura ? 'Ficha Clínica de la Consulta' : 'Atención Médica y Diagnóstico' }}
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                Paciente: <span class="text-foreground font-semibold">{{ citaSeleccionada.paciente_nombre }}</span> • {{ citaSeleccionada.fecha_hora | date:'short' }}
              </p>
            </div>
            <button (click)="cerrarModal()" class="text-muted-foreground hover:text-foreground cursor-pointer text-lg font-bold">✕</button>
          </div>

          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-muted-foreground mb-1.5">Diagnóstico Clínico *</label>
              <textarea
                [(ngModel)]="formNota.diagnostico"
                [disabled]="soloLectura"
                rows="3"
                class="w-full p-3 rounded-xl bg-secondary/80 border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary disabled:opacity-75"
                placeholder="Ej: Infección respiratoria aguda alta. Faringoamigdalitis de origen bacteriano."
              ></textarea>
            </div>

            <div>
              <label class="block font-semibold text-muted-foreground mb-1.5">Plan de Tratamiento / Indicaciones</label>
              <textarea
                [(ngModel)]="formNota.tratamiento"
                [disabled]="soloLectura"
                rows="2"
                class="w-full p-3 rounded-xl bg-secondary/80 border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary disabled:opacity-75"
                placeholder="Ej: Reposo en casa por 3 días, abundante hidratación, evitar cambios bruscos de temperatura."
              ></textarea>
            </div>

            <div>
              <label class="block font-semibold text-muted-foreground mb-1.5">Receta Médica / Prescripción</label>
              <textarea
                [(ngModel)]="formNota.receta_medica"
                [disabled]="soloLectura"
                rows="2"
                class="w-full p-3 rounded-xl bg-secondary/80 border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary disabled:opacity-75"
                placeholder="Ej: Amoxicilina 500mg cada 8 horas por 7 días. Ibuprofeno 400mg cada 8 horas si hay dolor."
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button (click)="cerrarModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              {{ soloLectura ? 'Cerrar' : 'Cancelar' }}
            </button>
            <button *ngIf="!soloLectura"
              (click)="guardarNota()"
              [disabled]="!formNota.diagnostico || guardandoNota"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50 shadow-md">
              <span *ngIf="guardandoNota">Guardando...</span>
              <span *ngIf="!guardandoNota">Guardar y Marcar Atendida</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MedicoComponent implements OnInit {
  private auth = inject(AuthService);
  citasService = inject(CitasService);

  mensajeExito: string | null = null;
  citaSeleccionada: CitaItem | null = null;
  soloLectura = false;
  guardandoNota = false;

  formNota = {
    diagnostico: '',
    tratamiento: '',
    receta_medica: ''
  };

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

  get atendidasCount(): number {
    return this.citasService.citas().filter(c => c.estado === 'atendida').length;
  }

  get pendientesCount(): number {
    return this.citasService.citas().filter(c => c.estado === 'pendiente_pago').length;
  }

  cambiarEstado(cita: CitaItem, nuevoEstado: string) {
    this.citasService.cambiarEstado(cita.id, nuevoEstado).subscribe({
      next: () => {
        this.mensajeExito = `Cita actualizada a estado: ${nuevoEstado}`;
        setTimeout(() => this.mensajeExito = null, 4000);
        this.load();
      }
    });
  }

  abrirModalNota(cita: CitaItem, soloLectura: boolean = false) {
    this.citaSeleccionada = cita;
    this.soloLectura = soloLectura;
    this.formNota = { diagnostico: '', tratamiento: '', receta_medica: '' };

    if (soloLectura) {
      this.citasService.obtenerNotaClinica(cita.id).subscribe({
        next: (nota) => {
          this.formNota = {
            diagnostico: nota.diagnostico || '',
            tratamiento: nota.tratamiento || '',
            receta_medica: nota.receta_medica || ''
          };
        },
        error: () => {
          this.formNota.diagnostico = 'No hay nota registrada para esta consulta.';
        }
      });
    }
  }

  cerrarModal() {
    this.citaSeleccionada = null;
  }

  guardarNota() {
    if (!this.citaSeleccionada || !this.formNota.diagnostico) return;
    this.guardandoNota = true;

    this.citasService.guardarNotaClinica(
      this.citaSeleccionada.id,
      this.formNota.diagnostico,
      this.formNota.tratamiento,
      this.formNota.receta_medica
    ).subscribe({
      next: () => {
        this.guardandoNota = false;
        this.cerrarModal();
        this.mensajeExito = '✅ Consulta atendida y nota médica registrada exitosamente.';
        setTimeout(() => this.mensajeExito = null, 5000);
        this.load();
      },
      error: () => {
        this.guardandoNota = false;
      }
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
      case 'no_asistio':
        return 'bg-secondary text-muted-foreground border border-border';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
