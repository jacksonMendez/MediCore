import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;
declare const grecaptcha: any;

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
                (click)="volverAlFormulario()"
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
                (click)="iniciarGoogleReal()"
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
            <!-- Google Button (Abre Google Sign-In real) -->
            <button
              type="button"
              (click)="iniciarGoogleReal()"
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
                  [placeholder]="isRegister ? 'tu_correo_real@ejemplo.com' : 'tu_correo@ejemplo.com'"
                  required
                />
                <p *ngIf="isRegister" class="text-[11px] text-[#4FA8A0] mt-1 flex items-center gap-1.5 font-medium">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Debe ser un correo real: recibirás un código OTP de 6 dígitos obligatorio para ingresar.</span>
                </p>
              </div>

              <div>
                <label class="text-xs text-[#8BA3B8] mb-1 block">Contraseña *</label>
                <div class="relative flex items-center">
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    class="glass-input pr-11"
                    [placeholder]="isRegister ? 'Mínimo 8 caracteres (A-Z, a-z, 0-9, #)' : 'Ingresa tu contraseña'"
                    required
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                    [title]="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8BA3B8] hover:text-[#4FA8A0] transition-colors rounded-lg hover:bg-white/[0.08] focus:outline-none cursor-pointer z-10"
                  >
                    <svg *ngIf="!showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg *ngIf="showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
                <p *ngIf="isRegister" class="text-[10px] text-[#5A7A94] mt-1">
                  Mínimo 8 caracteres: requiere mayúscula, minúscula, número y un símbolo (ej: !&#64;#$).
                </p>
              </div>

              <!-- Confirmar contraseña solo en registro -->
              <div *ngIf="isRegister">
                <label class="text-xs text-[#8BA3B8] mb-1 block">Confirmar contraseña *</label>
                <div class="relative flex items-center">
                  <input
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    [(ngModel)]="registerForm.password_confirmacion"
                    name="password_confirmacion"
                    class="glass-input pr-11"
                    placeholder="Repite la contraseña"
                    required
                  />
                  <button
                    type="button"
                    (click)="showConfirmPassword = !showConfirmPassword"
                    [attr.aria-label]="showConfirmPassword ? 'Ocultar confirmación' : 'Ver confirmación'"
                    [title]="showConfirmPassword ? 'Ocultar confirmación' : 'Ver confirmación'"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8BA3B8] hover:text-[#4FA8A0] transition-colors rounded-lg hover:bg-white/[0.08] focus:outline-none cursor-pointer z-10"
                  >
                    <svg *ngIf="!showConfirmPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg *ngIf="showConfirmPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Verificación Oficial Google reCAPTCHA v2 -->
              <div class="my-4 flex flex-col items-center justify-center">
                <div id="recaptcha-widget" class="min-h-[78px] flex items-center justify-center"></div>
                <div *ngIf="!captchaToken" class="text-[11px] text-[#5A7A94] mt-1.5 flex items-center gap-1.5 select-none">
                  <svg class="w-3.5 h-3.5 text-[#4FA8A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Verificación humana protegida por Google reCAPTCHA</span>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="loading || !email || !password || !captchaToken"
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
                (click)="toggleModoRegistro()"
                class="text-[#4FA8A0] hover:underline ml-1 font-medium cursor-pointer"
              >
                {{ isRegister ? 'Iniciar sesión' : 'Registrarse' }}
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
    </div>
  `
})
export class LoginComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);

  isRegister = false;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Google reCAPTCHA v2 Oficial
  recaptchaWidgetId: any = null;
  captchaToken = '';
  recaptchaSiteKey = environment.recaptchaSiteKey;

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

  // Google OAuth Oficial
  googleClientId = environment.googleClientId || localStorage.getItem('medicore_google_client_id') || '';

  ngOnInit() {
    this.initGoogleGsi();
    try {
      if (localStorage.getItem('medicore_logout_reason') === 'inactividad') {
        this.errorMessage = '⚠️ Tu sesión se cerró automáticamente por inactividad para proteger tus datos médicos.';
        localStorage.removeItem('medicore_logout_reason');
      }
    } catch {}
  }

  initGoogleGsi() {
    const tryInit = (retries = 10) => {
      if (typeof google !== 'undefined' && google?.accounts?.id && this.googleClientId) {
        try {
          google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (response: any) => this.handleGoogleCredential(response)
          });
        } catch (e) {
          console.warn('Google GSI init:', e);
        }
      } else if (retries > 0) {
        setTimeout(() => tryInit(retries - 1), 300);
      }
    };
    tryInit();
  }

  iniciarGoogleReal() {
    this.errorMessage = '';

    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      this.errorMessage = 'Google Identity Services se está cargando. Por favor presiona de nuevo en 2 segundos.';
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            this.errorMessage = `Error de Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`;
            return;
          }
          if (tokenResponse?.access_token) {
            this.loading = true;
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const info = await res.json();
              if (info?.email) {
                this.auth.loginConGoogle(info.email, info.name || info.given_name || '').subscribe({
                  next: () => {
                    this.loading = false;
                  },
                  error: (err) => {
                    this.loading = false;
                    this.errorMessage = err?.error?.detail || 'Error al autenticar en el servidor MediCore.';
                  }
                });
              } else {
                this.loading = false;
                this.errorMessage = 'No se pudo obtener el correo de la cuenta de Google.';
              }
            } catch (e: any) {
              this.loading = false;
              this.errorMessage = 'Error al consultar cuenta de Google: ' + (e.message || e);
            }
          }
        }
      });
      client.requestAccessToken();
    } catch (err: any) {
      this.errorMessage = `No se pudo abrir la ventana de Google: ${err?.message || err}`;
    }
  }

  handleGoogleCredential(response: any) {
    if (response?.credential) {
      this.loading = true;
      this.auth.loginConGoogle('', '', response.credential).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.detail || 'Error al verificar credencial de Google.';
        }
      });
    }
  }

  ngAfterViewInit() {
    this.renderRecaptcha();
  }

  renderRecaptcha(retries = 25) {
    if (this.requiereVerificacion) return;

    const container = document.getElementById('recaptcha-widget');
    if (!container) {
      if (retries > 0) {
        setTimeout(() => this.renderRecaptcha(retries - 1), 200);
      }
      return;
    }

    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      try {
        if (this.recaptchaWidgetId !== null) {
          return;
        }

        if (container.childElementCount === 0) {
          this.recaptchaWidgetId = grecaptcha.render('recaptcha-widget', {
            sitekey: this.recaptchaSiteKey,
            theme: 'dark',
            callback: (token: string) => {
              this.captchaToken = token;
              this.errorMessage = '';
            },
            'expired-callback': () => {
              this.captchaToken = '';
            },
            'error-callback': () => {
              this.captchaToken = '';
            }
          });
        }
      } catch (e) {
        console.warn('reCAPTCHA render:', e);
      }
    } else if (retries > 0) {
      setTimeout(() => this.renderRecaptcha(retries - 1), 250);
    }
  }

  resetRecaptcha() {
    if (typeof grecaptcha !== 'undefined' && this.recaptchaWidgetId !== null) {
      try {
        grecaptcha.reset(this.recaptchaWidgetId);
      } catch (e) {}
    }
    this.captchaToken = '';
  }

  toggleModoRegistro() {
    this.isRegister = !this.isRegister;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetRecaptcha();
  }

  volverAlFormulario() {
    this.requiereVerificacion = false;
    this.recaptchaWidgetId = null;
    this.captchaToken = '';
    this.errorMessage = '';
    setTimeout(() => this.renderRecaptcha(), 150);
  }

  fillDemo(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.captchaToken = '';
    this.resetRecaptcha();
    this.errorMessage = '';
    this.successMessage = 'Credenciales cargadas. Por favor marca la casilla "No soy un robot" de Google para poder ingresar.';
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = "Por favor ingresa tu correo y contraseña.";
      return;
    }

    const emailTrimmed = this.email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailTrimmed)) {
      this.errorMessage = "Por favor ingresa un correo electrónico válido y real (ej: usuario@gmail.com).";
      return;
    }

    if (this.isRegister) {
      const dominio = emailTrimmed.split('@')[1] || '';
      const dominiosDesechables = [
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'yopmail.com', 'throwawaymail.com', 'fake.com', 'dispostable.com',
        'sharklasers.com', 'trashmail.com', 'temp-mail.org', 'getairmail.com',
        'mohmal.com', 'generator.email'
      ];
      if (dominiosDesechables.includes(dominio)) {
        this.errorMessage = "Debes registrar un correo electrónico real al que tengas acceso. No se permiten correos temporales ni desechables ya que recibirás un código de verificación de 6 dígitos para activar tu cuenta.";
        return;
      }
    }

    if (!this.captchaToken) {
      this.errorMessage = "Debes completar la verificación 'No soy un robot' antes de poder ingresar.";
      return;
    }
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
      // Validar complejidad de contraseña (8+ caracteres, mayúscula, minúscula, número, especial)
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passRegex.test(this.password)) {
        this.loading = false;
        this.errorMessage = 'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un símbolo especial (ej: !@#$).';
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
        recaptcha_token: this.captchaToken,
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
          this.resetRecaptcha();
          this.errorMessage = err?.error?.detail || err?.error?.rol?.[0] || err?.error?.correo?.[0] || 'Error al registrar la cuenta.';
        }
      });
    } else {
      this.auth.login(this.email.trim(), this.password, this.captchaToken).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.resetRecaptcha();
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
