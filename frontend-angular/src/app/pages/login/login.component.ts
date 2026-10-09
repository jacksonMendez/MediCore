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
      <!-- Background Ambient Orbs (Matching Original React Front) -->
      <div class="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#4FA8A0]/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#1A2736]/30 blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md relative z-10 my-8">
        <!-- Central Glass Card (Exact original glass-panel-strong) -->
        <div class="glass-panel-strong p-8 sm:p-10 shadow-2xl border border-white/[0.07]">
          <!-- Brand Header -->
          <div class="text-center mb-8">
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
              {{ isRegister ? 'Registro de usuario' : 'Acceso al sistema médico' }}
            </p>
          </div>

          <!-- Error Alert (Matching Original React Front) -->
          <div *ngIf="errorMessage" class="mb-5 p-3 rounded-lg text-xs bg-rose-950/50 border border-rose-800/60 text-rose-300 text-center animate-fade-in flex items-center justify-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Login / Register Form -->
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <ng-container *ngIf="isRegister">
              <div>
                <label class="text-xs text-[#8BA3B8] mb-1.5 block">Nombre completo</label>
                <input
                  type="text"
                  [(ngModel)]="registerForm.nombre_completo"
                  name="nombre_completo"
                  class="glass-input"
                  placeholder="Carlos Mendoza"
                  required
                />
              </div>

              <div>
                <label class="text-xs text-[#8BA3B8] mb-1.5 block">Documento de identidad</label>
                <input
                  type="text"
                  [(ngModel)]="registerForm.documento_numero"
                  name="documento_numero"
                  class="glass-input"
                  placeholder="1098765432"
                  required
                />
              </div>
            </ng-container>

            <div>
              <label class="text-xs text-[#8BA3B8] mb-1.5 block">Correo electrónico</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                class="glass-input"
                placeholder="paciente@medicore.com"
                required
              />
            </div>

            <div>
              <label class="text-xs text-[#8BA3B8] mb-1.5 block">Contraseña</label>
              <div class="relative">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  class="glass-input pr-10"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7A94] hover:text-[#8BA3B8] transition-colors cursor-pointer"
                >
                  <!-- Eye / EyeOff Icon -->
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

            <ng-container *ngIf="isRegister">
              <div>
                <label class="text-xs text-[#8BA3B8] mb-1.5 block">Teléfono</label>
                <input
                  type="tel"
                  [(ngModel)]="registerForm.telefono"
                  name="telefono"
                  class="glass-input"
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div>
                <label class="text-xs text-[#8BA3B8] mb-1.5 block">Rol de cuenta</label>
                <select
                  [(ngModel)]="registerForm.rol"
                  name="rol"
                  class="glass-input cursor-pointer bg-slate-900 text-slate-200"
                >
                  <option value="paciente">Paciente</option>
                  <option value="medico">Médico / Doctor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </ng-container>

            <!-- Submit Button (Clean Medical Teal Accent) -->
            <button
              type="submit"
              [disabled]="loading || !email || !password"
              class="glass-btn-primary w-full py-2.5 text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#4FA8A0]/15"
            >
              <span *ngIf="loading" class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
              <span *ngIf="!loading" class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>{{ isRegister ? 'Crear cuenta' : 'Iniciar sesión' }}</span>
              </span>
              <span *ngIf="loading">{{ isRegister ? 'Registrando...' : 'Ingresando...' }}</span>
            </button>
          </form>

          <!-- Toggle Register / Login -->
          <div class="mt-5 text-center text-xs text-[#5A7A94]">
            {{ isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta registrada?' }}
            <button
              type="button"
              (click)="isRegister = !isRegister; errorMessage = ''"
              class="text-[#4FA8A0] hover:underline ml-1 font-medium cursor-pointer"
            >
              {{ isRegister ? 'Iniciar sesión' : 'Registrarse' }}
            </button>
          </div>

          <!-- Quick Demo Login Accounts (Exact original design) -->
          <div *ngIf="!isRegister" class="mt-6 pt-5 border-t border-white/[0.06]">
            <div class="flex items-center justify-center gap-1.5 text-xs text-[#5A7A94] mb-3">
              <!-- Sparkles Icon -->
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
                <!-- UserCheck Icon -->
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
  `
})
export class LoginComponent {
  private auth = inject(AuthService);

  isRegister = false;
  showPassword = false;
  loading = false;
  errorMessage = '';

  email = 'paciente@medicore.com';
  password = 'Password123!';

  registerForm = {
    nombre_completo: '',
    documento_numero: '',
    telefono: '',
    rol: 'paciente',
  };

  fillDemo(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.onSubmit();
  }

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    if (this.isRegister) {
      this.auth.register({
        correo: this.email,
        password: this.password,
        nombre_completo: this.registerForm.nombre_completo,
        documento_numero: this.registerForm.documento_numero,
        telefono: this.registerForm.telefono,
        rol: this.registerForm.rol,
      }).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.detail || 'Error al registrar la cuenta.';
        }
      });
    } else {
      this.auth.login(this.email, this.password).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.detail || 'Correo o contraseña incorrectos. Verifica tus credenciales.';
        }
      });
    }
  }
}
