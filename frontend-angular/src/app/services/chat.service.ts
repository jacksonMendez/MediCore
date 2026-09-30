import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { CitasService } from './citas.service';
import { ChatMessage, ChatSendMessageResponse, ChatSession } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8000/api/chat';

  readonly sessions = signal<ChatSession[]>([]);
  readonly activeSessionId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private citasService: CitasService
  ) {
    this.resetToWelcome();
  }

  private resetToWelcome() {
    const user = this.authService.currentUser();
    const nombre = user?.nombre_completo ? user.nombre_completo.split(' ')[0] : 'paciente';
    this.messages.set([
      {
        emisor: 'asistente',
        contenido: `¡Hola, ${nombre}! Soy tu asistente clínico MediCore. Puedo ayudarte a agendar citas, consultar tus horarios, revisar pagos o radicar solicitudes PQR y reembolsos. ¿En qué te ayudo hoy?`
      }
    ]);
  }

  loadSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.apiUrl}/sesiones`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap((data) => this.sessions.set(data || []))
    );
  }

  selectSession(sessionId: string): void {
    this.activeSessionId.set(sessionId);
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/sesiones/${sessionId}/mensajes`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap({
        next: (res) => {
          const rawMsgs = res.mensajes || [];
          const formatted: ChatMessage[] = rawMsgs.map((m: any) => ({
            id: m.id,
            emisor: m.emisor,
            contenido: m.contenido,
            creado_en: m.creado_en
          }));
          this.messages.set(formatted.length ? formatted : []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      })
    ).subscribe();
  }

  newChat(): void {
    this.activeSessionId.set(null);
    this.resetToWelcome();
  }

  sendMessage(text: string): Observable<ChatSendMessageResponse> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Mensaje vacío');

    // Optimistic user message addition
    const currentMsgs = this.messages();
    this.messages.set([
      ...currentMsgs,
      { emisor: 'usuario', contenido: trimmed }
    ]);
    this.loading.set(true);

    const payload: { mensaje: string; sesion_id?: string } = {
      mensaje: trimmed
    };
    const activeId = this.activeSessionId();
    if (activeId) {
      payload.sesion_id = activeId;
    }

    return this.http.post<ChatSendMessageResponse>(`${this.apiUrl}/mensaje`, payload, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap({
        next: (res) => {
          this.activeSessionId.set(res.sesion_id);
          
          const assistantMsg: ChatMessage = {
            emisor: 'asistente',
            contenido: res.respuesta,
            requiere_seleccion: res.requiere_seleccion,
            dias_disponibles: res.dias_disponibles,
            horarios: res.horarios,
            especialidad: res.especialidad
          };

          this.messages.set([...this.messages(), assistantMsg]);
          this.loading.set(false);

          if (res.actualizo_citas) {
            this.citasService.notifyCitasUpdated();
          }

          // Refresh sessions list
          this.loadSessions().subscribe();
        },
        error: (err) => {
          this.loading.set(false);
          const errorMsg = err?.error?.detail || 'No se pudo conectar con el asistente. Intenta de nuevo.';
          this.messages.set([
            ...this.messages(),
            {
              emisor: 'sistema',
              contenido: `⚠️ ${errorMsg}`
            }
          ]);
        }
      })
    );
  }

  requestPqrReembolso(): void {
    this.sendMessage('Deseo radicar una solicitud de PQR o reembolso para una cita previa').subscribe();
  }
}
