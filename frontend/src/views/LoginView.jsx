import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, LogIn, Sparkles, UserCheck } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * LoginView — Clean authentication portal.
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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-clinical-bg">
      <BackgroundOrbs />

      <div className="w-full max-w-md relative z-10 my-8">
        {/* Central Card */}
        <div className="glass-panel-strong p-8 sm:p-10 animate-fade-in-up shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary-cyan flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-slate-950" />
              </div>
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              MediCore<span className="text-primary-cyan">OS</span>
            </h1>
            <p className="text-xs text-text-muted mt-1">
              {isRegister ? 'Registro de usuario' : 'Acceso al sistema médico'}
            </p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-5 p-3 rounded-lg text-xs bg-rose-950/50 border border-rose-800/60 text-rose-300 animate-fade-in text-center">
              {error}
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs text-text-secondary mb-1.5 block">
                    Nombre completo
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
                  <label className="text-xs text-text-secondary mb-1.5 block">
                    Documento de identidad
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
              <label className="text-xs text-text-secondary mb-1.5 block">
                Correo electrónico
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
              <label className="text-xs text-text-secondary mb-1.5 block">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs text-text-secondary mb-1.5 block">
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
                  <label className="text-xs text-text-secondary mb-1.5 block">
                    Rol de cuenta
                  </label>
                  <select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    className="glass-input cursor-pointer bg-slate-900 text-slate-200"
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
              className="glass-btn glass-btn-primary w-full py-2.5 text-sm mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                </span>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-5 text-center text-xs text-text-muted">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta registrada?'}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-primary-cyan hover:underline ml-1"
            >
              {isRegister ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          </div>

          {/* Quick Demo Login Accounts */}
          {!isRegister && (
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary-cyan" />
                Acceso rápido (Cuentas Demo)
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => demoLogin('paciente@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2 flex-col gap-1 hover:border-primary-cyan/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary-cyan" />
                  <span>Paciente</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin('medico@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2 flex-col gap-1 hover:border-primary-cyan/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary-cyan" />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin('admin@medicore.com', 'Password123!')}
                  className="glass-btn glass-btn-secondary text-xs py-2 flex-col gap-1 hover:border-primary-cyan/30"
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary-cyan" />
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
