import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-copiloto',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <!-- Sidebar de MediCore -->
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header
          [title]="'Copiloto Administrativo — ' + adminName"
          subtitle="Centro de mando ejecutivo: finanzas, transferencias, citas, médicos, sedes y auditoría">
        </app-header>

        <main class="flex-1 min-h-0 flex flex-col p-4 lg:p-6 overflow-hidden">
          <div class="flex flex-col flex-1 h-full min-h-0 rounded-2xl border border-border bg-card/70 backdrop-blur-md shadow-2xl overflow-hidden">
            <!-- Executive Chat Header -->
            <div class="px-5 py-3.5 border-b border-border/80 bg-card/90 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <span class="grid size-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm text-lg">
                    👑
                  </span>
                  <span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card"></span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-display text-sm font-bold text-foreground">MediCore Admin Copilot</h3>
                    <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-primary/20 text-amber-300 border border-amber-500/30">
                      🛡️ Comando Ejecutivo Institucional
                    </span>
                  </div>
                  <p class="text-[11px] text-muted-foreground mt-0.5">
                    Asistente de gobernanza clínica, supervisión financiera y gestión de recursos en tiempo real
                  </p>
                </div>
              </div>

              <!-- Header Action Controls -->
              <div class="flex items-center gap-2">
                <!-- Botón de basurita para borrar la sesión administrativa actual -->
                <button
                  *ngIf="chat.activeSessionId()"
                  (click)="borrarConsultaActual()"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                  title="Eliminar esta consulta administrativa del historial">
                  <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Borrar chat</span>
                </button>

                <!-- Ir al Panel de Administración -->
                <button
                  (click)="irPanelAdmin()"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition-all cursor-pointer">
                  <svg class="size-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Panel Maestro</span>
                </button>
              </div>
            </div>

            <!-- Messages Stream Area -->
            <div #scrollContainer class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <ng-container *ngFor="let msg of chat.messages()">
                <!-- Admin message -->
                <div *ngIf="msg.emisor === 'usuario'" class="flex justify-end">
                  <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 px-4 py-3 text-sm text-white shadow-md space-y-1">
                    <div class="flex items-center justify-between gap-2 border-b border-white/20 pb-1 mb-1">
                      <span class="text-[10px] uppercase font-bold tracking-wider text-amber-200 flex items-center gap-1">
                        <span>👑</span>
                        <span>Administrador — {{ adminName }}</span>
                      </span>
                    </div>
                    <p class="whitespace-pre-wrap leading-relaxed">{{ msg.contenido }}</p>
                  </div>
                </div>

                <!-- Admin Copilot Assistant message -->
                <div *ngIf="msg.emisor === 'asistente'" class="flex gap-3 max-w-[90%]">
                  <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 self-start mt-0.5 shadow-sm text-sm">
                    👑
                  </span>

                  <div class="space-y-2 flex-1">
                    <div class="rounded-2xl rounded-tl-sm bg-card border border-border/80 px-4 py-3.5 text-sm text-foreground shadow-md relative group">
                      <p class="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{{ msg.contenido }}</p>

                      <!-- Botón para copiar reporte -->
                      <button
                        (click)="copiarTexto(msg.contenido)"
                        class="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[10px] text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Copiar reporte o indicador">
                        <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{{ textoCopiado === msg.contenido ? '¡Copiado!' : 'Copiar' }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Error message -->
                <div *ngIf="msg.emisor === 'sistema'" class="flex justify-center">
                  <div class="rounded-xl bg-destructive/15 border border-destructive/30 px-3.5 py-2 text-xs text-destructive flex items-center gap-2">
                    <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ msg.contenido }}</span>
                  </div>
                </div>
              </ng-container>

              <!-- Typing Indicator -->
              <div *ngIf="chat.loading()" class="flex items-center gap-2.5 text-amber-400 text-xs p-2 animate-fade-in">
                <span class="size-2 rounded-full bg-amber-400 animate-ping"></span>
                <span class="font-medium">MediCore Admin Copilot procesando análisis institucional...</span>
              </div>
            </div>

            <!-- Suggestion Pills Exclusivas para el Administrador -->
            <div class="px-5 py-2.5 border-t border-border/50 bg-card/50 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
              <span class="text-muted-foreground text-[11px] font-semibold shrink-0 flex items-center gap-1">
                <span>⚡</span>
                <span>Comandos Rápidos:</span>
              </span>
              <button
                *ngFor="let s of adminSuggestions"
                (click)="enviarSugerencia(s.prompt)"
                class="shrink-0 px-3 py-1 rounded-full bg-secondary hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-muted-foreground border border-border/70 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium">
                <span>{{ s.icono }}</span>
                <span>{{ s.etiqueta }}</span>
              </button>
            </div>

            <!-- Admin Prompt Input Form -->
            <div class="p-4 border-t border-border bg-card shrink-0">
              <form (ngSubmit)="enviarMensaje()" class="flex items-end gap-2.5">
                <div class="flex-1 relative">
                  <textarea
                    [(ngModel)]="draft"
                    name="draft"
                    (keydown.enter)="onEnter($event)"
                    rows="1"
                    placeholder="Consulta recaudos financieros, transferencias pendientes, citas, sedes o auditoría..."
                    class="w-full max-h-36 min-h-11 resize-none rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-black font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                    style="color: #000000 !important; background-color: #ffffff !important;">
                  </textarea>
                </div>

                <button
                  type="submit"
                  [disabled]="!draft.trim() || chat.loading()"
                  class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  title="Enviar consulta administrativa">
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  `
})
export class AdminCopilotoComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  chat = inject(ChatService);
  private auth = inject(AuthService);
  private router = inject(Router);

  draft: string = '';
  textoCopiado: string | null = null;

  adminSuggestions = [
    { icono: '📊', etiqueta: 'Métricas y recaudos globales', prompt: 'Muéstrame el balance general de recaudos en COP, pagos y métricas de la clínica.' },
    { icono: '💳', etiqueta: 'Transferencias por autorizar', prompt: '¿Cuáles son los pagos y comprobantes de transferencia que están pendientes de autorización?' },
    { icono: '📅', etiqueta: 'Resumen operativo de citas', prompt: 'Dame un resumen operativo de todas las citas institucionales y sus estados.' },
    { icono: '🏥', etiqueta: 'Sedes y especialidades', prompt: '¿Cómo está conformada la infraestructura de sedes y especialidades médicas activas?' },
    { icono: '🩺', etiqueta: 'Disponibilidad médica', prompt: 'Consultar disponibilidad médica y ocupación de turnos por especialidad.' },
    { icono: '📢', etiqueta: 'Estado de PQR y garantías', prompt: '¿Cuántas solicitudes de PQR o reembolso de dinero tenemos registradas?' },
  ];

  get adminName(): string {
    return this.auth.currentUser()?.nombre_completo || 'Administrador Central';
  }

  ngOnInit() {
    this.chat.loadSessions().subscribe();
    if (this.chat.messages().length === 0) {
      this.chat.resetToWelcome();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    event.preventDefault();
    this.enviarMensaje();
  }

  enviarMensaje() {
    const text = this.draft.trim();
    if (!text || this.chat.loading()) return;
    this.draft = '';
    this.chat.sendMessage(text).subscribe();
  }

  enviarSugerencia(prompt: string) {
    this.draft = '';
    this.chat.sendMessage(prompt).subscribe();
  }

  borrarConsultaActual() {
    const activeId = this.chat.activeSessionId();
    if (!activeId) return;
    if (confirm('¿Deseas eliminar esta consulta administrativa del historial de chat?')) {
      this.chat.deleteSession(activeId).subscribe();
    }
  }

  irPanelAdmin() {
    this.router.navigate(['/admin']);
  }

  copiarTexto(texto: string) {
    if (!texto) return;
    try {
      navigator.clipboard.writeText(texto);
      this.textoCopiado = texto;
      setTimeout(() => this.textoCopiado = null, 3000);
    } catch {}
  }
}
