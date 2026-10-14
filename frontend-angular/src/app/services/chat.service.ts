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
    if (typeof window !== 'undefined') {
      window.addEventListener('medicore:auth-changed', () => {
        this.reset();
      });
    }
  }

  reset(): void {
    this.activeSessionId.set(null);
    this.sessions.set([]);
    this.resetToWelcome();
  }

  public resetToWelcome() {
    const user = this.authService.currentUser();
    if (user?.rol === 'medico') {
      const docNombre = user?.nombre_completo || 'Doctor';
      this.messages.set([
        {
          emisor: 'asistente',
          contenido: `¡Bienvenido, Dr(a). ${docNombre}! Soy MediCore Doctor Copilot, tu asistente de práctica médica especializada.\n\nPuedo asistirte en tiempo real con:\n• 💊 Revisión de interacciones farmacológicas, contraindicaciones y posología.\n• 📋 Estructuración de notas de evolución médica (formato SOAP).\n• 🔍 Búsqueda de códigos diagnósticos CIE-10.\n• 📅 Consulta de tu agenda médica de hoy y citas programadas.\n• 👥 Historial clínico de tus pacientes atendidos.\n• 🩺 Algoritmos y criterios diagnósticos clínicos basados en evidencia.\n\n¿En qué consulta o caso médico te colaboro hoy?`
        }
      ]);
      return;
    }
    if (user?.rol === 'admin') {
      const admNombre = user?.nombre_completo || 'Administrador';
      this.messages.set([
        {
          emisor: 'asistente',
          contenido: `¡Bienvenido, Administrador(a) ${admNombre}! Soy MediCore Admin Copilot, tu centro de mando y asistente ejecutivo de gobernanza institucional.\n\nPuedo asistirte en tiempo real con:\n• 📊 Balance financiero, recaudos en COP y auditoría de pagos.\n• 💳 Consulta de transferencias bancarias pendientes de autorizar o rechazar.\n• 📅 Resumen institucional de citas (confirmadas, atendidas, inasistencias y canceladas).\n• 🏥 Infraestructura de sedes, especialidades y tarifas.\n• 🩺 Disponibilidad, agenda y carga de trabajo del cuerpo médico.\n• 📢 Seguimiento de solicitudes PQR, garantías y devoluciones.\n\n¿Qué indicador o gestión institucional deseas consultar hoy?`
        }
      ]);
      return;
    }
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
          const rawMsgs = Array.isArray(res) ? res : (res?.mensajes || []);
          const formatted: ChatMessage[] = rawMsgs.map((m: any) => ({
            id: m.id,
            emisor: m.emisor,
            contenido: m.contenido,
            requiere_seleccion: m.requiere_seleccion || 'ninguna',
            dias_disponibles: m.dias_disponibles || [],
            horarios: m.horarios || [],
            especialidad: m.especialidad || null,
            creado_en: m.creado_en
          }));
          if (formatted.length > 0) {
            this.messages.set(formatted);
          } else {
            this.resetToWelcome();
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.resetToWelcome();
        }
      })
    ).subscribe();
  }

  newChat(): void {
    this.activeSessionId.set(null);
    this.resetToWelcome();
  }

  deleteSession(sessionId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sesiones/${sessionId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.sessions.set(this.sessions().filter(s => s.id !== sessionId));
        if (this.activeSessionId() === sessionId) {
          this.activeSessionId.set(null);
          this.resetToWelcome();
        }
      })
    );
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
          let errorMsg = 'No se pudo conectar con el asistente en este momento. Intenta de nuevo.';
          if (err?.status === 401 || err?.status === 403) {
            errorMsg = 'Tu sesión ha expirado o las credenciales no son válidas. Por favor vuelve a iniciar sesión para continuar.';
          } else if (err?.error?.detail) {
            errorMsg = err.error.detail;
          }
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
