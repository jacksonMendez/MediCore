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

  constructor(private http: HttpClient, private authService: AuthService) {}

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
      estado: 'cancelada',
      motivo
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.loadMisCitas().subscribe();
      })
    );
  }

  notifyCitasUpdated() {
    this.loadMisCitas().subscribe();
  }
}
