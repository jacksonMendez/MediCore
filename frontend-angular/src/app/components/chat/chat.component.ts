import { Component, ElementRef, ViewChild, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatCalendarPickerComponent } from './chat-calendar-picker.component';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatCalendarPickerComponent],
  host: {
    class: 'flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden'
  },
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }
  `],
  template: `
    <div class="flex flex-col flex-1 h-full min-h-0 rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
      <!-- Chat Header -->
      <div class="px-5 py-3.5 border-b border-border/70 bg-card flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="relative">
            <span class="grid size-9 place-items-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card"></span>
          </div>
          <div>
            <h3 class="font-display text-sm font-bold text-foreground">
              {{ auth.userRole() === 'medico' ? 'Copiloto Clínico Médico' : (auth.userRole() === 'admin' ? 'Copiloto Administrativo' : 'Copiloto Clínico IA') }}
            </h3>
            <p class="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>{{ auth.userRole() === 'medico' ? 'Soporte y Práctica Médica' : 'Llama 3.1 & MediCore Engine' }}</span>
              <span class="text-xs">•</span>
              <span class="text-emerald-400">En línea</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Botón de basurita para borrar sesión actual -->
          <button *ngIf="chat.activeSessionId()" (click)="borrarSesionActual()"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-all cursor-pointer"
            title="Borrar esta consulta del historial">
            <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="hidden sm:inline">Borrar chat</span>
          </button>

          <!-- Quick PQR button (solo para pacientes) -->
          <button *ngIf="auth.userRole() === 'paciente'" (click)="solicitarPqr()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer">
            <svg class="size-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>PQR / Reembolso</span>
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div #scrollContainer class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <ng-container *ngFor="let msg of chat.messages()">
          <!-- User message -->
          <div *ngIf="msg.emisor === 'usuario'" class="flex justify-end">
            <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-md">
              <p class="whitespace-pre-wrap leading-relaxed">{{ msg.contenido }}</p>
            </div>
          </div>

          <!-- Assistant message -->
          <div *ngIf="msg.emisor === 'asistente'" class="flex gap-3 max-w-[85%]">
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary border border-primary/30 self-start mt-0.5">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div class="space-y-2">
              <div class="rounded-2xl rounded-tl-sm bg-card border border-border/80 px-4 py-3 text-sm text-foreground shadow-md">
                <p class="whitespace-pre-wrap leading-relaxed">{{ cleanMessageText(msg.contenido) }}</p>
              </div>

              <!-- Interactive Time Slot Buttons (solo para pacientes) -->
              <div *ngIf="auth.userRole() === 'paciente' && getTimeSlots(msg).length > 0" class="flex flex-wrap gap-2 pt-1">
                <button *ngFor="let slot of getTimeSlots(msg)"
                  (click)="sendSlot(slot)"
                  class="px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-semibold text-primary border border-primary/30 transition-all shadow-sm hover:shadow-primary/20 hover:scale-105 active:scale-95 cursor-pointer">
                  {{ slot }}
                </button>
              </div>

              <!-- Interactive Calendar Picker (solo para pacientes) -->
              <app-chat-calendar-picker
                *ngIf="auth.userRole() === 'paciente' && getCalendarDays(msg).length > 0"
                [diasDisponibles]="getCalendarDays(msg)"
                (diaSeleccionado)="onDiaSeleccionado($event)">
              </app-chat-calendar-picker>
            </div>
          </div>

          <!-- System / Error message -->
          <div *ngIf="msg.emisor === 'sistema'" class="flex justify-center">
            <div class="rounded-lg bg-destructive/15 border border-destructive/30 px-3 py-1.5 text-xs text-destructive">
              {{ msg.contenido }}
            </div>
          </div>
        </ng-container>

        <!-- Bloqueo por perfil incompleto (Google o sin datos clínicos) -->
        <div *ngIf="requiereCompletarPerfil" class="mx-auto my-3 max-w-lg p-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-100 shadow-xl space-y-3 animate-fade-in">
          <div class="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
            <svg class="size-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Atención: Se requiere completar tus datos de usuario</span>
          </div>
          <p class="text-xs text-amber-100/90 leading-relaxed">
            Tu cuenta fue ingresada con Google y no cuenta con documento de identidad ni teléfono. Por disposiciones médicas y legales de la clínica, debes registrar estos datos para poder interactuar y agendar citas.
          </p>
          <button
            type="button"
            (click)="abrirModalCompletar()"
            class="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Rellenar datos de usuario</span>
          </button>
        </div>

        <!-- Typing Indicator -->
        <div *ngIf="chat.loading()" class="flex items-center gap-2 text-muted-foreground text-xs p-2">
          <span class="size-2 rounded-full bg-primary animate-ping"></span>
          <span>MediCore está procesando tu solicitud...</span>
        </div>
      </div>

      <!-- Suggestion Pills -->
      <div *ngIf="!requiereCompletarPerfil" class="px-5 py-2 border-t border-border/40 bg-card/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
        <span class="text-muted-foreground text-[11px] font-medium shrink-0">Sugerencias:</span>
        <button *ngFor="let s of suggestions"
          (click)="sendSuggestion(s)"
          class="shrink-0 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer">
          {{ s }}
        </button>
      </div>

      <!-- Input Form -->
      <div class="p-4 border-t border-border bg-card shrink-0">
        <!-- Aviso sobre el input cuando los datos faltan -->
        <div *ngIf="requiereCompletarPerfil" class="mb-3 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <span class="flex items-center gap-1.5">
            <svg class="size-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Rellena tus datos de usuario para habilitar el uso del copiloto.</span>
          </span>
          <button type="button" (click)="abrirModalCompletar()" class="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer transition-all shrink-0">
            Rellenar datos
          </button>
        </div>

        <form (ngSubmit)="send()" class="flex items-end gap-2">
          <textarea
            [(ngModel)]="draft"
            name="draft"
            [disabled]="requiereCompletarPerfil"
            (click)="requiereCompletarPerfil ? abrirModalCompletar() : null"
            (keydown.enter)="onEnter($event)"
            rows="1"
            [placeholder]="requiereCompletarPerfil ? '⚠️ Rellena tus datos de usuario para activar el copiloto...' : (auth.userRole() === 'medico' ? 'Consulta tu agenda del día, pacientes o guías clínicas...' : (auth.userRole() === 'admin' ? 'Consulta disponibilidad, pagos o PQR institucional...' : 'Escribe tu consulta o pide una cita...'))"
            class="flex-1 max-h-32 min-h-10 resize-none rounded-lg bg-white border border-slate-300 px-3.5 py-2 text-sm text-black font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            style="color: #000000 !important; background-color: #ffffff !important;">
          </textarea>

          <button type="submit" [disabled]="requiereCompletarPerfil || !draft.trim() || chat.loading()"
            class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20 cursor-pointer">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <!-- MODAL COMPLETAR DATOS DE USUARIO -->
      <div *ngIf="mostrarModalCompletar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#162134] p-6 shadow-2xl space-y-4">
          <!-- Header -->
          <div class="text-center space-y-1.5">
            <div class="size-11 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400">
              <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-foreground">Completar Datos de Usuario</h3>
            <p class="text-xs text-muted-foreground">Tu cuenta de Google no contiene estos datos clínicos obligatorios para emitir citas médicas.</p>
          </div>

          <div *ngIf="errorCompletar" class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {{ errorCompletar }}
          </div>

          <!-- Form -->
          <form (ngSubmit)="guardarDatosUsuario()" class="space-y-3 text-xs">
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-muted-foreground mb-1 block font-medium">Tipo Doc. *</label>
                <select [(ngModel)]="perfilForm.documento_tipo" name="documento_tipo"
                  class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                  <option value="CC">CC</option>
                  <option value="TI">TI</option>
                  <option value="CE">CE</option>
                  <option value="PAS">PAS</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="text-muted-foreground mb-1 block font-medium">Número de documento *</label>
                <input
                  type="text"
                  [(ngModel)]="perfilForm.documento_numero"
                  name="documento_numero"
                  placeholder="Ej. 1098765432"
                  required
                  class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="text-muted-foreground mb-1 block font-medium">Teléfono / Celular de contacto *</label>
              <input
                type="tel"
                [(ngModel)]="perfilForm.telefono"
                name="telefono"
                placeholder="Ej. 3123456789"
                required
                class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="text-muted-foreground mb-1 block font-medium">Fecha de nacimiento (opcional)</label>
              <input
                type="date"
                [(ngModel)]="perfilForm.fecha_nacimiento"
                name="fecha_nacimiento"
                class="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div class="p-3 rounded-lg bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground">
              Al guardar tus datos, el copiloto médico se activará de forma inmediata para consultar citas y agendamiento.
            </div>

            <!-- Buttons -->
            <div class="flex items-center justify-between pt-3 border-t border-border/80">
              <button
                type="button"
                (click)="mostrarModalCompletar = false"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                [disabled]="guardandoPerfil || !perfilForm.documento_numero.trim() || !perfilForm.telefono.trim()"
                class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
              >
                <span *ngIf="guardandoPerfil" class="size-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                <span>Guardar y Activar Chat</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  chat = inject(ChatService);
  auth = inject(AuthService);
  draft: string = '';
  private lastMsgCount = 0;

  // Modal para completar perfil
  mostrarModalCompletar = false;
  guardandoPerfil = false;
  errorCompletar = '';

  perfilForm = {
    documento_tipo: 'CC',
    documento_numero: '',
    telefono: '',
    fecha_nacimiento: ''
  };

  get requiereCompletarPerfil(): boolean {
    const user = this.auth.currentUser();
    if (!user || user.rol !== 'paciente') return false;
    if (user.perfil_completo === false) return true;
    const doc = (user.paciente?.documento_numero || '').trim();
    if (!doc || doc.startsWith('G-')) return true;
    const tel = (user.telefono || '').trim();
    if (!tel) return true;
    return false;
  }

  abrirModalCompletar() {
    const user = this.auth.currentUser();
    const doc = user?.paciente?.documento_numero || '';
    this.perfilForm = {
      documento_tipo: user?.paciente?.documento_tipo || 'CC',
      documento_numero: doc.startsWith('G-') ? '' : doc,
      telefono: user?.telefono || '',
      fecha_nacimiento: user?.paciente?.fecha_nacimiento || ''
    };
    this.errorCompletar = '';
    this.mostrarModalCompletar = true;
  }

  guardarDatosUsuario() {
    if (!this.perfilForm.documento_numero.trim() || !this.perfilForm.telefono.trim()) {
      this.errorCompletar = 'El número de documento y el teléfono son obligatorios.';
      return;
    }
    this.guardandoPerfil = true;
    this.errorCompletar = '';

    this.auth.completarPerfil({
      documento_tipo: this.perfilForm.documento_tipo,
      documento_numero: this.perfilForm.documento_numero.trim(),
      telefono: this.perfilForm.telefono.trim(),
      fecha_nacimiento: this.perfilForm.fecha_nacimiento || null
    }).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        this.mostrarModalCompletar = false;
        this.chat.messages.update(msgs => [
          ...msgs,
          {
            id: 'sys-profile-completed',
            emisor: 'asistente',
            contenido: '¡Excelente! Tus datos de usuario han sido validados y guardados con éxito. Ahora tienes acceso completo a las funciones clínicas del copiloto.',
            timestamp: new Date()
          }
        ]);
      },
      error: (err) => {
        this.guardandoPerfil = false;
        this.errorCompletar = err?.error?.detail || err?.error?.documento_numero?.[0] || 'Error al guardar los datos del perfil.';
      }
    });
  }

  get suggestions(): string[] {
    if (this.auth.userRole() === 'medico') {
      return [
        'Ver mi agenda de hoy',
        'Mis pacientes atendidos',
        'Historial de paciente atendido',
        'Disponibilidad de colegas',
        'Guías clínicas y diagnóstico'
      ];
    }
    if (this.auth.userRole() === 'admin') {
      return [
        'Disponibilidad médica global',
        'Resumen de pagos y recaudos',
        'Estado de solicitudes PQR'
      ];
    }
    return [
      'Agendar una cita',
      'Ver mis próximas citas',
      'Especialidades disponibles',
      'Consultar estado de pagos'
    ];
  }

  ngAfterViewChecked() {
    const count = this.chat.messages().length;
    if (count !== this.lastMsgCount || this.chat.loading()) {
      this.lastMsgCount = count;
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.scrollContainer?.nativeElement) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch {}
    }, 30);
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.send();
    }
  }

  send() {
    if (this.requiereCompletarPerfil) {
      this.abrirModalCompletar();
      return;
    }
    if (!this.draft.trim() || this.chat.loading()) return;
    const text = this.draft.trim();
    this.draft = '';
    this.chat.sendMessage(text).subscribe();
  }

  sendSuggestion(suggestion: string) {
    if (this.requiereCompletarPerfil) {
      this.abrirModalCompletar();
      return;
    }
    this.chat.sendMessage(suggestion).subscribe();
  }

  sendSlot(slot: string) {
    if (this.requiereCompletarPerfil) {
      this.abrirModalCompletar();
      return;
    }
    this.chat.sendMessage(`Deseo la cita en el horario ${slot}`).subscribe();
  }

  onDiaSeleccionado(dateStr: string) {
    if (this.requiereCompletarPerfil) {
      this.abrirModalCompletar();
      return;
    }
    this.chat.sendMessage(`Deseo agendar la cita para el día ${dateStr}`).subscribe();
  }

  solicitarPqr() {
    this.chat.requestPqrReembolso();
  }

  borrarSesionActual() {
    const id = this.chat.activeSessionId();
    if (!id) return;
    if (confirm('¿Deseas eliminar esta conversación de tu historial?')) {
      this.chat.deleteSession(id).subscribe();
    }
  }

  cleanMessageText(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();
    // Sanitizar viñetas repetitivas de horas si provienen de historial anterior
    cleaned = cleaned.replace(/(\n\s*[-*•]\s*\d{1,2}:\d{2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?)+/gi, '');
    return cleaned.trim();
  }

  getTimeSlots(msg: ChatMessage): string[] {
    if (msg.requiere_seleccion === 'hora' && msg.horarios && msg.horarios.length > 0) {
      return msg.horarios;
    }
    if (msg.horarios && msg.horarios.length > 0 && msg.requiere_seleccion !== 'ninguna' && msg.requiere_seleccion !== 'dia') {
      return msg.horarios;
    }
    return [];
  }

  getCalendarDays(msg: ChatMessage): string[] {
    if (msg.requiere_seleccion === 'dia' && msg.dias_disponibles && msg.dias_disponibles.length > 0) {
      return msg.dias_disponibles;
    }
    return [];
  }
}
