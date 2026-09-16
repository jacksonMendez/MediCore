import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, LogIn, Sparkles, UserCheck } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * LoginView — Centralized Apple Liquid Glass authentication portal.
 * Handles unified login, quick demo fill, and auto-role redirection.
 */
export default function LoginView({ onLogin }) {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    correo: '',
    password: '',
    nombre_completo: '',
    telefono: '',
    documento_numero: '',
    rol: 'paciente',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const redirectByRole = (rol) => {
    const roleRoutes = {
      paciente: '/paciente',
      medico: '/doctor',
      admin: '/admin',
    }
    navigate(roleRoutes[rol] || '/paciente')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const body = isRegister
        ? form
        : { correo: form.correo, password: form.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Error de autenticación')
      }

      // Store token and user data
      localStorage.setItem('medicore_token', data.access_token)
      localStorage.setItem('medicore_user', JSON.stringify(data.usuario))
      onLogin(data.usuario, data.access_token)

      // Automatic Role-based Redirection
      redirectByRole(data.usuario.rol)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Login
  const demoLogin = async (correo, password) => {
    setForm((prev) => ({ ...prev, correo, password }))
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al conectar')

      localStorage.setItem('medicore_token', data.access_token)
      localStorage.setItem('medicore_user', JSON.stringify(data.usuario))
      onLogin(data.usuario, data.access_token)

      // Automatic Role-based Redirection
      redirectByRole(data.usuario.rol)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-100">
      <BackgroundOrbs />

      <div className="w-full max-w-md relative z-10 my-8">
        {/* Central Liquid Glass Card */}
        <div className="glass-panel-strong p-8 sm:p-10 animate-fade-in-up border border-white/80 shadow-2xl shadow-cyan-900/5 backdrop-blur-2xl">
          {/* Header with Glow Animation */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}
              >
                <Activity className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-cyan-400/20 blur-lg -z-10 animate-pulse" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              MediCore<span className="text-cyan-600">OS</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
              {isRegister ? 'Registro de Usuario' : 'Acceso Centralizado'}
            </p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl text-sm font-medium bg-rose-500/10 border border-rose-500/20 text-rose-600 animate-fade-in text-center">
              {error}
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Nombre Completo
                  </label>
                  <input
                    name="nombre_completo"
                    type="text"
                    value={form.nombre_completo}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="Carlos Mendoza"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Documento de Identidad
                  </label>
                  <input
                    name="documento_numero"
                    type="text"
                    value={form.documento_numero}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="1098765432"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                Correo Electrónico
              </label>
              <input
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                className="glass-input"
                placeholder="paciente@medicore.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="glass-input pr-10"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Teléfono
                  </label>
                  <input
                    name="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="+57 300 123 4567"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Rol de Cuenta
                  </label>
                  <select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    className="glass-input cursor-pointer"
                  >
                    <option value="paciente">Paciente</option>
                    <option value="medico">Médico / Doctor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn glass-btn-primary w-full py-3.5 text-base font-semibold shadow-lg shadow-cyan-600/25 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </span>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta registrada?'}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="font-bold text-cyan-600 hover:text-cyan-700 underline underline-offset-4 ml-1"
            >
              {isRegister ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          </div>

          {/* Quick Demo Login Accounts */}
          {!isRegister && (
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Acceso Rápido (Cuentas Demo)
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => demoLogin('paciente@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2.5 flex-col gap-1 border-white/80 hover:border-cyan-500/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Paciente</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin('medico@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2.5 flex-col gap-1 border-white/80 hover:border-cyan-500/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin('admin@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2.5 flex-col gap-1 border-white/80 hover:border-cyan-500/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
