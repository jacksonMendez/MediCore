import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { PagoItem } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private apiUrl = 'http://localhost:8000/api/pagos';

  readonly pagos = signal<PagoItem[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private http: HttpClient, private authService: AuthService) {}

  loadMisPagos(): Observable<PagoItem[]> {
    this.loading.set(true);
    return this.http.get<PagoItem[]>(`${this.apiUrl}/mis-pagos`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap({
        next: (data) => {
          this.pagos.set(data || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  simularPago(citaId: string, metodo: string = 'tarjeta_credito'): Observable<any> {
    return this.http.post(`${this.apiUrl}/simular`, {
      cita_id: citaId,
      metodo_pago: metodo
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.loadMisPagos().subscribe();
      })
    );
  }
}
