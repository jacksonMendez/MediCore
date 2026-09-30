import { Component, ElementRef, ViewChild, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ChatCalendarPickerComponent } from './chat-calendar-picker.component';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatCalendarPickerComponent],
  template: `
    <div class="flex flex-col h-full rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
      <!-- Chat Header -->
      <div class="px-5 py-3.5 border-b border-border/70 bg-card flex items-center justify-between">
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
            <h3 class="font-display text-sm font-bold text-foreground">Copiloto Clínico IA</h3>
            <p class="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Llama 3.1 & MediCore Engine</span>
              <span class="text-xs">•</span>
              <span class="text-emerald-400">En línea</span>
            </p>
          </div>
        </div>

        <!-- Quick PQR button -->
        <button (click)="solicitarPqr()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer">
          <svg class="size-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>PQR / Reembolso</span>
        </button>
      </div>

      <!-- Messages Area -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-5 space-y-4">
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

              <!-- Interactive Time Slot Buttons -->
              <div *ngIf="getTimeSlots(msg).length > 0" class="flex flex-wrap gap-2 pt-1">
                <button *ngFor="let slot of getTimeSlots(msg)"
                  (click)="sendSlot(slot)"
                  class="px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-semibold text-primary border border-primary/30 transition-all shadow-sm hover:shadow-primary/20 hover:scale-105 active:scale-95 cursor-pointer">
                  {{ slot }}
                </button>
              </div>

              <!-- Interactive Calendar Picker -->
              <app-chat-calendar-picker
                *ngIf="getCalendarDays(msg).length > 0"
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

        <!-- Typing Indicator -->
        <div *ngIf="chat.loading()" class="flex items-center gap-2 text-muted-foreground text-xs p-2">
          <span class="size-2 rounded-full bg-primary animate-ping"></span>
          <span>MediCore está procesando tu solicitud...</span>
        </div>
      </div>

      <!-- Suggestion Pills -->
      <div class="px-5 py-2 border-t border-border/40 bg-card/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span class="text-muted-foreground text-[11px] font-medium shrink-0">Sugerencias:</span>
        <button *ngFor="let s of suggestions"
          (click)="sendSuggestion(s)"
          class="shrink-0 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer">
          {{ s }}
        </button>
      </div>

      <!-- Input Form -->
      <div class="p-4 border-t border-border bg-card">
        <form (ngSubmit)="send()" class="flex items-end gap-2">
          <textarea
            [(ngModel)]="draft"
            name="draft"
            (keydown.enter)="onEnter($event)"
            rows="1"
            placeholder="Escribe tu consulta o pide una cita..."
            class="flex-1 max-h-32 min-h-10 resize-none rounded-lg bg-secondary/80 border border-border px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all">
          </textarea>

          <button type="submit" [disabled]="!draft.trim() || chat.loading()"
            class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20 cursor-pointer">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  `
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  chat = inject(ChatService);
  draft: string = '';

  readonly suggestions = [
    'Agendar una cita',
    'Ver mis próximas citas',
    'Especialidades disponibles',
    'Consultar estado de pagos'
  ];

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.send();
    }
  }

  send() {
    if (!this.draft.trim() || this.chat.loading()) return;
    const text = this.draft.trim();
    this.draft = '';
    this.chat.sendMessage(text).subscribe();
  }

  sendSuggestion(suggestion: string) {
    this.chat.sendMessage(suggestion).subscribe();
  }

  sendSlot(slot: string) {
    this.chat.sendMessage(`Deseo la cita en el horario ${slot}`).subscribe();
  }

  onDiaSeleccionado(dateStr: string) {
    this.chat.sendMessage(`Deseo agendar la cita para el día ${dateStr}`).subscribe();
  }

  solicitarPqr() {
    this.chat.requestPqrReembolso();
  }

  cleanMessageText(text: string): string {
    return text ? text.trim() : '';
  }

  getTimeSlots(msg: ChatMessage): string[] {
    if (msg.requiere_seleccion === 'hora' && msg.horarios && msg.horarios.length > 0) {
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
