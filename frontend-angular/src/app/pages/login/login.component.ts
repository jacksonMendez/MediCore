import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0F1724] selection:bg-[#4FA8A0] selection:text-slate-950">
      <!-- Background Ambient Orbs -->
      <div class="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#4FA8A0]/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#1A2736]/30 blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md relative z-10 my-8">
        <!-- Central Glass Card -->
        <div class="glass-panel-strong p-8 sm:p-10 shadow-2xl border border-white/[0.07]">
          <!-- Brand Header -->
          <div class="text-center mb-6">
            <div class="relative inline-block mb-3">
              <div class="w-12 h-12 rounded-xl bg-[#4FA8A0] flex items-center justify-center mx-auto shadow-lg shadow-[#4FA8A0]/20">
                <!-- Activity Pulse Icon -->
                <svg class="w-6 h-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
            </div>

            <h1 class="text-xl font-semibold tracking-tight text-[#E8EDF2]">
              MediCore<span class="text-[#4FA8A0]">OS</span>
            </h1>
            <p class="text-xs text-[#5A7A94] mt-1">
              {{ requiereVerificacion ? 'Verificación de seguridad en dos pasos' : (isRegister ? 'Registro clínico de nuevo paciente' : 'Acceso seguro al sistema clínico') }}
            </p>
          </div>

          <!-- Alert Notifications -->
          <div *ngIf="errorMessage" class="mb-5 p-3 rounded-lg text-xs bg-rose-950/50 border border-rose-800/60 text-rose-300 text-center animate-fade-in flex items-center justify-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <div *ngIf="successMessage" class="mb-5 p-3 rounded-lg text-xs bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-center animate-fade-in flex items-center justify-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ successMessage }}</span>
          </div>

          <!-- STEP 1: VERIFICACIÓN OTP POR CORREO -->
          <div *ngIf="requiereVerificacion" class="space-y-4 animate-fade-in">
            <div class="p-3.5 rounded-xl bg-secondary/60 border border-border text-center space-y-1">
              <p class="text-xs text-foreground font-semibold">Protección de Datos Clínicos</p>
              <p class="text-[11px] text-muted-foreground">
                Hemos enviado un código de seguridad de 6 dígitos a <span class="text-primary font-mono font-bold">{{ emailParaVerificar }}</span>.
              </p>
              <p class="text-[11px] text-muted-foreground mt-1">
                Revisa tu bandeja de entrada o carpeta de spam e introduce el código a continuación.
              </p>
            </div>

            <div>
              <label class="text-xs text-[#8BA3B8] mb-1.5 block">Código de verificación (6 dígitos)</label>
              <input
                type="text"
                maxlength="6"
                [(ngModel)]="codigoVerificacion"
                name="codigoVerificacion"
                class="glass-input font-mono text-center tracking-widest text-lg font-bold"
                placeholder="000000"
                required
              />
            </div>

            <button
              type="button"
              (click)="onVerificarCodigo()"
              [disabled]="loading || codigoVerificacion.length !== 6"
              class="glass-btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#4FA8A0]/15"
            >
              <span *ngIf="loading" class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
              <span *ngIf="!loading">Verificar y Entrar</span>
            </button>

            <div class="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                (click)="onReenviarCodigo()"
                class="text-primary hover:underline cursor-pointer"
              >
                Reenviar código
              </button>
              <button
                type="button"
                (click)="requiereVerificacion = false; errorMessage = ''"
                class="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Volver
              </button>
            </div>

            <!-- Alternativa: Validar con Google -->
            <div class="pt-4 border-t border-white/[0.06] text-center space-y-2">
              <p class="text-[11px] text-muted-foreground">O verifica al instante vinculando tu cuenta de Google:</p>
              <button
                type="button"
                (click)="abrirModalGoogle(emailParaVerificar)"
                class="w-full py-2 px-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-foreground text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <svg class="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Verificar con Google</span>
              </button>
            </div>
          </div>

          <!-- STEP 2: FORMULARIO PRINCIPAL (LOGIN O REGISTRO) -->
          <div *ngIf="!requiereVerificacion" class="space-y-4">
            <!-- Google Button (Abre diálogo Google Sign-In) -->
            <button
              type="button"
              (click)="abrirModalGoogle()"
              class="w-full py-2.5 px-3 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-foreground text-xs font-semibold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
            >
              <svg class="size-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{{ isRegister ? 'Registrarse con cuenta Google' : 'Continuar con Google' }}</span>
            </button>

            <div class="flex items-center gap-3 my-2">
              <div class="h-px bg-white/[0.08] flex-1"></div>
              <span class="text-[10px] uppercase font-semibold text-[#5A7A94] tracking-wider">o con formulario</span>
              <div class="h-px bg-white/[0.08] flex-1"></div>
            </div>

            <form (ngSubmit)="onSubmit()" class="space-y-3.5">
              <!-- CAMPOS COMPLETOS PARA REGISTRO DE PACIENTE -->
              <ng-container *ngIf="isRegister">
                <div>
                  <label class="text-xs text-[#8BA3B8] mb-1 block">Nombre completo *</label>
                  <input
                    type="text"
                    [(ngModel)]="registerForm.nombre_completo"
                    name="nombre_completo"
                    class="glass-input"
                    placeholder="Ej. Juan Pérez Gómez"
                    required
                  />
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-xs text-[#8BA3B8] mb-1 block">Tipo Doc. *</label>
                    <select [(ngModel)]="registerForm.documento_tipo" name="documento_tipo"
                      class="glass-input cursor-pointer">
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PAS">PAS</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="text-xs text-[#8BA3B8] mb-1 block">Número de documento *</label>
                    <input
                      type="text"
                      [(ngModel)]="registerForm.documento_numero"
                      name="documento_numero"
                      class="glass-input"
                      placeholder="1098765432"
                      required
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs text-[#8BA3B8] mb-1 block">Fecha nacimiento</label>
                    <input
                      type="date"
                      [(ngModel)]="registerForm.fecha_nacimiento"
                      name="fecha_nacimiento"
                      class="glass-input text-xs"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-[#8BA3B8] mb-1 block">Teléfono / Celular</label>
                    <input
                      type="tel"
                      [(ngModel)]="registerForm.telefono"
                      name="telefono"
                      class="glass-input"
                      placeholder="300 123 4567"
                    />
                  </div>
                </div>
              </ng-container>

              <div>
                <label class="text-xs text-[#8BA3B8] mb-1 block">Correo electrónico *</label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  class="glass-input"
                  placeholder="tu_correo@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label class="text-xs text-[#8BA3B8] mb-1 block">Contraseña *</label>
                <div class="relative">
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    class="glass-input pr-10"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7A94] hover:text-[#8BA3B8] transition-colors cursor-pointer"
                  >
                    <svg *ngIf="!showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg *ngIf="showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Confirmar contraseña solo en registro -->
              <div *ngIf="isRegister">
                <label class="text-xs text-[#8BA3B8] mb-1 block">Confirmar contraseña *</label>
                <input
                  type="password"
                  [(ngModel)]="registerForm.password_confirmacion"
                  name="password_confirmacion"
                  class="glass-input"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="loading || !email || !password"
                class="glass-btn-primary w-full py-2.5 text-sm mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#4FA8A0]/15"
              >
                <span *ngIf="loading" class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                <span *ngIf="!loading" class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>{{ isRegister ? 'Registrarme y recibir código' : 'Iniciar sesión' }}</span>
                </span>
                <span *ngIf="loading">{{ isRegister ? 'Registrando...' : 'Ingresando...' }}</span>
              </button>
            </form>

            <!-- Toggle Register / Login -->
            <div class="mt-4 text-center text-xs text-[#5A7A94]">
              {{ isRegister ? '¿Ya tienes una cuenta registrada?' : '¿No tienes cuenta registrada?' }}
              <button
                type="button"
                (click)="isRegister = !isRegister; errorMessage = ''; successMessage = ''"
                class="text-[#4FA8A0] hover:underline ml-1 font-medium cursor-pointer"
              >
                {{ isRegister ? 'Iniciar sesión' : 'Registrarse como paciente' }}
              </button>
            </div>

            <!-- Quick Demo Login Accounts -->
            <div *ngIf="!isRegister" class="mt-6 pt-5 border-t border-white/[0.06]">
              <div class="flex items-center justify-center gap-1.5 text-xs text-[#5A7A94] mb-3">
                <svg class="w-3.5 h-3.5 text-[#4FA8A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Acceso rápido (Cuentas Demo)</span>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="fillDemo('paciente@medicore.com', 'Password123!')"
                  class="glass-btn-secondary text-xs py-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4FA8A0]/40 transition-all"
                >
                  <svg class="w-3.5 h-3.5 text-[#4FA8A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Paciente</span>
                </button>

                <button
                  type="button"
                  (click)="fillDemo('medico@medicore.com', 'Password123!')"
                  class="glass-btn-secondary text-xs py-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4FA8A0]/40 transition-all"
                >
                  <svg class="w-3.5 h-3.5 text-[#4FA8A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Doctor</span>
                </button>

                <button
                  type="button"
                  (click)="fillDemo('admin@medicore.com', 'Password123!')"
                  class="glass-btn-secondary text-xs py-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4FA8A0]/40 transition-all"
                >
                  <svg class="w-3.5 h-3.5 text-[#4FA8A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- GOOGLE SIGN-IN MODAL (Diálogo de autenticación Google) -->
      <div *ngIf="mostrarModalGoogle" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#162134] p-6 shadow-2xl space-y-4">
          <!-- Google Header -->
          <div class="text-center space-y-2">
            <svg class="size-8 mx-auto" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h3 class="text-base font-bold text-foreground">Acceder con Google</h3>
            <p class="text-xs text-muted-foreground">Elige o ingresa tu cuenta para continuar en MediCore OS</p>
          </div>

          <!-- Inputs -->
          <div class="space-y-3 text-xs text-left">
            <div>
              <label class="text-muted-foreground mb-1 block font-medium">Correo de Google (&#64;gmail.com o institucional) *</label>
              <input
                type="email"
                [(ngModel)]="googleAccountEmail"
                placeholder="tu_cuenta@gmail.com"
                class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="text-muted-foreground mb-1 block font-medium">Nombre en tu cuenta de Google *</label>
              <input
                type="text"
                [(ngModel)]="googleAccountNombre"
                placeholder="Tu Nombre Completo"
                class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div class="p-3 rounded-lg bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground">
              Google compartirá de forma segura tu correo verificado y tu nombre con MediCore Clinical OS.
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
            <button
              type="button"
              (click)="mostrarModalGoogle = false"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmarLoginGoogle()"
              [disabled]="!googleAccountEmail.trim() || loading"
              class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
            >
              <span *ngIf="loading" class="size-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
              <span>Continuar con Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);

  isRegister = false;
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Formulario vacío por defecto (no fuerza paciente de prueba)
  email = '';
  password = '';

  // Verificación OTP
  requiereVerificacion = false;
  emailParaVerificar = '';
  codigoVerificacion = '';

  // Registro Completo de Paciente
  registerForm = {
    nombre_completo: '',
    documento_tipo: 'CC',
    documento_numero: '',
    fecha_nacimiento: '',
    telefono: '',
    password_confirmacion: '',
  };

  // Google OAuth Modal
  mostrarModalGoogle = false;
  googleAccountEmail = '';
  googleAccountNombre = '';

  fillDemo(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.onSubmit();
  }

  abrirModalGoogle(prefillEmail?: string) {
    this.googleAccountEmail = prefillEmail || (this.email.includes('@') ? this.email : '');
    this.googleAccountNombre = this.registerForm.nombre_completo || '';
    this.mostrarModalGoogle = true;
    this.errorMessage = '';
  }

  confirmarLoginGoogle() {
    if (!this.googleAccountEmail.trim()) return;
    this.loading = true;
    this.errorMessage = '';

    const googleEmail = this.googleAccountEmail.trim().toLowerCase();
    const googleNombre = this.googleAccountNombre.trim() || googleEmail.split('@')[0].replace('.', ' ');

    this.auth.loginConGoogle(googleEmail, googleNombre).subscribe({
      next: () => {
        this.loading = false;
        this.mostrarModalGoogle = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Error al autenticar con Google.';
      }
    });
  }

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isRegister) {
      if (!this.registerForm.nombre_completo.trim()) {
        this.loading = false;
        this.errorMessage = 'El nombre completo es obligatorio.';
        return;
      }
      if (!this.registerForm.documento_numero.trim()) {
        this.loading = false;
        this.errorMessage = 'El número de documento de identidad es obligatorio.';
        return;
      }
      if (this.password !== this.registerForm.password_confirmacion) {
        this.loading = false;
        this.errorMessage = 'Las contraseñas no coinciden.';
        return;
      }

      this.auth.register({
        correo: this.email.trim().toLowerCase(),
        password: this.password,
        nombre_completo: this.registerForm.nombre_completo.trim(),
        documento_tipo: this.registerForm.documento_tipo,
        documento_numero: this.registerForm.documento_numero.trim(),
        fecha_nacimiento: this.registerForm.fecha_nacimiento || null,
        telefono: this.registerForm.telefono.trim(),
      }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.requiere_verificacion) {
            this.requiereVerificacion = true;
            this.emailParaVerificar = res.correo || this.email;
            this.successMessage = 'Código de verificación de 6 dígitos enviado a tu correo.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.detail || err?.error?.rol?.[0] || err?.error?.correo?.[0] || 'Error al registrar la cuenta.';
        }
      });
    } else {
      this.auth.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err?.error?.requiere_verificacion) {
            this.requiereVerificacion = true;
            this.emailParaVerificar = err.error.correo || this.email;
            this.errorMessage = 'Debes verificar tu correo para ingresar a la plataforma.';
          } else {
            this.errorMessage = err?.error?.detail || 'Correo o contraseña incorrectos. Verifica tus credenciales.';
          }
        }
      });
    }
  }

  onVerificarCodigo() {
    if (!this.emailParaVerificar || this.codigoVerificacion.length !== 6) return;
    this.loading = true;
    this.errorMessage = '';

    this.auth.verificarCodigo(this.emailParaVerificar, this.codigoVerificacion).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Código de verificación inválido o expirado.';
      }
    });
  }

  onReenviarCodigo() {
    if (!this.emailParaVerificar) return;
    this.auth.reenviarCodigo(this.emailParaVerificar).subscribe({
      next: (res) => {
        this.successMessage = 'Se ha generado y enviado un nuevo código a tu correo.';
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail || 'No se pudo reenviar el código.';
      }
    });
  }
}
