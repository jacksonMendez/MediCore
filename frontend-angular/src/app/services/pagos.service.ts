import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap, of } from 'rxjs';
import { AuthService } from './auth.service';
import { PagoItem } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private apiUrl = 'http://localhost:8000/api/pagos';

  readonly pagos = signal<PagoItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly payingCitaId = signal<string | null>(null);
  readonly lastSuccessMessage = signal<string | null>(null);

  constructor(private http: HttpClient, private authService: AuthService) {
    if (typeof window !== 'undefined') {
      window.addEventListener('medicore:auth-changed', () => {
        this.clear();
      });
    }
  }

  clear(): void {
    this.pagos.set([]);
    this.payingCitaId.set(null);
    this.lastSuccessMessage.set(null);
    this.loading.set(false);
  }

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

  simularPago(citaId: string, metodo: string = 'wompi_sandbox'): Observable<any> {
    this.payingCitaId.set(citaId);
    return this.http.post<any>(`${this.apiUrl}/simular`, {
      cita_id: citaId,
      metodo_pago: metodo
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      switchMap((simRes) => {
        const ref = simRes?.referencia;
        if (!ref) {
          return of(simRes);
        }
        // Aprobar el pago en Sandbox
        return this.http.post<any>(`${this.apiUrl}/webhook`, {
          referencia: ref,
          estado: 'aprobado'
        });
      }),
      tap({
        next: () => {
          this.payingCitaId.set(null);
          this.lastSuccessMessage.set('¡Pago aprobado exitosamente! Tu cita médica ha sido confirmada.');
          setTimeout(() => this.lastSuccessMessage.set(null), 5000);
          this.loadMisPagos().subscribe();
        },
        error: () => {
          this.payingCitaId.set(null);
        }
      })
    );
  }

  reportarTransferencia(
    citaId: string,
    referenciaTransferencia: string,
    bancoOrigen: string = 'nequi',
    comprobanteArchivo: string = '',
    metodo: string = 'transferencia'
  ): Observable<any> {
    this.loading.set(true);
    return this.http.post<any>(`${this.apiUrl}/simular`, {
      cita_id: citaId,
      referencia: referenciaTransferencia,
      banco_origen: bancoOrigen,
      comprobante_archivo: comprobanteArchivo,
      metodo_pago: metodo
    }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap({
        next: () => {
          this.loading.set(false);
          this.lastSuccessMessage.set('✅ Comprobante de transferencia radicado exitosamente. Un administrador verificará el comprobante para confirmar tu cita.');
          setTimeout(() => this.lastSuccessMessage.set(null), 6000);
          this.loadMisPagos().subscribe();
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  autorizarPago(referencia: string): Observable<any> {
    this.loading.set(true);
    return this.http.post<any>(`${this.apiUrl}/webhook`, {
      referencia: referencia,
      estado: 'aprobado'
    }).pipe(
      tap({
        next: () => {
          this.loading.set(false);
          this.lastSuccessMessage.set('✅ Transferencia verificada y autorizada exitosamente. La cita está ahora confirmada.');
          setTimeout(() => this.lastSuccessMessage.set(null), 5000);
          this.loadMisPagos().subscribe();
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  rechazarPago(referencia: string): Observable<any> {
    this.loading.set(true);
    return this.http.post<any>(`${this.apiUrl}/webhook`, {
      referencia: referencia,
      estado: 'rechazado'
    }).pipe(
      tap({
        next: () => {
          this.loading.set(false);
          this.lastSuccessMessage.set('❌ Transferencia rechazada. La cita asociada ha sido cancelada.');
          setTimeout(() => this.lastSuccessMessage.set(null), 5000);
          this.loadMisPagos().subscribe();
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }
}
