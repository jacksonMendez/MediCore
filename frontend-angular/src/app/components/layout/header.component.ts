import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="shrink-0 flex min-h-20 items-center justify-between gap-4 border-b border-border px-5 lg:px-8 bg-card/40 backdrop-blur-sm">
      <div>
        <h1 class="font-display text-xl font-semibold text-foreground lg:text-2xl">{{ title }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Date pill -->
        <div class="hidden items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded-full md:flex border border-border/50">
          <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{{ todayFormatted }}</span>
        </div>

        <!-- Notification bell -->
        <button class="relative p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-label="Notificaciones">
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span class="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full animate-pulse"></span>
        </button>

        <!-- User profile summary -->
        <div class="hidden h-9 items-center gap-2.5 border-l border-border pl-3 sm:flex">
          <span class="grid size-8 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary border border-primary/30">
            {{ userInitials }}
          </span>
          <div class="text-xs">
            <p class="font-semibold text-foreground leading-tight">{{ userName }}</p>
            <p class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span class="size-1.5 rounded-full bg-emerald-400 animate-ping"></span> En línea
            </p>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input() title: string = 'MediCore OS';
  @Input() subtitle: string = 'Sistema Clínico Asistido por IA';

  private auth = inject(AuthService);

  get userName(): string {
    return this.auth.currentUser()?.nombre_completo || 'Usuario';
  }

  get userInitials(): string {
    const name = this.userName;
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('') || 'MC';
  }

  get todayFormatted(): string {
    const date = new Date();
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
}
