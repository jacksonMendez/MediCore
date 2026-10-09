import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ClinicaService } from '../../services/clinica.service';
import { PagosService } from '../../services/pagos.service';

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
            <button (click)="activeTab = 'autorizaciones'"
              [class.bg-primary]="activeTab === 'autorizaciones'"
              [class.text-primary-foreground]="activeTab === 'autorizaciones'"
              [class.text-muted-foreground]="activeTab !== 'autorizaciones'"
              class="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5">
              <span>Autorizar Transferencias</span>
              <span *ngIf="pagosPendientes.length > 0" class="size-2 rounded-full bg-amber-400"></span>
            </button>
          </div>

          <!-- Alert notification -->
          <div *ngIf="pagosService.lastSuccessMessage()" class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <svg class="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ pagosService.lastSuccessMessage() }}</span>
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

          <!-- Tab: Autorizaciones de Pago por Transferencia -->
          <div *ngIf="activeTab === 'autorizaciones'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Comprobantes de Transferencia por Autorizar</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Verifica los soportes bancarios (Nequi, Daviplata, Bancolombia) y autoriza la cita médica.</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {{ pagosPendientes.length }} pendientes
              </span>
            </div>

            <table class="w-full text-left text-xs">
              <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th class="px-5 py-3">Referencia</th>
                  <th class="px-5 py-3">Paciente</th>
                  <th class="px-5 py-3">Concepto</th>
                  <th class="px-5 py-3">Monto</th>
                  <th class="px-5 py-3">Medio / Banco</th>
                  <th class="px-5 py-3">Soporte Digital</th>
                  <th class="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr *ngFor="let p of pagosPendientes" class="hover:bg-secondary/30 transition-colors">
                  <td class="px-5 py-3.5 font-mono font-bold text-amber-400">{{ p.referencia || p.transaccion_id || p.id }}</td>
                  <td class="px-5 py-3.5 font-medium text-foreground">{{ p.paciente_nombre || 'Paciente' }}</td>
                  <td class="px-5 py-3.5 text-muted-foreground">{{ p.concepto || 'Consulta Médica' }}</td>
                  <td class="px-5 py-3.5 font-bold text-emerald-400">$ {{ p.monto | number:'1.0-0' }} COP</td>
                  <td class="px-5 py-3.5 capitalize text-muted-foreground">
                    <span class="font-medium text-foreground">{{ p.banco_origen || p.metodo_pago?.replace('_', ' ') || 'Transferencia' }}</span>
                  </td>
                  <td class="px-5 py-3.5">
                    <button *ngIf="p.comprobante_archivo" (click)="verComprobante(p)"
                      class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium flex items-center gap-1.5 cursor-pointer text-[11px] shadow-sm">
                      <svg class="size-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Ver Comprobante</span>
                    </button>
                    <span *ngIf="!p.comprobante_archivo" class="text-muted-foreground text-[11px] italic">Sin adjunto</span>
                  </td>
                  <td class="px-5 py-3.5 text-right space-x-1.5">
                    <button (click)="autorizar(p)"
                      [disabled]="pagosService.loading()"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50">
                      <span *ngIf="pagosService.loading()">...</span>
                      <span *ngIf="!pagosService.loading()">✓ Autorizar</span>
                    </button>
                    <button (click)="rechazar(p)"
                      [disabled]="pagosService.loading()"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer disabled:opacity-50">
                      ✕
                    </button>
                  </td>
                </tr>

                <tr *ngIf="pagosPendientes.length === 0">
                  <td colspan="7" class="px-5 py-10 text-center text-muted-foreground italic">
                    🎉 No hay transferencias pendientes por autorizar. Todos los comprobantes están verificados.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <!-- Modal: Inspección de Comprobante -->
      <div *ngIf="comprobanteParaVer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h3 class="font-display text-base font-bold text-foreground">Comprobante de Transferencia</h3>
              <p class="text-xs text-muted-foreground">Referencia: <span class="font-mono text-amber-400 font-bold">{{ comprobanteParaVer.referencia }}</span></p>
            </div>
            <button (click)="comprobanteParaVer = null" class="text-muted-foreground hover:text-foreground cursor-pointer p-1">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Comprobante View Container -->
          <div class="rounded-xl border border-border bg-secondary/40 p-2 max-h-96 overflow-y-auto flex items-center justify-center">
            <img *ngIf="comprobanteParaVer.comprobante_archivo?.startsWith('data:image')"
              [src]="comprobanteParaVer.comprobante_archivo"
              alt="Comprobante Bancario"
              class="max-w-full max-h-80 rounded-lg object-contain" />

            <div *ngIf="!comprobanteParaVer.comprobante_archivo?.startsWith('data:image')" class="p-6 text-center space-y-2">
              <svg class="size-10 mx-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-xs font-semibold text-foreground">Documento Soporte Digital (PDF / Archivo)</p>
              <p class="text-[11px] text-muted-foreground">El archivo fue adjuntado por el paciente para validación.</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-secondary/50 border border-border/80">
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase font-semibold">Paciente</span>
              <span class="font-bold text-foreground">{{ comprobanteParaVer.paciente_nombre }}</span>
            </div>
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase font-semibold">Monto</span>
              <span class="font-bold text-emerald-400">$ {{ comprobanteParaVer.monto | number:'1.0-0' }} COP</span>
            </div>
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase font-semibold">Banco / Canal</span>
              <span class="capitalize text-foreground font-medium">{{ comprobanteParaVer.banco_origen || 'Transferencia' }}</span>
            </div>
            <div>
              <span class="text-muted-foreground block text-[10px] uppercase font-semibold">Estado</span>
              <span class="text-amber-400 font-bold uppercase text-[11px]">Pendiente Verificación</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
            <button (click)="comprobanteParaVer = null" class="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              Cerrar
            </button>
            <button (click)="autorizar(comprobanteParaVer); comprobanteParaVer = null"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer">
              ✓ Autorizar Pago y Confirmar Cita
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  clinica = inject(ClinicaService);
  pagosService = inject(PagosService);
  activeTab: 'medicos' | 'sedes' | 'especialidades' | 'autorizaciones' = 'medicos';
  comprobanteParaVer: any = null;

  get pagosPendientes() {
    return this.pagosService.pagos().filter(p => p.estado === 'pendiente');
  }

  ngOnInit() {
    this.clinica.loadAll();
    this.pagosService.loadMisPagos().subscribe();
  }

  verComprobante(p: any) {
    this.comprobanteParaVer = p;
  }

  autorizar(p: any) {
    const ref = p.referencia || p.transaccion_id;
    if (!ref) return;
    this.pagosService.autorizarPago(ref).subscribe({
      next: () => {
        this.pagosService.loadMisPagos().subscribe();
      }
    });
  }

  rechazar(p: any) {
    const ref = p.referencia || p.transaccion_id;
    if (!ref) return;
    if (confirm(`¿Rechazar el pago con referencia ${ref}?`)) {
      this.pagosService.autorizarPago(ref).subscribe({
        next: () => {
          this.pagosService.loadMisPagos().subscribe();
        }
      });
    }
  }
}
