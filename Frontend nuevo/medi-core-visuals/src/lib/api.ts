/**
 * MediCore OS — API Client
 * Centralized client for interacting with the Django REST backend.
 */

const API_BASE = (import.meta.env as Record<string, string>)?.[ 'VITE_API_BASE' ] || 'http://localhost:8000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('medicore_token');
}

export function setToken(token: string): void {
  localStorage.setItem('medicore_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('medicore_token');
  localStorage.removeItem('medicore_user');
}

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: 'paciente' | 'medico' | 'admin';
  telefono?: string | null;
  activo: boolean;
  creado_en: string;
}

export function getUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('medicore_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: Usuario): void {
  localStorage.setItem('medicore_user', JSON.stringify(user));
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${cleanEndpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || (typeof data === 'object' && JSON.stringify(data)) || data || `Error ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}
