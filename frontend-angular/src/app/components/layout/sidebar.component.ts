import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="w-64 shrink-0 flex flex-col h-screen border-r border-border bg-sidebar select-none">
      <!-- Brand Logo -->
      <div class="p-5 flex items-center justify-between border-b border-border/80">
        <div class="flex items-center gap-3">
          <div class="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <div class="font-display text-base font-bold text-foreground tracking-tight">MediCore</div>
            <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Clinical OS</div>
          </div>
        </div>
      </div>

      <!-- Navigation links -->
      <nav class="p-3 space-y-1">
        <!-- Paciente Views -->
        <ng-container *ngIf="userRole === 'paciente' || userRole === 'admin'">
          <a routerLink="/paciente" routerLinkActive="bg-primary/15 text-primary border-primary" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Asistente y Chat</span>
          </a>

          <a routerLink="/citas" routerLinkActive="bg-primary/15 text-primary border-primary"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Mis Citas</span>
          </a>

          <a routerLink="/pagos" routerLinkActive="bg-primary/15 text-primary border-primary"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Pagos y Facturación</span>
          </a>
        </ng-container>

        <!-- Médico Views -->
        <ng-container *ngIf="userRole === 'medico' || userRole === 'admin'">
          <a routerLink="/medico" routerLinkActive="bg-primary/15 text-primary border-primary"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Agenda del Doctor</span>
          </a>
        </ng-container>

        <!-- Admin Views -->
        <ng-container *ngIf="userRole === 'admin'">
          <a routerLink="/admin" routerLinkActive="bg-primary/15 text-primary border-primary"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Panel Administrativo</span>
          </a>
        </ng-container>
      </nav>

      <!-- Chat sessions history -->
      <div class="flex-1 min-h-0 flex flex-col px-3 py-2 border-t border-border/60">
        <div class="flex items-center justify-between mb-2 px-2">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial Chat</span>
          <button (click)="newChat()" class="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 cursor-pointer transition-colors" title="Iniciar nueva consulta">
            <span>+ Nuevo</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
          <button *ngFor="let s of chat.sessions()"
            (click)="selectSession(s.id)"
            [class.bg-secondary]="chat.activeSessionId() === s.id"
            [class.text-foreground]="chat.activeSessionId() === s.id"
            [class.text-muted-foreground]="chat.activeSessionId() !== s.id"
            class="w-full text-left p-2 rounded-md hover:bg-secondary/70 hover:text-foreground transition-colors truncate flex items-center gap-2 cursor-pointer">
            <svg class="size-3.5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span class="truncate">{{ s.titulo || 'Consulta ' + (s.creado_en | date:'shortTime') }}</span>
          </button>

          <div *ngIf="chat.sessions().length === 0" class="p-3 text-center text-muted-foreground text-[11px] italic">
            Sin sesiones previas
          </div>
        </div>
      </div>

      <!-- User footer & logout -->
      <div class="p-3 border-t border-border/80 bg-sidebar/80">
        <div class="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
          <div class="flex items-center gap-2.5 truncate">
            <div class="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {{ userInitials }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-foreground truncate">{{ userName }}</p>
              <p class="text-[10px] text-muted-foreground capitalize">{{ userRole }}</p>
            </div>
          </div>

          <button (click)="logout()" class="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Cerrar sesión">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  private auth = inject(AuthService);
  chat = inject(ChatService);
  private router = inject(Router);

  ngOnInit() {
    this.chat.loadSessions().subscribe();
  }

  get userRole(): string {
    return this.auth.userRole() || 'paciente';
  }

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

  newChat() {
    this.chat.newChat();
    this.router.navigate(['/paciente']);
  }

  selectSession(id: string) {
    this.chat.selectSession(id);
    this.router.navigate(['/paciente']);
  }

  logout() {
    this.auth.logout();
  }
}
