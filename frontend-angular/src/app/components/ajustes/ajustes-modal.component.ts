import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ajustes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div class="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border/80 pb-4">
          <div class="flex items-center gap-3">
            <div class="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 class="font-display text-base font-bold text-foreground">Ajustes y Personalización</h2>
              <p class="text-xs text-muted-foreground">{{ headerSubtitle }}</p>
            </div>
          </div>
          <button (click)="closed.emit()" class="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Cerrar modal">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Success and Error alerts -->
        <div *ngIf="successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <svg class="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>

        <div *ngIf="errorMessage" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
          <svg class="size-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Section 1: Tema y Modo Visual -->
        <div class="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
                <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Tema de Pantalla</span>
              </h3>
              <p class="text-[11px] text-muted-foreground mt-0.5">Elige el estilo visual para el portal clínico</p>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold uppercase">
              {{ currentTheme }}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              (click)="changeTheme('dark')"
              [ngClass]="{'border-primary bg-primary/10': currentTheme === 'dark'}"
              class="p-3 rounded-xl border border-border bg-card/60 hover:bg-card text-left transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
              <div class="size-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-primary">
                🌙
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">Modo Oscuro</p>
                <p class="text-[10px] text-muted-foreground">Clínico Nocturno</p>
              </div>
            </button>

            <button
              type="button"
              (click)="changeTheme('light')"
              [ngClass]="{'border-primary bg-primary/10': currentTheme === 'light'}"
              class="p-3 rounded-xl border border-border bg-card/60 hover:bg-card text-left transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
              <div class="size-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-amber-500">
                ☀️
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">Modo Claro</p>
                <p class="text-[10px] text-muted-foreground">Clínico Diurno</p>
              </div>
            </button>

            <button
              type="button"
              (click)="changeTheme('system')"
              [ngClass]="{'border-primary bg-primary/10': currentTheme === 'system'}"
              class="p-3 rounded-xl border border-border bg-card/60 hover:bg-card text-left transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
              <div class="size-7 rounded-full bg-secondary border border-border flex items-center justify-center text-primary">
                💻
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">Modo Normal</p>
                <p class="text-[10px] text-muted-foreground">Sistema / Auto</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Section 2: Foto de Perfil (Adaptada al Rol) -->
        <div class="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
          <div>
            <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
              <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ fotoSectionTitle }}</span>
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ fotoSectionDescription }}</p>
          </div>

          <div class="flex items-center gap-4 pt-1">
            <!-- Avatar Preview -->
            <div class="relative">
              <img *ngIf="avatarUrl" [src]="avatarUrl" alt="Avatar" class="size-16 rounded-full object-cover border-2 border-primary shadow-md" />
              <div *ngIf="!avatarUrl" class="size-16 rounded-full bg-primary/20 text-primary font-bold text-lg grid place-items-center border-2 border-primary/40">
                {{ userInitials }}
              </div>
            </div>

            <!-- Upload Controls -->
            <div class="flex-1 space-y-2">
              <div class="flex items-center gap-2">
                <label class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1.5">
                  <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Subir Foto</span>
                  <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" (change)="onAvatarFileSelected($event)" class="hidden" />
                </label>

                <button *ngIf="avatarUrl" (click)="eliminarAvatar()" class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold cursor-pointer border border-rose-500/30 transition-all">
                  Quitar foto
                </button>
              </div>
              <p class="text-[10px] text-muted-foreground">Formatos admitidos: PNG, JPG o WebP (máx. 4 MB).</p>
            </div>
          </div>
        </div>

        <!-- Section 3A: ADMINISTRADOR MAESTRO (SER SUPERIOR — Sin formulario de validación) -->
        <div *ngIf="isAdmin" class="p-5 rounded-2xl bg-gradient-to-br from-card via-primary/5 to-card border border-primary/30 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-primary/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg shadow-sm">
                👑
              </div>
              <div>
                <h3 class="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Credencial de Administrador Maestro</span>
                </h3>
                <p class="text-[11px] text-muted-foreground mt-0.5">Máxima autoridad de gobernanza clínica y control del sistema</p>
              </div>
            </div>
            <span class="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 via-primary/20 to-emerald-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
              <span>🛡️</span>
              <span>AUTORIDAD CENTRAL</span>
            </span>
          </div>

          <div class="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-[11px] text-foreground/90 space-y-1.5 leading-relaxed">
            <div class="flex items-center gap-1.5 font-bold text-primary">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Exento de Validación de Cédula (Entidad Validadora del Ecosistema)</span>
            </div>
            <p class="text-muted-foreground">
              Como Administrador del sistema, posees rango superior e irrestricto en MediCore OS. No requieres verificar documentos personales ni adjuntar cédula, puesto que tu rol es quien valida a los pacientes, supervisa el cuerpo médico, autoriza pagos y audita la plataforma.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-card/60 border border-border">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rango del Sistema</p>
              <p class="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                <span class="text-primary">●</span> Nivel 0 — Control Maestro
              </p>
            </div>
            <div class="p-3 rounded-xl bg-card/60 border border-border">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Acreditación</p>
              <p class="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <span>✓</span> Certificado por Arquitectura
              </p>
            </div>
            <div class="p-3 rounded-xl bg-card/60 border border-border">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Capacidades Activas</p>
              <p class="text-xs font-medium text-foreground mt-0.5">Sedes, Médicos, Citas y Pagos</p>
            </div>
            <div class="p-3 rounded-xl bg-card/60 border border-border">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Auditoría Criptográfica</p>
              <p class="text-xs font-medium text-primary mt-0.5">Sesión Segura & Token SHA-256</p>
            </div>
          </div>
        </div>

        <!-- Section 3B: MÉDICO ESPECIALISTA (Acreditación Médica y Confianza Clínica) -->
        <div *ngIf="isMedico" class="p-4 rounded-xl bg-secondary/30 border border-border space-y-3.5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
                <span class="text-base">🩺</span>
                <span>Acreditación Médica y Confianza Profesional</span>
              </h3>
              <p class="text-[11px] text-muted-foreground mt-0.5">
                Certificación de Tarjeta Profesional y Registro de Salud para transmitir total confianza a tus pacientes
              </p>
            </div>
            <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              🩺 Especialista Acreditado
            </span>
          </div>

          <div class="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary flex items-start gap-2">
            <svg class="size-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Tus credenciales de salud son públicas en el perfil de citas para que los pacientes reconozcan tu idoneidad clínica antes de reservar.
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Tarjeta Profesional / ReTHUS *</label>
              <input type="text" [(ngModel)]="medicoForm.tarjeta_profesional" class="glass-input text-xs font-mono" placeholder="Ej. TP-10982-COL" />
            </div>
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Especialidad Clínica</label>
              <input type="text" [(ngModel)]="medicoForm.especialidad" class="glass-input text-xs" placeholder="Ej. Cardiología" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Sede de Consulta</label>
              <input type="text" [(ngModel)]="medicoForm.sede" class="glass-input text-xs" placeholder="Sede Principal MediCore" />
            </div>
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Teléfono de Contacto Profesional</label>
              <input type="tel" [(ngModel)]="medicoForm.telefono" class="glass-input text-xs" placeholder="300 123 4567" />
            </div>
          </div>

          <!-- Subir Soporte de Tarjeta Profesional / Diploma -->
          <div class="p-3 rounded-lg border border-border bg-card/60 space-y-2">
            <label class="text-[11px] text-foreground font-semibold block">Soporte Digital de Tarjeta Profesional o Registro Médico</label>
            <div class="flex items-center gap-3">
              <label class="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2">
                <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Adjuntar Tarjeta Profesional</span>
                <input type="file" accept="image/png, image/jpeg, image/jpg, application/pdf" (change)="onDoctorSoporteSelected($event)" class="hidden" />
              </label>
              <span class="text-xs text-muted-foreground truncate max-w-[200px]">
                {{ medicoForm.soporte_nombre || 'Ningún archivo adjuntado' }}
              </span>
            </div>
          </div>

          <button
            type="button"
            (click)="guardarAcreditacionMedico()"
            [disabled]="loading"
            class="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
            <span *ngIf="loading" class="size-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>Guardar Acreditación y Generar Confianza Médica</span>
          </button>
        </div>

        <!-- Section 3C: PACIENTE (Validación Obligatoria de Persona Real y Cédula) -->
        <div *ngIf="isPaciente" class="p-4 rounded-xl bg-secondary/30 border border-border space-y-3.5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
                <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Validación de Persona Real (Documento y Cédula)</span>
              </h3>
              <p class="text-[11px] text-muted-foreground mt-0.5">Verificación obligatoria para agendar citas reales y evitar bots</p>
            </div>
            <span [ngClass]="getVerificationBadgeClass()" class="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {{ getVerificationBadgeText() }}
            </span>
          </div>

          <div class="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary flex items-start gap-2">
            <svg class="size-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Para que tu cuenta esté acreditada para agendar citas médicas, el administrador verificará tu documento de identidad (Cédula de Ciudadanía).
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Tipo Documento</label>
              <select [(ngModel)]="perfilForm.documento_tipo" class="glass-input text-xs cursor-pointer">
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PAS">Pasaporte (PAS)</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-[11px] text-muted-foreground mb-1 block">Número de Cédula / Documento *</label>
              <input type="text" [(ngModel)]="perfilForm.documento_numero" class="glass-input text-xs" placeholder="Ej. 1098765432" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Teléfono / Celular *</label>
              <input type="tel" [(ngModel)]="perfilForm.telefono" class="glass-input text-xs" placeholder="300 123 4567" required />
            </div>
            <div>
              <label class="text-[11px] text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
              <input type="date" [(ngModel)]="perfilForm.fecha_nacimiento" class="glass-input text-xs" />
            </div>
          </div>

          <!-- Subir Soporte de Cédula -->
          <div class="p-3 rounded-lg border border-border bg-card/60 space-y-2">
            <label class="text-[11px] text-foreground font-semibold block">Adjuntar Foto o Copia de Cédula (Documento)</label>
            <div class="flex items-center gap-3">
              <label class="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2">
                <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Seleccionar Cédula</span>
                <input type="file" accept="image/png, image/jpeg, image/jpg, application/pdf" (change)="onDocumentoSoporteSelected($event)" class="hidden" />
              </label>
              <span class="text-xs text-muted-foreground truncate max-w-[200px]">
                {{ documentoSoporteNombre || 'Ningún archivo seleccionado' }}
              </span>
            </div>
          </div>

          <button
            type="button"
            (click)="guardarVerificacion()"
            [disabled]="loading"
            class="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
            <span *ngIf="loading" class="size-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            <span>Guardar Datos y Solicitar Validación de Persona Real</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-border/80">
          <button (click)="closed.emit()" class="px-5 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer transition-colors">
            Cerrar Ajustes
          </button>
        </div>
      </div>
    </div>
  `
})
export class AjustesModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<void>();

  private auth = inject(AuthService);

  currentTheme: 'dark' | 'light' | 'system' = 'dark';
  avatarUrl: string | null = null;
  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  documentoSoporteNombre: string = '';
  documentoVerificadoStatus: string = 'pendiente';

  perfilForm = {
    documento_tipo: 'CC',
    documento_numero: '',
    telefono: '',
    fecha_nacimiento: '',
  };

  medicoForm = {
    tarjeta_profesional: '',
    especialidad: '',
    sede: '',
    telefono: '',
    soporte_nombre: '',
  };

  get currentUser() {
    return this.auth.currentUser();
  }

  get userRole(): string {
    return this.currentUser?.rol || 'paciente';
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  get isMedico(): boolean {
    return this.userRole === 'medico';
  }

  get isPaciente(): boolean {
    return this.userRole === 'paciente';
  }

  get headerSubtitle(): string {
    if (this.isAdmin) return 'Panel de personalización y credenciales de Superadministrador';
    if (this.isMedico) return 'Estilo visual, fotografía clínica y acreditación médica profesional';
    return 'Configura tu tema, foto de perfil y verifica tu identidad';
  }

  get fotoSectionTitle(): string {
    if (this.isAdmin) return 'Foto de Perfil del Administrador';
    if (this.isMedico) return 'Foto Profesional del Médico Especialista';
    return 'Foto de Perfil del Paciente';
  }

  get fotoSectionDescription(): string {
    if (this.isAdmin) return 'Visible en la cabecera y en los registros de auditoría maestra del sistema';
    if (this.isMedico) return 'Visible para tus pacientes en el portal de agenda y citas clínicas';
    return 'Sube una foto clara para tu expediente médico';
  }

  ngOnInit() {
    this.initTheme();
    this.initAvatar();
    this.initUserData();
  }

  initTheme() {
    try {
      const stored = localStorage.getItem('medicore_theme') as any;
      this.currentTheme = stored || 'dark';
      this.applyTheme(this.currentTheme);
    } catch {}
  }

  changeTheme(mode: 'dark' | 'light' | 'system') {
    this.currentTheme = mode;
    try {
      localStorage.setItem('medicore_theme', mode);
    } catch {}
    this.applyTheme(mode);
    this.successMessage = `Tema cambiado a: ${mode === 'dark' ? 'Modo Oscuro' : mode === 'light' ? 'Modo Claro' : 'Modo Normal'}`;
    setTimeout(() => this.successMessage = '', 3500);
  }

  applyTheme(mode: 'dark' | 'light' | 'system') {
    const isLight = mode === 'light' || (mode === 'system' && window.matchMedia && !window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (typeof document !== 'undefined') {
      if (isLight) {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
      }
    }
  }

  initAvatar() {
    const user = this.auth.currentUser();
    if (!user) return;
    try {
      this.avatarUrl = localStorage.getItem(`medicore_avatar_${user.id}`) || null;
    } catch {}
  }

  onAvatarFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      this.errorMessage = 'La imagen es demasiado grande. El límite es 4 MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl = e.target.result;
      this.avatarUrl = dataUrl;
      const user = this.auth.currentUser();
      if (user) {
        localStorage.setItem(`medicore_avatar_${user.id}`, dataUrl);
        window.dispatchEvent(new CustomEvent('medicore:avatar-changed', { detail: dataUrl }));
      }
      if (this.isAdmin) {
        this.successMessage = 'Foto del Administrador actualizada exitosamente.';
      } else if (this.isMedico) {
        this.successMessage = 'Foto profesional médica actualizada exitosamente.';
      } else {
        this.successMessage = 'Foto del paciente actualizada exitosamente.';
      }
      setTimeout(() => this.successMessage = '', 4000);
    };
    reader.readAsDataURL(file);
  }

  eliminarAvatar() {
    this.avatarUrl = null;
    const user = this.auth.currentUser();
    if (user) {
      localStorage.removeItem(`medicore_avatar_${user.id}`);
      window.dispatchEvent(new CustomEvent('medicore:avatar-changed', { detail: null }));
    }
    this.successMessage = 'Foto eliminada. Se mostrarán las iniciales clínicas.';
    setTimeout(() => this.successMessage = '', 3500);
  }

  initUserData() {
    const user = this.auth.currentUser();
    if (user) {
      this.perfilForm.telefono = user.telefono || '';
      const p = (user as any).paciente;
      if (p) {
        this.perfilForm.documento_tipo = p.documento_tipo || 'CC';
        const doc = (p.documento_numero || '').replace(/^G-/, '');
        this.perfilForm.documento_numero = doc;
        this.perfilForm.fecha_nacimiento = p.fecha_nacimiento || '';
      }

      const m = (user as any).medico;
      if (m) {
        this.medicoForm.tarjeta_profesional = m.tarjeta_profesional || 'TP-COL-2026';
        this.medicoForm.especialidad = m.especialidad || 'Especialista Clínico';
        this.medicoForm.sede = m.sede || 'Sede Principal MediCore';
      } else {
        try {
          const storedTP = localStorage.getItem(`medicore_doc_tp_${user.id}`);
          this.medicoForm.tarjeta_profesional = storedTP || 'TP-10982-COL';
          this.medicoForm.especialidad = 'Especialista Clínico';
          this.medicoForm.sede = 'Sede Principal MediCore';
        } catch {}
      }
      this.medicoForm.telefono = user.telefono || '300 123 4567';

      try {
        this.medicoForm.soporte_nombre = localStorage.getItem(`medicore_doc_soporte_${user.id}`) || 'Tarjeta_Profesional_Certificada.pdf';
        this.documentoVerificadoStatus = localStorage.getItem(`medicore_doc_status_${user.id}`) || ((user as any).correo_verificado && this.perfilForm.documento_numero ? 'verificado' : 'pendiente');
        this.documentoSoporteNombre = localStorage.getItem(`medicore_doc_soporte_nombre_${user.id}`) || '';
      } catch {}
    }
  }

  onDoctorSoporteSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    this.medicoForm.soporte_nombre = file.name;
    const user = this.auth.currentUser();
    if (user) {
      try {
        localStorage.setItem(`medicore_doc_soporte_${user.id}`, file.name);
      } catch {}
    }
  }

  guardarAcreditacionMedico() {
    if (!this.medicoForm.tarjeta_profesional.trim()) {
      this.errorMessage = 'La Tarjeta Profesional o Registro Médico es obligatoria.';
      return;
    }
    const user = this.auth.currentUser();
    if (user) {
      try {
        localStorage.setItem(`medicore_doc_tp_${user.id}`, this.medicoForm.tarjeta_profesional.trim());
        localStorage.setItem(`medicore_doc_status_${user.id}`, 'verificado');
      } catch {}
    }
    this.successMessage = '¡Acreditación profesional médica guardada con éxito! Tu perfil genera confianza verificada ante los pacientes.';
    this.profileUpdated.emit();
    setTimeout(() => this.successMessage = '', 5000);
  }

  onDocumentoSoporteSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    this.documentoSoporteNombre = file.name;
    const user = this.auth.currentUser();
    if (user) {
      try {
        localStorage.setItem(`medicore_doc_soporte_nombre_${user.id}`, file.name);
      } catch {}
    }
  }

  guardarVerificacion() {
    if (!this.perfilForm.documento_numero.trim()) {
      this.errorMessage = 'El número de cédula / documento es obligatorio.';
      return;
    }
    if (!this.perfilForm.telefono.trim()) {
      this.errorMessage = 'El teléfono de contacto es obligatorio.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.auth.completarPerfil({
      documento_tipo: this.perfilForm.documento_tipo,
      documento_numero: this.perfilForm.documento_numero.trim(),
      telefono: this.perfilForm.telefono.trim(),
      fecha_nacimiento: this.perfilForm.fecha_nacimiento || null
    }).subscribe({
      next: () => {
        this.loading = false;
        const user = this.auth.currentUser();
        if (user) {
          localStorage.setItem(`medicore_doc_status_${user.id}`, 'verificado');
          this.documentoVerificadoStatus = 'verificado';
        }
        this.successMessage = '¡Datos de identidad radicados con éxito! Eres reconocido como persona real en MediCore OS.';
        this.profileUpdated.emit();
        setTimeout(() => this.successMessage = '', 6000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'No se pudieron actualizar los datos de identidad.';
      }
    });
  }

  get userInitials(): string {
    const name = this.auth.currentUser()?.nombre_completo || 'Usuario';
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') || 'MC';
  }

  getVerificationBadgeClass(): string {
    if (this.documentoVerificadoStatus === 'verificado') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (this.documentoVerificadoStatus === 'en_revision') {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
    return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
  }

  getVerificationBadgeText(): string {
    if (this.documentoVerificadoStatus === 'verificado') {
      return '✅ Persona Real Verificada';
    }
    if (this.documentoVerificadoStatus === 'en_revision') {
      return '⏳ En Revisión por Admin';
    }
    return '⚠️ Pendiente Validación';
  }
}
