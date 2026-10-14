import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { CitasService } from '../../services/citas.service';
import { CitaItem, NotaClinicaItem } from '../../models/cita.model';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header title="Mis Citas Médicas" subtitle="Historial y gestión de consultas programadas"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Filter tabs -->
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border overflow-x-auto">
              <button *ngFor="let tab of tabs"
                (click)="activeTab = tab.id"
                [class.bg-primary]="activeTab === tab.id"
                [class.text-primary-foreground]="activeTab === tab.id"
                [class.text-muted-foreground]="activeTab !== tab.id"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
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
                      {{ cita.estado === 'no_asistio' ? 'NO ASISTIÓ' : cita.estado }}
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

                  <!-- Preview badge if attended with note -->
                  <div *ngIf="cita.estado === 'atendida'" class="pt-1 flex items-center gap-2">
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400">
                      <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Consulta atendida • Ficha clínica disponible
                    </span>
                    <span *ngIf="cita.nota_clinica?.archivo_adjunto" class="px-2 py-0.2 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase">
                      Documento adjunto
                    </span>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="text-left sm:text-right">
                    <p class="text-sm font-bold text-foreground">{{ cita.fecha_hora | date:'fullDate' }}</p>
                    <p class="text-xs text-primary font-semibold">{{ cita.fecha_hora | date:'shortTime' }}</p>
                  </div>

                  <!-- Actions: Ver Detalles -->
                  <div class="flex items-center gap-2">
                    <button
                      (click)="verDetalles(cita)"
                      class="px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                      <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{{ cita.estado === 'atendida' ? 'Ver Ficha y Diagnóstico' : 'Ver Detalles' }}</span>
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

      <!-- Modal Detalle de Cita y Ficha Clínica -->
      <div *ngIf="citaSeleccionadaDetalle" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-border/80 pb-4 sticky top-0 bg-card z-10">
            <div class="flex items-center gap-2.5">
              <div class="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="font-display text-base font-bold text-foreground">
                  {{ citaSeleccionadaDetalle.estado === 'atendida' ? 'Ficha Clínica y Concepto Médico' : 'Detalles de la Cita Médica' }}
                </h3>
                <p class="text-[11px] text-muted-foreground font-mono">ID: {{ citaSeleccionadaDetalle.id }}</p>
              </div>
            </div>
            <button (click)="cerrarDetalles()" class="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-secondary transition-colors">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content fields -->
          <div class="space-y-3.5 text-xs">
            <div class="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <span class="text-muted-foreground font-medium">Estado de la consulta:</span>
              <span [ngClass]="getStatusBadge(citaSeleccionadaDetalle.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {{ citaSeleccionadaDetalle.estado === 'no_asistio' ? 'NO ASISTIÓ' : citaSeleccionadaDetalle.estado }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-secondary/40 border border-border">
                <span class="text-muted-foreground text-[11px] block">Especialidad</span>
                <span class="font-bold text-foreground text-sm block mt-0.5">{{ citaSeleccionadaDetalle.especialidad_nombre || 'Medicina General' }}</span>
              </div>
              <div class="p-3 rounded-xl bg-secondary/40 border border-border">
                <span class="text-muted-foreground text-[11px] block">Médico Tratante</span>
                <span class="font-bold text-foreground text-sm block mt-0.5">{{ citaSeleccionadaDetalle.medico_nombre || 'Médico Asignado' }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-secondary/40 border border-border">
                <span class="text-muted-foreground text-[11px] block">Fecha de la Cita</span>
                <span class="font-bold text-foreground text-sm block mt-0.5">{{ citaSeleccionadaDetalle.fecha_hora | date:'fullDate' }}</span>
              </div>
              <div class="p-3 rounded-xl bg-secondary/40 border border-border">
                <span class="text-muted-foreground text-[11px] block">Hora Programada</span>
                <span class="font-bold text-primary text-sm block mt-0.5">{{ citaSeleccionadaDetalle.fecha_hora | date:'shortTime' }}</span>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-secondary/40 border border-border">
              <span class="text-muted-foreground text-[11px] block">Ubicación y Sede</span>
              <span class="font-semibold text-foreground block mt-0.5">{{ citaSeleccionadaDetalle.sede_nombre || 'Sede Principal MediCore' }}</span>
            </div>

            <div class="p-3 rounded-xl bg-secondary/40 border border-border">
              <span class="text-muted-foreground text-[11px] block">Motivo / Razón Informada</span>
              <p class="font-medium text-foreground mt-0.5 italic">
                "{{ citaSeleccionadaDetalle.motivo || 'Control y valoración clínica' }}"
              </p>
            </div>

            <!-- SECCIÓN EXCLUSIVA: INFORMACIÓN CLÍNICA DEJADA POR EL DOCTOR (ESTADO ATENDIDA) -->
            <div *ngIf="citaSeleccionadaDetalle.estado === 'atendida'" class="pt-2 border-t border-border space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 class="font-display font-bold text-foreground text-xs uppercase tracking-wide">Información del Médico</h4>
                </div>
                <span *ngIf="cargandoNota" class="text-[10px] text-muted-foreground animate-pulse">Consultando historial...</span>
              </div>

              <!-- Ficha con datos -->
              <div *ngIf="notaClinicaDetalle" class="space-y-3 animate-fade-in">
                <!-- Diagnóstico Clínico -->
                <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <span class="text-[11px] font-bold text-blue-300 block mb-1 flex items-center gap-1.5">
                    <svg class="size-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Diagnóstico Clínico
                  </span>
                  <p class="text-xs text-foreground font-medium leading-relaxed whitespace-pre-line">
                    {{ notaClinicaDetalle.diagnostico || 'Diagnóstico no especificado' }}
                  </p>
                </div>

                <!-- Plan de Tratamiento -->
                <div *ngIf="notaClinicaDetalle.tratamiento" class="p-3.5 rounded-xl bg-secondary/50 border border-border">
                  <span class="text-[11px] font-bold text-muted-foreground block mb-1">Plan de Tratamiento / Indicaciones:</span>
                  <p class="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {{ notaClinicaDetalle.tratamiento }}
                  </p>
                </div>

                <!-- Receta Médica -->
                <div *ngIf="notaClinicaDetalle.receta_medica" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span class="text-[11px] font-bold text-emerald-400 block mb-1 flex items-center gap-1.5">
                    <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Receta Médica y Prescripción Farmacéutica:
                  </span>
                  <p class="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {{ notaClinicaDetalle.receta_medica }}
                  </p>
                </div>

                <!-- Documentos Adjuntos (Word / PDF) -->
                <div *ngIf="notaClinicaDetalle.archivo_adjunto" class="p-3.5 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-primary flex items-center gap-1.5">
                      <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Documento Clínico Adjunto
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="esPdf(notaClinicaDetalle.archivo_nombre) ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'">
                      {{ esPdf(notaClinicaDetalle.archivo_nombre) ? 'PDF' : 'WORD (.DOCX)' }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between gap-3 bg-secondary/80 p-2.5 rounded-lg border border-border">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <svg *ngIf="esPdf(notaClinicaDetalle.archivo_nombre)" class="size-6 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                      </svg>
                      <svg *ngIf="!esPdf(notaClinicaDetalle.archivo_nombre)" class="size-6 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                      </svg>
                      <span class="text-xs font-semibold text-foreground truncate" [title]="notaClinicaDetalle.archivo_nombre">
                        {{ notaClinicaDetalle.archivo_nombre || 'documento_clinico' }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <button *ngIf="esPdf(notaClinicaDetalle.archivo_nombre)"
                        (click)="abrirDocumento(notaClinicaDetalle.archivo_adjunto)"
                        class="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border cursor-pointer transition-colors flex items-center gap-1">
                        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Ver</span>
                      </button>

                      <a [href]="notaClinicaDetalle.archivo_adjunto"
                        [download]="notaClinicaDetalle.archivo_nombre || 'documento_clinico'"
                        class="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-sm cursor-pointer transition-colors flex items-center gap-1">
                        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Descargar</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Si la nota clínica aún no está disponible -->
              <div *ngIf="!notaClinicaDetalle && !cargandoNota" class="p-3.5 rounded-xl bg-secondary/40 border border-border text-center">
                <p class="text-xs text-muted-foreground italic">
                  La consulta fue marcada como atendida por el especialista.
                </p>
              </div>
            </div>

            <div *ngIf="citaSeleccionadaDetalle.estado === 'pendiente_pago'" class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
              <div class="flex items-center gap-2 font-bold text-xs">
                <svg class="size-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Gestión de Pago y Facturación</span>
              </div>
              <p class="text-[11px] text-muted-foreground">
                El pago y soporte de transferencia de esta consulta se gestiona exclusivamente desde el módulo de <strong class="text-foreground">Pagos y Facturación</strong>.
              </p>
              <div class="pt-1">
                <a routerLink="/pagos" (click)="cerrarDetalles()" class="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                  <span>Ir a Pagos y Facturación</span>
                  <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t border-border/80 sticky bottom-0 bg-card">
            <button (click)="cerrarDetalles()" class="px-5 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CitasComponent implements OnInit {
  citasService = inject(CitasService);

  activeTab: string = 'todas';
  citaSeleccionadaDetalle: CitaItem | null = null;
  notaClinicaDetalle: NotaClinicaItem | null = null;
  cargandoNota = false;

  readonly tabs = [
    { id: 'todas', label: 'Todas' },
    { id: 'confirmada', label: 'Confirmadas' },
    { id: 'atendida', label: 'Atendidas' },
    { id: 'pendiente_pago', label: 'Pendientes' },
    { id: 'no_asistio', label: 'No Asistió' },
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

  verDetalles(cita: CitaItem) {
    this.citaSeleccionadaDetalle = cita;
    this.notaClinicaDetalle = cita.nota_clinica || null;
    if (cita.estado === 'atendida') {
      this.cargandoNota = true;
      this.citasService.obtenerNotaClinica(cita.id).subscribe({
        next: (nota) => {
          this.notaClinicaDetalle = nota;
          this.cargandoNota = false;
        },
        error: () => {
          this.cargandoNota = false;
        }
      });
    }
  }

  cerrarDetalles() {
    this.citaSeleccionadaDetalle = null;
    this.notaClinicaDetalle = null;
    this.cargandoNota = false;
  }

  esPdf(nombre?: string | null): boolean {
    if (!nombre) return false;
    return nombre.toLowerCase().endsWith('.pdf');
  }

  abrirDocumento(dataUrl?: string | null) {
    if (!dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
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
      case 'no_asistio':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }
}
