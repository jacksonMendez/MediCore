import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { EspecialidadItem, MedicoItem, SedeItem } from '../models/clinica.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicaService {
  private apiUrl = 'http://localhost:8000/api';

  readonly especialidades = signal<EspecialidadItem[]>([]);
  readonly medicos = signal<MedicoItem[]>([]);
  readonly sedes = signal<SedeItem[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private http: HttpClient, private authService: AuthService) {}

  loadEspecialidades(): Observable<EspecialidadItem[]> {
    return this.http.get<EspecialidadItem[]>(`${this.apiUrl}/especialidades`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap((data) => this.especialidades.set(data || []))
    );
  }

  loadMedicos(): Observable<MedicoItem[]> {
    return this.http.get<MedicoItem[]>(`${this.apiUrl}/medicos`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap((data) => this.medicos.set(data || []))
    );
  }

  loadSedes(): Observable<SedeItem[]> {
    return this.http.get<SedeItem[]>(`${this.apiUrl}/sedes`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap((data) => this.sedes.set(data || []))
    );
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadEspecialidades().subscribe();
    this.loadMedicos().subscribe();
    this.loadSedes().subscribe({
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }
}
