import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { AjustesModalComponent } from '../ajustes/ajustes-modal.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, AjustesModalComponent],
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
        <ng-container *ngIf="userRole === 'paciente'">
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
        <ng-container *ngIf="userRole === 'medico'">
          <a routerLink="/medico/copiloto" routerLinkActive="bg-primary/15 text-primary border-primary" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Copiloto Médico IA</span>
          </a>

          <a routerLink="/medico" routerLinkActive="bg-primary/15 text-primary border-primary" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Agenda del Doctor</span>
          </a>
        </ng-container>

        <!-- Admin Views -->
        <ng-container *ngIf="userRole === 'admin'">
          <a routerLink="/admin/copiloto" routerLinkActive="bg-primary/15 text-primary border-primary" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Copiloto Admin IA</span>
          </a>

          <a routerLink="/admin" routerLinkActive="bg-primary/15 text-primary border-primary" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors border-l-2 border-transparent">
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Panel Administrativo</span>
          </a>
        </ng-container>
      </nav>

      <!-- Chat sessions history (visible para todos los roles) -->
      <div class="flex-1 min-h-0 flex flex-col px-3 py-2 border-t border-border/60">
        <div class="flex items-center justify-between mb-2 px-2">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial Chat</span>
          <button (click)="newChat()" class="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 cursor-pointer transition-colors" title="Iniciar nueva consulta">
            <span>+ Nuevo</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
          <div *ngFor="let s of chat.sessions()"
            [class.bg-secondary]="chat.activeSessionId() === s.id"
            class="group flex items-center justify-between gap-1 px-2 py-1 rounded-md hover:bg-secondary/70 transition-colors">
            <button
              (click)="selectSession(s.id)"
              [class.text-foreground]="chat.activeSessionId() === s.id"
              [class.text-muted-foreground]="chat.activeSessionId() !== s.id"
              class="flex-1 text-left truncate flex items-center gap-2 cursor-pointer hover:text-foreground py-1">
              <svg class="size-3.5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span class="truncate">{{ s.titulo || 'Consulta ' + (s.creado_en | date:'shortTime') }}</span>
            </button>

            <!-- Botón de basurita para borrar sesión individual del historial -->
            <button
              type="button"
              (click)="deleteSession($event, s.id)"
              class="opacity-40 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer shrink-0"
              title="Borrar esta conversación del historial">
              <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div *ngIf="chat.sessions().length === 0" class="p-3 text-center text-muted-foreground text-[11px] italic">
            Sin sesiones previas
          </div>
        </div>
      </div>

      <!-- User footer & settings/logout -->
      <div class="p-3 border-t border-border/80 bg-sidebar/80">
        <div class="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
          <div class="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-85 transition-opacity" (click)="mostrarAjustes = true" title="Abrir Ajustes de Cuenta">
            <img *ngIf="avatarUrl" [src]="avatarUrl" class="size-8 shrink-0 rounded-full object-cover border border-primary/50 shadow-sm" alt="Avatar" />
            <div *ngIf="!avatarUrl" class="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {{ userInitials }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-foreground truncate">{{ userName }}</p>
              <p class="text-[10px] text-muted-foreground capitalize">{{ userRole }}</p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button (click)="mostrarAjustes = true" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer" title="Herramienta de Ajustes (Tema, Foto, Cédula)">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button (click)="logout()" class="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Cerrar sesión">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Modal de Ajustes y Personalización -->
    <app-ajustes-modal
      *ngIf="mostrarAjustes"
      (closed)="mostrarAjustes = false"
      (profileUpdated)="loadAvatar()">
    </app-ajustes-modal>
  `
})
export class SidebarComponent implements OnInit {
  private auth = inject(AuthService);
  chat = inject(ChatService);
  private router = inject(Router);

  mostrarAjustes = false;
  avatarUrl: string | null = null;

  ngOnInit() {
    if (this.userRole === 'paciente' || this.userRole === 'medico') {
      this.chat.loadSessions().subscribe();
    }
    this.loadAvatar();
    this.initThemeFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('medicore:avatar-changed', (e: any) => {
        this.avatarUrl = e.detail;
      });
      window.addEventListener('medicore:auth-changed', () => {
        this.loadAvatar();
        if (this.userRole === 'paciente' || this.userRole === 'medico') {
          this.chat.loadSessions().subscribe();
        }
      });
    }
  }

  loadAvatar() {
    const user = this.auth.currentUser();
    if (user) {
      try {
        this.avatarUrl = localStorage.getItem(`medicore_avatar_${user.id}`) || null;
      } catch {}
    } else {
      this.avatarUrl = null;
    }
  }

  initThemeFromStorage() {
    try {
      const mode = localStorage.getItem('medicore_theme');
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
    } catch {}
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
    if (this.userRole === 'admin') {
      this.router.navigate(['/admin/copiloto']);
    } else if (this.userRole === 'medico') {
      this.router.navigate(['/medico/copiloto']);
    } else {
      this.router.navigate(['/paciente']);
    }
  }

  selectSession(id: string) {
    this.chat.selectSession(id);
    if (this.userRole === 'admin') {
      this.router.navigate(['/admin/copiloto']);
    } else if (this.userRole === 'medico') {
      this.router.navigate(['/medico/copiloto']);
    } else {
      this.router.navigate(['/paciente']);
    }
  }

  deleteSession(event: Event, sessionId: string) {
    event.stopPropagation();
    if (confirm('¿Deseas eliminar esta consulta del historial de chat?')) {
      this.chat.deleteSession(sessionId).subscribe();
    }
  }

  logout() {
    this.auth.logout();
  }
}
