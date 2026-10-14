import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { CitaItem } from '../models/cita.model';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private apiUrl = 'http://localhost:8000/api/citas';

  readonly citas = signal<CitaItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly lastUpdated = signal<number>(Date.now());

  constructor(private http: HttpClient, private authService: AuthService) {
    if (typeof window !== 'undefined') {
      window.addEventListener('medicore:auth-changed', () => {
        this.clear();
      });
    }
  }

  clear(): void {
    this.citas.set([]);
    this.loading.set(false);
  }

  loadMisCitas(): Observable<CitaItem[]> {
    this.loading.set(true);
    return this.http.get<CitaItem[]>(`${this.apiUrl}/mis-citas`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap({
        next: (data) => {
          this.citas.set(data || []);
          this.loading.set(false);
          this.lastUpdated.set(Date.now());
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  cancelarCita(citaId: string, motivo: string = 'Cancelado por el paciente'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${citaId}/estado`, {
      nuevo_estado: 'cancelada',
      motivo
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.loadMisCitas().subscribe();
      })
    );
  }

  cambiarEstado(citaId: string, nuevoEstado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${citaId}/estado`, {
      nuevo_estado: nuevoEstado
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.loadMisCitas().subscribe();
      })
    );
  }

  guardarNotaClinica(
    citaId: string,
    diagnostico: string,
    tratamiento: string = '',
    receta: string = '',
    archivo_adjunto: string = '',
    archivo_nombre: string = '',
    archivo_tipo: string = ''
  ): Observable<any> {
    const payload: any = {
      diagnostico,
      tratamiento,
      receta_medica: receta
    };
    if (archivo_adjunto) {
      payload.archivo_adjunto = archivo_adjunto;
      payload.archivo_nombre = archivo_nombre;
      payload.archivo_tipo = archivo_tipo;
    }
    return this.http.post(`${this.apiUrl}/${citaId}/nota`, payload, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.loadMisCitas().subscribe();
      })
    );
  }

  obtenerNotaClinica(citaId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${citaId}/nota`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  notifyCitasUpdated() {
    this.loadMisCitas().subscribe();
  }
}
