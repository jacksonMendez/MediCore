import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-primary selection:text-primary-foreground relative overflow-hidden">
      <!-- Background subtle glow -->
      <div class="absolute -top-40 -left-40 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 size-96 rounded-full bg-accent/20 blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md p-8 rounded-2xl border border-border bg-card/90 backdrop-blur-md shadow-2xl space-y-6 relative z-10">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="mx-auto grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
            <svg class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 class="font-display text-2xl font-bold text-foreground tracking-tight">MediCore OS</h1>
          <p class="text-xs text-muted-foreground">Sistema Clínico Integral con Asistente IA</p>
        </div>

        <!-- Error alert -->
        <div *ngIf="errorMessage" class="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
          <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Correo Electrónico</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </span>
              <input type="email" [(ngModel)]="email" name="email" required
                placeholder="ejemplo@medicore.com"
                class="w-full rounded-lg bg-secondary/80 border border-border pl-10 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Contraseña</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input type="password" [(ngModel)]="password" name="password" required
                placeholder="••••••••••••"
                class="w-full rounded-lg bg-secondary/80 border border-border pl-10 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
            </div>
          </div>

          <button type="submit" [disabled]="loading || !email || !password"
            class="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
            <span *ngIf="loading" class="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'Autenticando...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>

        <!-- Demo accounts quick access -->
        <div class="pt-4 border-t border-border/80">
          <p class="text-[11px] font-semibold text-muted-foreground text-center uppercase tracking-wider mb-2.5">
            Cuentas de Demostración (1 Clic)
          </p>
          <div class="grid grid-cols-3 gap-2">
            <button (click)="fillDemo('paciente@medicore.com', 'MediCore2024!')"
              class="px-2 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-[11px] font-semibold text-primary border border-border text-center transition-colors cursor-pointer">
              Paciente
            </button>
            <button (click)="fillDemo('medico@medicore.com', 'MediCore2024!')"
              class="px-2 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-[11px] font-semibold text-emerald-400 border border-border text-center transition-colors cursor-pointer">
              Médico
            </button>
            <button (click)="fillDemo('admin@medicore.com', 'MediCore2024!')"
              class="px-2 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-[11px] font-semibold text-amber-400 border border-border text-center transition-colors cursor-pointer">
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);

  email = 'paciente@medicore.com';
  password = 'MediCore2024!';
  loading = false;
  errorMessage = '';

  fillDemo(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.onSubmit();
  }

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

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
