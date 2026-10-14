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
  readonly isPaciente = computed(() => this.userRole() === 'paciente');
  readonly isMedico = computed(() => this.userRole() === 'medico');
  readonly isAdmin = computed(() => this.userRole() === 'admin');

  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos de inactividad

  constructor(private http: HttpClient, private router: Router) {
    this.initInactivityTracker();
  }

  private initInactivityTracker() {
    if (typeof window === 'undefined') return;

    const resetTimer = () => {
      if (!this.isAuthenticated()) return;
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      this.inactivityTimer = setTimeout(() => {
        if (this.isAuthenticated()) {
          try {
            localStorage.setItem('medicore_logout_reason', 'inactividad');
          } catch {}
          this.logout();
        }
      }, this.INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    if (this.isAuthenticated()) {
      resetTimer();
    }
  }

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

  login(correo: string, password: string, recaptcha_token?: string): Observable<AuthResponse> {
    const payload: any = { correo, password };
    if (recaptcha_token) {
      payload.recaptcha_token = recaptcha_token;
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => {
        if (res?.access_token) {
          localStorage.setItem(this.tokenKey, res.access_token);
          localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
          this.token.set(res.access_token);
          this.currentUser.set(res.usuario);
          this.notifySessionChanged();
          this.redirectAfterLogin(res.usuario.rol);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  verificarCodigo(correo: string, codigo: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar-codigo`, { correo, codigo }).pipe(
      tap((res) => {
        if (res?.access_token) {
          localStorage.setItem(this.tokenKey, res.access_token);
          localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
          this.token.set(res.access_token);
          this.currentUser.set(res.usuario);
          this.notifySessionChanged();
          this.redirectAfterLogin(res.usuario.rol);
        }
      })
    );
  }

  reenviarCodigo(correo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reenviar-codigo`, { correo });
  }

  loginConGoogle(email: string, nombre?: string, credential?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, {
      email,
      nombre: nombre || '',
      credential: credential || ''
    }).pipe(
      tap((res) => {
        if (res?.access_token) {
          localStorage.setItem(this.tokenKey, res.access_token);
          localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
          this.token.set(res.access_token);
          this.currentUser.set(res.usuario);
          this.notifySessionChanged();
          this.redirectAfterLogin(res.usuario.rol);
        }
      })
    );
  }

  completarPerfil(data: { documento_tipo: string; documento_numero: string; telefono: string; fecha_nacimiento?: string | null }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/completar-perfil`, data, { headers: this.getAuthHeaders() }).pipe(
      tap((res) => {
        if (res?.usuario) {
          localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
          this.currentUser.set(res.usuario);
        }
      })
    );
  }

  redirectAfterLogin(rol: string) {
    if (rol === 'paciente') {
      this.router.navigate(['/paciente']);
    } else if (rol === 'medico') {
      this.router.navigate(['/medico/copiloto']);
    } else if (rol === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/paciente']);
    }
  }

  private notifySessionChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medicore:auth-changed'));
    }
  }

  logout() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch {}
    this.token.set(null);
    this.currentUser.set(null);
    this.notifySessionChanged();
    this.router.navigate(['/login']);
  }
}
