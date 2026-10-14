import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-medico-copiloto',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <!-- Sidebar de MediCore -->
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header
          [title]="'Copiloto Clínico del Doctor — ' + doctorName"
          subtitle="Asistente de inteligencia médica: farmacología, interacciones, CIE-10, notas SOAP y agenda">
        </app-header>

        <main class="flex-1 min-h-0 flex flex-col p-4 lg:p-6 overflow-hidden">
          <div class="flex flex-col flex-1 h-full min-h-0 rounded-2xl border border-border bg-card/70 backdrop-blur-md shadow-2xl overflow-hidden">
            <!-- Doctor Workstation Chat Header -->
            <div class="px-5 py-3.5 border-b border-border/80 bg-card/90 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <span class="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm">
                    <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card"></span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-display text-sm font-bold text-foreground">MediCore Doctor Copilot</h3>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🩺 Soporte Clínico Médico
                    </span>
                  </div>
                  <p class="text-[11px] text-muted-foreground mt-0.5">
                    Orientación clínica avanzada, dosificación, CIE-10 y notas SOAP • Especialidad: {{ doctorEspecialidad }}
                  </p>
                </div>
              </div>

              <!-- Header Action Controls -->
              <div class="flex items-center gap-2">
                <!-- Botón de basurita para borrar la sesión médica actual -->
                <button
                  *ngIf="chat.activeSessionId()"
                  (click)="borrarConsultaActual()"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                  title="Eliminar esta consulta médica del historial">
                  <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Borrar consulta</span>
                </button>

                <!-- Ir a agenda -->
                <button
                  (click)="irAgenda()"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition-all cursor-pointer">
                  <svg class="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Ver Mi Agenda</span>
                </button>
              </div>
            </div>

            <!-- Messages Stream Area -->
            <div #scrollContainer class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <ng-container *ngFor="let msg of chat.messages()">
                <!-- Doctor message -->
                <div *ngIf="msg.emisor === 'usuario'" class="flex justify-end">
                  <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm text-white shadow-md space-y-1">
                    <div class="flex items-center justify-between gap-2 border-b border-white/20 pb-1 mb-1">
                      <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-100 flex items-center gap-1">
                        <span>🩺</span>
                        <span>Dr(a). {{ doctorName }}</span>
                      </span>
                    </div>
                    <p class="whitespace-pre-wrap leading-relaxed">{{ msg.contenido }}</p>
                  </div>
                </div>

                <!-- Doctor Copilot Assistant message -->
                <div *ngIf="msg.emisor === 'asistente'" class="flex gap-3 max-w-[90%]">
                  <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start mt-0.5 shadow-sm">
                    <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>

                  <div class="space-y-2 flex-1">
                    <div class="rounded-2xl rounded-tl-sm bg-card border border-border/80 px-4 py-3.5 text-sm text-foreground shadow-md relative group">
                      <p class="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{{ msg.contenido }}</p>

                      <!-- Botón rápido para copiar texto (ideal para notas de evolución SOAP) -->
                      <button
                        (click)="copiarTexto(msg.contenido)"
                        class="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[10px] text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Copiar texto de evolución / prescripción">
                        <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{{ textoCopiado === msg.contenido ? '¡Copiado!' : 'Copiar Nota' }}</span>
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
              <div *ngIf="chat.loading()" class="flex items-center gap-2.5 text-emerald-400 text-xs p-2 animate-fade-in">
                <span class="size-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="font-medium">MediCore Doctor Copilot analizando caso clínico...</span>
              </div>
            </div>

            <!-- Suggestion Pills Exclusivas para el Doctor -->
            <div class="px-5 py-2.5 border-t border-border/50 bg-card/50 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
              <span class="text-muted-foreground text-[11px] font-semibold shrink-0 flex items-center gap-1">
                <span>⚡</span>
                <span>Consultas Rápidas:</span>
              </span>
              <button
                *ngFor="let s of doctorSuggestions"
                (click)="enviarSugerencia(s.prompt)"
                class="shrink-0 px-3 py-1 rounded-full bg-secondary hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 text-muted-foreground border border-border/70 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium">
                <span>{{ s.icono }}</span>
                <span>{{ s.etiqueta }}</span>
              </button>
            </div>

            <!-- Doctor Prompt Input Form -->
            <div class="p-4 border-t border-border bg-card shrink-0">
              <form (ngSubmit)="enviarMensaje()" class="flex items-end gap-2.5">
                <div class="flex-1 relative">
                  <textarea
                    [(ngModel)]="draft"
                    name="draft"
                    (keydown.enter)="onEnter($event)"
                    rows="1"
                    placeholder="Consulta farmacología, códigos CIE-10, notas SOAP, interacciones o agenda de hoy..."
                    class="w-full max-h-36 min-h-11 resize-none rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-black font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                    style="color: #000000 !important; background-color: #ffffff !important;">
                  </textarea>
                </div>

                <button
                  type="submit"
                  [disabled]="!draft.trim() || chat.loading()"
                  class="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  title="Enviar consulta médica">
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
export class MedicoCopilotoComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  chat = inject(ChatService);
  private auth = inject(AuthService);
  private router = inject(Router);

  draft: string = '';
  textoCopiado: string | null = null;

  doctorSuggestions = [
    { icono: '🗓️', etiqueta: 'Programar mi agenda', prompt: 'Deseo programar mi agenda de atención para los lunes de 08:00 a 12:00 en mi sede.' },
    { icono: '⏰', etiqueta: 'Consultar mis horarios', prompt: 'Muéstrame los días y horarios que tengo habilitados actualmente en la base de datos.' },
    { icono: '📅', etiqueta: 'Mi agenda de hoy', prompt: '¿Qué citas tengo programadas para hoy en mi agenda médica?' },
    { icono: '📋', etiqueta: 'Redactar nota SOAP', prompt: 'Ayúdame a redactar una nota de evolución médica en formato SOAP para un paciente con: ' },
    { icono: '💊', etiqueta: 'Interacciones farmacológicas', prompt: 'Verificar interacciones farmacológicas y contraindicaciones de: ' },
    { icono: '🔍', etiqueta: 'Buscar código CIE-10', prompt: '¿Cuál es el código CIE-10 exacto y descripción oficial para: ' },
    { icono: '👥', etiqueta: 'Mis pacientes atendidos', prompt: 'Muéstrame la lista de pacientes que he atendido en consulta médica.' },
    { icono: '⚖️', etiqueta: 'Dosificación y posología', prompt: 'Posología recomendada, ajuste renal y precauciones para: ' },
  ];

  get doctorName(): string {
    return this.auth.currentUser()?.nombre_completo || 'Doctor';
  }

  get doctorEspecialidad(): string {
    const m = (this.auth.currentUser() as any)?.medico;
    return m?.especialidad || 'Especialista Clínico';
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
    if (prompt.endsWith(': ')) {
      this.draft = prompt;
    } else {
      this.draft = '';
      this.chat.sendMessage(prompt).subscribe();
    }
  }

  borrarConsultaActual() {
    const activeId = this.chat.activeSessionId();
    if (!activeId) return;
    if (confirm('¿Deseas eliminar esta consulta médica del historial de chat?')) {
      this.chat.deleteSession(activeId).subscribe();
    }
  }

  irAgenda() {
    this.router.navigate(['/medico']);
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
