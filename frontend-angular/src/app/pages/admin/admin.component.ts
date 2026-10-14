import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ClinicaService } from '../../services/clinica.service';
import { PagosService } from '../../services/pagos.service';
import { CitasService } from '../../services/citas.service';
import { EspecialidadItem, MedicoItem, SedeItem } from '../../models/clinica.model';
import { CitaItem } from '../../models/cita.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header title="Panel de Administración" subtitle="Control maestro de médicos, sedes, especialidades, citas y pagos"></app-header>

        <main class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Metric counts -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Médicos Registrados</p>
              <p class="mt-2 font-display text-2xl font-bold text-foreground">{{ clinica.medicos().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Sedes Clínicas</p>
              <p class="mt-2 font-display text-2xl font-bold text-primary">{{ clinica.sedes().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Especialidades</p>
              <p class="mt-2 font-display text-2xl font-bold text-emerald-400">{{ clinica.especialidades().length }}</p>
            </div>
            <div class="p-5 rounded-xl border border-border bg-card shadow-md">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Transferencias por Revisar</p>
              <p class="mt-2 font-display text-2xl font-bold text-amber-400">{{ pagosPendientes.length }}</p>
            </div>
          </div>

          <!-- Tabs Navigation -->
          <div class="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border w-fit overflow-x-auto">
            <button (click)="activeTab = 'medicos'"
              [class.bg-primary]="activeTab === 'medicos'"
              [class.text-primary-foreground]="activeTab === 'medicos'"
              [class.text-muted-foreground]="activeTab !== 'medicos'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Médicos ({{ clinica.medicos().length }})
            </button>
            <button (click)="activeTab = 'sedes'"
              [class.bg-primary]="activeTab === 'sedes'"
              [class.text-primary-foreground]="activeTab === 'sedes'"
              [class.text-muted-foreground]="activeTab !== 'sedes'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Sedes ({{ clinica.sedes().length }})
            </button>
            <button (click)="activeTab = 'especialidades'"
              [class.bg-primary]="activeTab === 'especialidades'"
              [class.text-primary-foreground]="activeTab === 'especialidades'"
              [class.text-muted-foreground]="activeTab !== 'especialidades'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Especialidades ({{ clinica.especialidades().length }})
            </button>
            <button (click)="activeTab = 'autorizaciones'"
              [class.bg-primary]="activeTab === 'autorizaciones'"
              [class.text-primary-foreground]="activeTab === 'autorizaciones'"
              [class.text-muted-foreground]="activeTab !== 'autorizaciones'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
              <span>Autorizar Pagos</span>
              <span *ngIf="pagosPendientes.length > 0" class="size-2 rounded-full bg-amber-400 animate-pulse"></span>
            </button>
            <button (click)="activeTab = 'transacciones'"
              [class.bg-primary]="activeTab === 'transacciones'"
              [class.text-primary-foreground]="activeTab === 'transacciones'"
              [class.text-muted-foreground]="activeTab !== 'transacciones'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Historial Pagos ({{ pagosService.pagos().length }})
            </button>
            <button (click)="activeTab = 'citas'"
              [class.bg-primary]="activeTab === 'citas'"
              [class.text-primary-foreground]="activeTab === 'citas'"
              [class.text-muted-foreground]="activeTab !== 'citas'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Supervisión de Citas ({{ citasService.citas().length }})
            </button>
          </div>

          <!-- Alert notifications -->
          <div *ngIf="mensajeExito" class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <svg class="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ mensajeExito }}</span>
          </div>

          <div *ngIf="mensajeError" class="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <svg class="size-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ mensajeError }}</span>
          </div>

          <!-- TAB 1: MÉDICOS -->
          <div *ngIf="activeTab === 'medicos'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Cuerpo Médico Registrado</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Gestión de especialistas clínicos, asignación de sedes y agendas.</p>
              </div>
              <button (click)="abrirModalCrearMedico()"
                class="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Médico</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Nombre y Correo</th>
                    <th class="px-5 py-3">Especialidad</th>
                    <th class="px-5 py-3">Sede</th>
                    <th class="px-5 py-3">Tarjeta Prof.</th>
                    <th class="px-5 py-3">Duración Cita</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let m of clinica.medicos()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5">
                      <p class="font-bold text-foreground">{{ m.nombre_completo }}</p>
                      <p class="text-[11px] text-muted-foreground font-mono">{{ m.correo }}</p>
                    </td>
                    <td class="px-5 py-3.5 text-primary font-medium">{{ m.especialidad_nombre }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ m.sede_nombre }}</td>
                    <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ m.tarjeta_profesional }}</td>
                    <td class="px-5 py-3.5 text-foreground">{{ m.duracion_cita_minutos }} min</td>
                    <td class="px-5 py-3.5">
                      <span [ngClass]="m.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {{ m.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-right space-x-2">
                      <button (click)="abrirModalEditarMedico(m)"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] font-semibold cursor-pointer">
                        Editar
                      </button>
                      <button (click)="toggleActivoMedico(m)"
                        [class.text-rose-400]="m.activo"
                        [class.text-emerald-400]="!m.activo"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-semibold cursor-pointer">
                        {{ m.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="clinica.medicos().length === 0">
                    <td colspan="7" class="px-5 py-8 text-center text-muted-foreground italic">No hay médicos registrados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 2: SEDES -->
          <div *ngIf="activeTab === 'sedes'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Sedes Clínicas</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Ubicaciones físicas de atención médica y consultorios.</p>
              </div>
              <button (click)="abrirModalCrearSede()"
                class="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Sede</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Nombre de la Sede</th>
                    <th class="px-5 py-3">Dirección</th>
                    <th class="px-5 py-3">Teléfono</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let s of clinica.sedes()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-bold text-foreground">{{ s.nombre }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ s.direccion }}</td>
                    <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ s.telefono }}</td>
                    <td class="px-5 py-3.5">
                      <span [ngClass]="s.activa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {{ s.activa ? 'Activa' : 'Inactiva' }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-right space-x-2">
                      <button (click)="abrirModalEditarSede(s)"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] font-semibold cursor-pointer">
                        Editar
                      </button>
                      <button (click)="toggleActivaSede(s)"
                        [class.text-rose-400]="s.activa"
                        [class.text-emerald-400]="!s.activa"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-semibold cursor-pointer">
                        {{ s.activa ? 'Desactivar' : 'Activar' }}
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="clinica.sedes().length === 0">
                    <td colspan="5" class="px-5 py-8 text-center text-muted-foreground italic">No hay sedes registradas.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: ESPECIALIDADES -->
          <div *ngIf="activeTab === 'especialidades'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Catálogo de Especialidades</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Definición de especialidades y aranceles base de consulta.</p>
              </div>
              <button (click)="abrirModalCrearEspecialidad()"
                class="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Especialidad</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Nombre</th>
                    <th class="px-5 py-3">Descripción</th>
                    <th class="px-5 py-3">Tarifa Base</th>
                    <th class="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let e of clinica.especialidades()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-bold text-foreground">{{ e.nombre }}</td>
                    <td class="px-5 py-3.5 text-muted-foreground max-w-md">{{ e.descripcion }}</td>
                    <td class="px-5 py-3.5 font-bold text-emerald-400">$ {{ e.precio_base | number:'1.0-0' }} COP</td>
                    <td class="px-5 py-3.5 text-right space-x-2">
                      <button (click)="abrirModalEditarEspecialidad(e)"
                        class="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] font-semibold cursor-pointer">
                        Editar
                      </button>
                      <button (click)="eliminarEspecialidad(e)"
                        class="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold cursor-pointer">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="clinica.especialidades().length === 0">
                    <td colspan="4" class="px-5 py-8 text-center text-muted-foreground italic">No hay especialidades registradas.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 4: AUTORIZACIONES DE PAGO POR TRANSFERENCIA -->
          <div *ngIf="activeTab === 'autorizaciones'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Comprobantes de Transferencia por Autorizar</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Verifica los soportes bancarios (Nequi, Daviplata, Bancolombia) y autoriza o rechaza.</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {{ pagosPendientes.length }} pendientes
              </span>
            </div>

            <div class="overflow-x-auto">
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
                    <td class="px-5 py-3.5 text-right space-x-2">
                      <button (click)="autorizar(p)"
                        [disabled]="pagosService.loading()"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50">
                        <span>✓ Autorizar</span>
                      </button>
                      <button (click)="rechazar(p)"
                        [disabled]="pagosService.loading()"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer disabled:opacity-50">
                        <span>✕ Rechazar</span>
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="pagosPendientes.length === 0">
                    <td colspan="7" class="px-5 py-10 text-center text-muted-foreground italic">
                      🎉 No hay transferencias pendientes por autorizar. Todos los comprobantes están al día.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 5: HISTORIAL GLOBAL DE PAGOS -->
          <div *ngIf="activeTab === 'transacciones'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Registro Global de Transacciones</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Auditoría completa de todos los pagos y estados de facturación.</p>
              </div>
              <button (click)="pagosService.loadMisPagos().subscribe()" class="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer">
                Recargar
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Referencia</th>
                    <th class="px-5 py-3">Concepto</th>
                    <th class="px-5 py-3">Monto</th>
                    <th class="px-5 py-3">Método / Canal</th>
                    <th class="px-5 py-3">Soporte</th>
                    <th class="px-5 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let p of pagosService.pagos()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-mono text-muted-foreground">{{ p.referencia || p.transaccion_id || p.id }}</td>
                    <td class="px-5 py-3.5 font-medium text-foreground">{{ p.concepto || 'Consulta Médica' }}</td>
                    <td class="px-5 py-3.5 font-bold text-foreground">$ {{ p.monto | number:'1.0-0' }} {{ p.moneda || 'COP' }}</td>
                    <td class="px-5 py-3.5 capitalize text-muted-foreground">
                      <span class="font-medium text-foreground">{{ p.banco_origen || p.metodo_pago?.replace('_', ' ') || 'Transferencia' }}</span>
                    </td>
                    <td class="px-5 py-3.5">
                      <button *ngIf="p.comprobante_archivo" (click)="verComprobante(p)"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 cursor-pointer">
                        Ver Adjunto
                      </button>
                      <span *ngIf="!p.comprobante_archivo" class="text-muted-foreground text-[10px] italic">-</span>
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <span [ngClass]="getStatusBadge(p.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {{ p.estado === 'pendiente' ? 'Pendiente' : p.estado }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="pagosService.pagos().length === 0">
                    <td colspan="6" class="px-5 py-8 text-center text-muted-foreground italic">No hay registros de pago disponibles.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 6: SUPERVISIÓN GLOBAL DE CITAS -->
          <div *ngIf="activeTab === 'citas'" class="rounded-xl border border-border bg-card shadow-lg overflow-hidden space-y-4">
            <div class="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 class="font-display text-sm font-bold text-foreground">Supervisión Central de Citas Médicas</h3>
                <p class="text-xs text-muted-foreground mt-0.5">Control de todas las consultas programadas en el sistema.</p>
              </div>
              <button (click)="citasService.loadMisCitas().subscribe()" class="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer">
                Recargar Citas
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/50 text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th class="px-5 py-3">Paciente</th>
                    <th class="px-5 py-3">Médico / Especialidad</th>
                    <th class="px-5 py-3">Fecha y Hora</th>
                    <th class="px-5 py-3">Sede</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3 text-right">Acción Admin</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr *ngFor="let c of citasService.citas()" class="hover:bg-secondary/30 transition-colors">
                    <td class="px-5 py-3.5 font-bold text-foreground">{{ c.paciente_nombre || 'Paciente' }}</td>
                    <td class="px-5 py-3.5">
                      <p class="font-medium text-foreground">{{ c.medico_nombre || 'Médico' }}</p>
                      <p class="text-[11px] text-primary">{{ c.especialidad_nombre }}</p>
                    </td>
                    <td class="px-5 py-3.5 text-muted-foreground">
                      <span class="font-medium text-foreground">{{ c.fecha_hora | date:'shortDate' }}</span> • {{ c.fecha_hora | date:'shortTime' }}
                    </td>
                    <td class="px-5 py-3.5 text-muted-foreground">{{ c.sede_nombre }}</td>
                    <td class="px-5 py-3.5">
                      <span [ngClass]="getCitaStatusBadge(c.estado)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {{ c.estado === 'no_asistio' ? 'NO ASISTIÓ' : c.estado }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <button *ngIf="c.estado === 'confirmada' || c.estado === 'pendiente_pago'"
                        (click)="cancelarCitaAdmin(c)"
                        class="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold cursor-pointer">
                        Cancelar Cita
                      </button>
                      <span *ngIf="c.estado !== 'confirmada' && c.estado !== 'pendiente_pago'" class="text-[11px] text-muted-foreground italic">-</span>
                    </td>
                  </tr>
                  <tr *ngIf="citasService.citas().length === 0">
                    <td colspan="6" class="px-5 py-8 text-center text-muted-foreground italic">No hay citas registradas en el sistema.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <!-- MODAL 1: INSPECCIÓN DE COMPROBANTE DE PAGO -->
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
              <p class="text-xs font-semibold text-foreground">Documento Soporte Digital Adjunto</p>
              <p class="text-[11px] text-muted-foreground">El archivo fue adjuntado por el paciente para validación contable.</p>
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
              <span class="text-muted-foreground block text-[10px] uppercase font-semibold">Estado del Pago</span>
              <span [ngClass]="getStatusBadge(comprobanteParaVer.estado)" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-0.5">
                {{ comprobanteParaVer.estado === 'pendiente' ? 'Pendiente Verificación' : comprobanteParaVer.estado }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
            <button (click)="comprobanteParaVer = null" class="px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer">
              Cerrar
            </button>

            <!-- Acciones: SOLO si el estado está pendiente -->
            <ng-container *ngIf="comprobanteParaVer.estado === 'pendiente'">
              <button (click)="rechazar(comprobanteParaVer); comprobanteParaVer = null"
                class="px-3.5 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white font-semibold text-xs shadow-md transition-all cursor-pointer">
                ✕ Rechazar Transferencia
              </button>
              <button (click)="autorizar(comprobanteParaVer); comprobanteParaVer = null"
                class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer">
                ✓ Autorizar Pago y Confirmar Cita
              </button>
            </ng-container>

            <!-- Indicador si ya fue procesado -->
            <span *ngIf="comprobanteParaVer.estado === 'aprobado' || comprobanteParaVer.estado === 'completado'" class="text-xs text-emerald-400 font-semibold italic">
              ✓ Este pago ya se encuentra autorizado y la cita confirmada.
            </span>
            <span *ngIf="comprobanteParaVer.estado === 'rechazado'" class="text-xs text-rose-400 font-semibold italic">
              ✕ Este pago fue rechazado.
            </span>
          </div>
        </div>
      </div>

      <!-- MODAL 2: CREAR / EDITAR MÉDICO -->
      <div *ngIf="modalMedicoAbierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 class="font-display text-base font-bold text-foreground">
              {{ medicoEnEdicion ? 'Editar Médico Clínico' : 'Registrar Nuevo Médico' }}
            </h3>
            <button (click)="modalMedicoAbierto = false" class="text-muted-foreground hover:text-foreground cursor-pointer text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3.5 text-xs">
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Nombre Completo *</label>
              <input type="text" [(ngModel)]="formMedico.nombre_completo" placeholder="Ej: Dr. Fernando Montoya"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>

            <div *ngIf="!medicoEnEdicion" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Correo Electrónico *</label>
                <input type="email" [(ngModel)]="formMedico.correo" placeholder="doctor@medicore.com"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Contraseña Inicial *</label>
                <div class="relative flex items-center">
                  <input [type]="showMedicoPassword ? 'text' : 'password'" [(ngModel)]="formMedico.password" placeholder="Min. 6 caracteres"
                    class="w-full p-2.5 pr-10 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
                  <button type="button" (click)="showMedicoPassword = !showMedicoPassword"
                    [attr.aria-label]="showMedicoPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                    [title]="showMedicoPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.08] focus:outline-none cursor-pointer">
                    <svg *ngIf="!showMedicoPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg *ngIf="showMedicoPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Especialidad *</label>
                <select [(ngModel)]="formMedico.especialidad_id"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary">
                  <option value="">Seleccionar especialidad...</option>
                  <option *ngFor="let esp of clinica.especialidades()" [value]="esp.id">{{ esp.nombre }}</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Sede Principal *</label>
                <select [(ngModel)]="formMedico.sede_id"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary">
                  <option value="">Seleccionar sede...</option>
                  <option *ngFor="let s of clinica.sedes()" [value]="s.id">{{ s.nombre }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Tarjeta Prof. *</label>
                <input type="text" [(ngModel)]="formMedico.tarjeta_profesional" placeholder="TP-982341"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Duración (min)</label>
                <input type="number" [(ngModel)]="formMedico.duracion_cita_minutos" placeholder="30"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label class="block font-semibold text-muted-foreground mb-1">Género</label>
                <select [(ngModel)]="formMedico.genero"
                  class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Teléfono Móvil</label>
              <input type="text" [(ngModel)]="formMedico.telefono" placeholder="+57 300 123 4567"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button (click)="modalMedicoAbierto = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              Cancelar
            </button>
            <button (click)="guardarMedico()" [disabled]="guardando"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer disabled:opacity-50">
              <span>{{ guardando ? 'Guardando...' : (medicoEnEdicion ? 'Actualizar Médico' : 'Crear Médico') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: CREAR / EDITAR SEDE -->
      <div *ngIf="modalSedeAbierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 class="font-display text-base font-bold text-foreground">
              {{ sedeEnEdicion ? 'Editar Sede Clínica' : 'Registrar Nueva Sede' }}
            </h3>
            <button (click)="modalSedeAbierto = false" class="text-muted-foreground hover:text-foreground cursor-pointer text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3.5 text-xs">
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Nombre de la Sede *</label>
              <input type="text" [(ngModel)]="formSede.nombre" placeholder="Ej: Sede Poblado - Torre Médica"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Dirección Completa *</label>
              <input type="text" [(ngModel)]="formSede.direccion" placeholder="Ej: Carrera 43A # 1Sur-220"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Teléfono de Contacto</label>
              <input type="text" [(ngModel)]="formSede.telefono" placeholder="Ej: +57 604 444 8899"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button (click)="modalSedeAbierto = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              Cancelar
            </button>
            <button (click)="guardarSede()" [disabled]="guardando"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer disabled:opacity-50">
              <span>{{ guardando ? 'Guardando...' : (sedeEnEdicion ? 'Actualizar Sede' : 'Crear Sede') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 4: CREAR / EDITAR ESPECIALIDAD -->
      <div *ngIf="modalEspecialidadAbierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 class="font-display text-base font-bold text-foreground">
              {{ especialidadEnEdicion ? 'Editar Especialidad' : 'Registrar Nueva Especialidad' }}
            </h3>
            <button (click)="modalEspecialidadAbierto = false" class="text-muted-foreground hover:text-foreground cursor-pointer text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3.5 text-xs">
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Nombre de la Especialidad *</label>
              <input type="text" [(ngModel)]="formEspecialidad.nombre" placeholder="Ej: Neurología Clínica"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Descripción</label>
              <textarea rows="2" [(ngModel)]="formEspecialidad.descripcion" placeholder="Diagnóstico y tratamiento de patologías neurológicas..."
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary"></textarea>
            </div>
            <div>
              <label class="block font-semibold text-muted-foreground mb-1">Tarifa Base (COP) *</label>
              <input type="number" [(ngModel)]="formEspecialidad.precio_base" placeholder="70000"
                class="w-full p-2.5 rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button (click)="modalEspecialidadAbierto = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              Cancelar
            </button>
            <button (click)="guardarEspecialidad()" [disabled]="guardando"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md cursor-pointer disabled:opacity-50">
              <span>{{ guardando ? 'Guardando...' : (especialidadEnEdicion ? 'Actualizar Especialidad' : 'Crear Especialidad') }}</span>
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
  citasService = inject(CitasService);

  activeTab: 'medicos' | 'sedes' | 'especialidades' | 'autorizaciones' | 'transacciones' | 'citas' = 'medicos';
  comprobanteParaVer: any = null;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  guardando = false;

  // Modales y formularios
  modalMedicoAbierto = false;
  showMedicoPassword = false;
  medicoEnEdicion: MedicoItem | null = null;
  formMedico = {
    nombre_completo: '',
    correo: '',
    password: '',
    telefono: '',
    especialidad_id: '',
    sede_id: '',
    tarjeta_profesional: '',
    duracion_cita_minutos: 30,
    genero: 'M'
  };

  modalSedeAbierto = false;
  sedeEnEdicion: SedeItem | null = null;
  formSede = {
    nombre: '',
    direccion: '',
    telefono: ''
  };

  modalEspecialidadAbierto = false;
  especialidadEnEdicion: EspecialidadItem | null = null;
  formEspecialidad = {
    nombre: '',
    descripcion: '',
    precio_base: 50000
  };

  get pagosPendientes() {
    return this.pagosService.pagos().filter(p => p.estado === 'pendiente');
  }

  ngOnInit() {
    this.clinica.loadAll();
    this.pagosService.loadMisPagos().subscribe();
    this.citasService.loadMisCitas().subscribe();
  }

  mostrarExito(msg: string) {
    this.mensajeExito = msg;
    this.mensajeError = null;
    setTimeout(() => this.mensajeExito = null, 5000);
  }

  mostrarError(msg: string) {
    this.mensajeError = msg;
    this.mensajeExito = null;
    setTimeout(() => this.mensajeError = null, 5000);
  }

  // --- GESTIÓN DE MÉDICOS ---
  abrirModalCrearMedico() {
    this.medicoEnEdicion = null;
    this.formMedico = {
      nombre_completo: '',
      correo: '',
      password: '',
      telefono: '',
      especialidad_id: this.clinica.especialidades()[0]?.id || '',
      sede_id: this.clinica.sedes()[0]?.id || '',
      tarjeta_profesional: '',
      duracion_cita_minutos: 30,
      genero: 'M'
    };
    this.modalMedicoAbierto = true;
  }

  abrirModalEditarMedico(m: MedicoItem) {
    this.medicoEnEdicion = m;
    this.formMedico = {
      nombre_completo: m.nombre_completo,
      correo: m.correo || '',
      password: '',
      telefono: '',
      especialidad_id: m.especialidad_id || '',
      sede_id: m.sede_id || '',
      tarjeta_profesional: m.tarjeta_profesional || '',
      duracion_cita_minutos: m.duracion_cita_minutos || 30,
      genero: m.genero || 'M'
    };
    this.modalMedicoAbierto = true;
  }

  guardarMedico() {
    if (!this.formMedico.nombre_completo || !this.formMedico.especialidad_id || !this.formMedico.sede_id || !this.formMedico.tarjeta_profesional) {
      this.mostrarError('Por favor diligencie todos los campos obligatorios del médico.');
      return;
    }

    this.guardando = true;
    if (this.medicoEnEdicion) {
      this.clinica.actualizarMedico(this.medicoEnEdicion.id, {
        nombre_completo: this.formMedico.nombre_completo,
        especialidad_id: this.formMedico.especialidad_id,
        sede_id: this.formMedico.sede_id,
        tarjeta_profesional: this.formMedico.tarjeta_profesional,
        duracion_cita_minutos: this.formMedico.duracion_cita_minutos,
        genero: this.formMedico.genero,
        telefono: this.formMedico.telefono
      }).subscribe({
        next: () => {
          this.guardando = false;
          this.modalMedicoAbierto = false;
          this.mostrarExito('✅ Datos del médico actualizados correctamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al actualizar médico.');
        }
      });
    } else {
      if (!this.formMedico.correo || !this.formMedico.password) {
        this.guardando = false;
        this.mostrarError('Correo y contraseña son requeridos para crear un médico nuevo.');
        return;
      }
      this.clinica.crearMedico(this.formMedico).subscribe({
        next: () => {
          this.guardando = false;
          this.modalMedicoAbierto = false;
          this.mostrarExito('✅ Nuevo médico registrado y vinculado al sistema exitosamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al crear médico.');
        }
      });
    }
  }

  toggleActivoMedico(m: MedicoItem) {
    this.clinica.actualizarMedico(m.id, { activo: !m.activo }).subscribe({
      next: () => {
        this.mostrarExito(`Médico ${!m.activo ? 'activado' : 'desactivado'} con éxito.`);
      }
    });
  }

  // --- GESTIÓN DE SEDES ---
  abrirModalCrearSede() {
    this.sedeEnEdicion = null;
    this.formSede = { nombre: '', direccion: '', telefono: '' };
    this.modalSedeAbierto = true;
  }

  abrirModalEditarSede(s: SedeItem) {
    this.sedeEnEdicion = s;
    this.formSede = { nombre: s.nombre, direccion: s.direccion || '', telefono: s.telefono || '' };
    this.modalSedeAbierto = true;
  }

  guardarSede() {
    if (!this.formSede.nombre || !this.formSede.direccion) {
      this.mostrarError('Nombre y dirección son obligatorios para la sede.');
      return;
    }

    this.guardando = true;
    if (this.sedeEnEdicion) {
      this.clinica.actualizarSede(this.sedeEnEdicion.id, this.formSede).subscribe({
        next: () => {
          this.guardando = false;
          this.modalSedeAbierto = false;
          this.mostrarExito('✅ Sede clínica actualizada correctamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al actualizar sede.');
        }
      });
    } else {
      this.clinica.crearSede(this.formSede).subscribe({
        next: () => {
          this.guardando = false;
          this.modalSedeAbierto = false;
          this.mostrarExito('✅ Nueva sede registrada exitosamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al crear sede.');
        }
      });
    }
  }

  toggleActivaSede(s: SedeItem) {
    this.clinica.actualizarSede(s.id, { activa: !s.activa }).subscribe({
      next: () => {
        this.mostrarExito(`Sede ${!s.activa ? 'activada' : 'desactivada'} correctamente.`);
      }
    });
  }

  // --- GESTIÓN DE ESPECIALIDADES ---
  abrirModalCrearEspecialidad() {
    this.especialidadEnEdicion = null;
    this.formEspecialidad = { nombre: '', descripcion: '', precio_base: 50000 };
    this.modalEspecialidadAbierto = true;
  }

  abrirModalEditarEspecialidad(e: EspecialidadItem) {
    this.especialidadEnEdicion = e;
    this.formEspecialidad = { nombre: e.nombre, descripcion: e.descripcion || '', precio_base: e.precio_base || 50000 };
    this.modalEspecialidadAbierto = true;
  }

  guardarEspecialidad() {
    if (!this.formEspecialidad.nombre) {
      this.mostrarError('El nombre de la especialidad es obligatorio.');
      return;
    }

    this.guardando = true;
    if (this.especialidadEnEdicion) {
      this.clinica.actualizarEspecialidad(this.especialidadEnEdicion.id, this.formEspecialidad).subscribe({
        next: () => {
          this.guardando = false;
          this.modalEspecialidadAbierto = false;
          this.mostrarExito('✅ Especialidad actualizada correctamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al actualizar especialidad.');
        }
      });
    } else {
      this.clinica.crearEspecialidad(this.formEspecialidad).subscribe({
        next: () => {
          this.guardando = false;
          this.modalEspecialidadAbierto = false;
          this.mostrarExito('✅ Nueva especialidad añadida al catálogo.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(err?.error?.detail || 'Error al crear especialidad.');
        }
      });
    }
  }

  eliminarEspecialidad(e: EspecialidadItem) {
    if (!confirm(`¿Seguro que deseas eliminar la especialidad "${e.nombre}"?`)) return;
    this.clinica.eliminarEspecialidad(e.id).subscribe({
      next: () => {
        this.mostrarExito(`Especialidad "${e.nombre}" eliminada correctamente.`);
      },
      error: (err) => {
        this.mostrarError(err?.error?.detail || 'No se pudo eliminar la especialidad.');
      }
    });
  }

  // --- GESTIÓN DE PAGOS Y AUTORIZACIONES ---
  verComprobante(p: any) {
    this.comprobanteParaVer = p;
  }

  autorizar(p: any) {
    const ref = p?.referencia || p?.transaccion_id || p?.id;
    if (!ref) return;
    this.pagosService.autorizarPago(ref).subscribe({
      next: () => {
        this.mostrarExito(`✅ Pago ${ref} autorizado con éxito. Cita confirmada.`);
        this.pagosService.loadMisPagos().subscribe();
        this.citasService.loadMisCitas().subscribe();
      },
      error: (err) => {
        this.mostrarError(err?.error?.detail || 'Error al autorizar el pago.');
      }
    });
  }

  rechazar(p: any) {
    const ref = p?.referencia || p?.transaccion_id || p?.id;
    if (!ref) return;
    this.pagosService.rechazarPago(ref).subscribe({
      next: () => {
        this.mostrarExito(`❌ Pago ${ref} rechazado. Cita cancelada.`);
        this.pagosService.loadMisPagos().subscribe();
        this.citasService.loadMisCitas().subscribe();
      },
      error: (err) => {
        this.mostrarError(err?.error?.detail || 'Error al rechazar el pago.');
      }
    });
  }

  // --- CANCELACIÓN DIRECTA DE CITA POR ADMIN ---
  cancelarCitaAdmin(c: CitaItem) {
    if (!confirm(`¿Deseas cancelar la cita de ${c.paciente_nombre}?`)) return;
    this.citasService.cancelarCita(c.id, 'Cancelada por el Administrador').subscribe({
      next: () => {
        this.mostrarExito('Cita médica cancelada por administración.');
        this.citasService.loadMisCitas().subscribe();
        this.pagosService.loadMisPagos().subscribe();
      }
    });
  }

  getStatusBadge(estado: string): string {
    switch (estado) {
      case 'aprobado':
      case 'completado':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'pendiente':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'rechazado':
      case 'fallido':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'reembolsado':
        return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }

  getCitaStatusBadge(estado: string): string {
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
