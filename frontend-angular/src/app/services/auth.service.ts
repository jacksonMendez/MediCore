import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, Usuario } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/auth';
  private tokenKey = 'medicore_token';
  private userKey = 'medicore_user';

  readonly currentUser = signal<Usuario | null>(this.getStoredUser());
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.rol || null);

  constructor(private http: HttpClient, private router: Router) {}

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  private getStoredUser(): Usuario | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getAuthHeaders(): HttpHeaders {
    const t = this.token();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {})
    });
  }

  login(correo: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.access_token);
        localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
        this.token.set(res.access_token);
        this.currentUser.set(res.usuario);
        this.redirectAfterLogin(res.usuario.rol);
      })
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.access_token);
        localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
        this.token.set(res.access_token);
        this.currentUser.set(res.usuario);
        this.redirectAfterLogin(res.usuario.rol);
      })
    );
  }

  redirectAfterLogin(rol: string) {
    if (rol === 'paciente') {
      this.router.navigate(['/paciente']);
    } else if (rol === 'medico') {
      this.router.navigate(['/medico']);
    } else if (rol === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/paciente']);
    }
  }

  logout() {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch {}
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
