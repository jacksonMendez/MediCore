import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ClinicaService } from '../../services/clinica.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header title="Panel de Administración" subtitle="Gestión clínica de médicos, sedes y especialidades"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Metric counts -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Médicos Activos</p>
              <p class="mt-2 font-display text-2xl font-bold text-foreground">{{ clinica.medicos().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Sedes Registradas</p>
              <p class="mt-2 font-display text-2xl font-bold text-primary">{{ clinica.sedes().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Especialidades Médicas</p>
              <p class="mt-2 font-display text-2xl font-bold text-emerald-400">{{ clinica.especialidades().length }}</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border w-fit">
            <button (click)="activeTab = 'medicos'"
              [class.bg-primary]="activeTab === 'medicos'"
              [class.text-primary-foreground]="activeTab === 'medicos'"
              [class.text-muted-foreground]="activeTab !== 'medicos'"
              class="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer">
              Médicos ({{ clinica.medicos().length }})
            </button>
            <button (click)="activeTab = 'sedes'"
              [class.bg-primary]="activeTab === 'sedes'"
              [class.text-primary-foreground]="activeTab === 'sedes'"
              [class.text-muted-foreground]="activeTab !== 'sedes'"
              class="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer">
              Sedes ({{ clinica.sedes().length }})
            </button>
            <button (click)="activeTab = 'especialidades'"
              [class.bg-primary]="activeTab === 'especialidades'"
              [class.text-primary-foreground]="activeTab === 'especialidades'"
              [class.text-muted-foreground]="activeTab !== 'especialidades'"
              class="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer">
              Especialidades ({{ clinica.especialidades().length }})
            </button>
          </div>

          <!-- Tab: Médicos -->
          <div *ngIf="activeTab === 'medicos'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80">
              <h3 class="font-display text-sm font-bold text-foreground">Cuerpo Médico Registrado</h3>
            </div>
            <table class="w-full text-left text-xs">
              <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th class="px-5 py-3">Nombre</th>
                  <th class="px-5 py-3">Especialidad</th>
                  <th class="px-5 py-3">Sede</th>
                  <th class="px-5 py-3">Tarjeta Prof.</th>
                  <th class="px-5 py-3">Duración Cita</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr *ngFor="let m of clinica.medicos()" class="hover:bg-secondary/30">
                  <td class="px-5 py-3.5 font-bold text-foreground">{{ m.nombre_completo }}</td>
                  <td class="px-5 py-3.5 text-primary font-medium">{{ m.especialidad_nombre }}</td>
                  <td class="px-5 py-3.5 text-muted-foreground">{{ m.sede_nombre }}</td>
                  <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ m.tarjeta_profesional }}</td>
                  <td class="px-5 py-3.5 text-foreground">{{ m.duracion_cita_minutos }} min</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Tab: Sedes -->
          <div *ngIf="activeTab === 'sedes'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80">
              <h3 class="font-display text-sm font-bold text-foreground">Sedes Clínicas</h3>
            </div>
            <table class="w-full text-left text-xs">
              <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th class="px-5 py-3">Nombre</th>
                  <th class="px-5 py-3">Dirección</th>
                  <th class="px-5 py-3">Teléfono</th>
                  <th class="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr *ngFor="let s of clinica.sedes()" class="hover:bg-secondary/30">
                  <td class="px-5 py-3.5 font-bold text-foreground">{{ s.nombre }}</td>
                  <td class="px-5 py-3.5 text-muted-foreground">{{ s.direccion }}</td>
                  <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ s.telefono }}</td>
                  <td class="px-5 py-3.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                      {{ s.activa ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Tab: Especialidades -->
          <div *ngIf="activeTab === 'especialidades'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div class="px-5 py-4 border-b border-border/80">
              <h3 class="font-display text-sm font-bold text-foreground">Catálogo de Especialidades</h3>
            </div>
            <table class="w-full text-left text-xs">
              <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th class="px-5 py-3">Nombre</th>
                  <th class="px-5 py-3">Descripción</th>
                  <th class="px-5 py-3">Tarifa Base</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr *ngFor="let e of clinica.especialidades()" class="hover:bg-secondary/30">
                  <td class="px-5 py-3.5 font-bold text-foreground">{{ e.nombre }}</td>
                  <td class="px-5 py-3.5 text-muted-foreground max-w-md">{{ e.descripcion }}</td>
                  <td class="px-5 py-3.5 font-bold text-emerald-400">$ {{ e.precio_base | number:'1.0-0' }} COP</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  clinica = inject(ClinicaService);
  activeTab: 'medicos' | 'sedes' | 'especialidades' = 'medicos';

  ngOnInit() {
    this.clinica.loadAll();
  }
}
