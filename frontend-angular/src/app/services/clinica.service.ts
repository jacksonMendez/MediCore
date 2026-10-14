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

  // Admin CRUD: Médicos
  crearMedico(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/medicos`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadMedicos().subscribe())
    );
  }

  actualizarMedico(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/medicos/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadMedicos().subscribe())
    );
  }

  desactivarMedico(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/medicos/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadMedicos().subscribe())
    );
  }

  // Admin CRUD: Sedes
  crearSede(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sedes`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadSedes().subscribe())
    );
  }

  actualizarSede(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/sedes/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadSedes().subscribe())
    );
  }

  desactivarSede(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/sedes/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadSedes().subscribe())
    );
  }

  // Admin CRUD: Especialidades
  crearEspecialidad(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/especialidades`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadEspecialidades().subscribe())
    );
  }

  actualizarEspecialidad(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/especialidades/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadEspecialidades().subscribe())
    );
  }

  eliminarEspecialidad(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/especialidades/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => this.loadEspecialidades().subscribe())
    );
  }
}

