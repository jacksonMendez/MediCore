import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicaService } from '../../services/clinica.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-especialidades-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-border bg-card p-5 shadow-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span>Especialidades Disponibles</span>
        </h3>
        <span class="text-[11px] text-muted-foreground">{{ clinica.especialidades().length }} activas</span>
      </div>

      <div class="space-y-2">
        <div *ngFor="let esp of clinica.especialidades()"
          class="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/80 border border-border/40 transition-colors">
          <div class="flex items-center gap-3">
            <span class="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <div>
              <p class="text-xs font-semibold text-foreground">{{ esp.nombre }}</p>
              <p class="text-[10px] text-muted-foreground">$ {{ esp.precio_base | number:'1.0-0' }} COP</p>
            </div>
          </div>

          <button (click)="agendarCon(esp.nombre)"
            class="px-2.5 py-1 rounded-md bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-medium transition-colors cursor-pointer">
            Agendar
          </button>
        </div>

        <div *ngIf="clinica.especialidades().length === 0" class="p-4 text-center text-xs text-muted-foreground italic">
          Cargando catálogo médico...
        </div>
      </div>
    </div>
  `
})
export class EspecialidadesWidgetComponent implements OnInit {
  clinica = inject(ClinicaService);
  private chat = inject(ChatService);

  ngOnInit() {
    this.clinica.loadEspecialidades().subscribe();
  }

  agendarCon(especialidad: string) {
    this.chat.sendMessage(`Deseo agendar una cita de ${especialidad}`).subscribe();
  }
}
