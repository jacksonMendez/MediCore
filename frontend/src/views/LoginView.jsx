import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * LoginView — Authentication page with frosted glass form.
 * Supports login and basic registration.
 */
export default function LoginView({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const roleHint = location.state?.role || 'paciente'

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
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const body = isRegister
        ? { ...form, rol: roleHint }
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

      // Navigate to appropriate portal
      const roleRoutes = { paciente: '/paciente', medico: '/doctor', admin: '/admin' }
      navigate(roleRoutes[data.usuario.rol] || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Demo quick login buttons
  const demoLogin = async (correo, password) => {
    setForm({ ...form, correo, password })
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error')
      localStorage.setItem('medicore_token', data.access_token)
      localStorage.setItem('medicore_user', JSON.stringify(data.usuario))
      onLogin(data.usuario, data.access_token)
      const roleRoutes = { paciente: '/paciente', medico: '/doctor', admin: '/admin' }
      navigate(roleRoutes[data.usuario.rol] || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const roleLabels = {
    paciente: 'Paciente',
    medico: 'Doctor',
    admin: 'Administrador',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <BackgroundOrbs />

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al selector
        </button>

        {/* Login Card */}
        <div className="glass-panel-strong p-8 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}>
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Portal {roleLabels[roleHint]}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-medium animate-fade-in"
                 style={{ background: 'rgba(225,29,72,0.1)', color: 'var(--color-alert-rose)' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>
                    Nombre completo
                  </label>
                  <input
                    name="nombre_completo"
                    type="text"
                    value={form.nombre_completo}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>
                    Documento
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
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                     style={{ color: 'var(--color-text-muted)' }}>
                Correo electrónico
              </label>
              <input
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                className="glass-input"
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                     style={{ color: 'var(--color-text-muted)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="glass-input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    : <Eye className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  }
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn glass-btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {isRegister ? 'Registrarse' : 'Ingresar'}
                </span>
              )}
            </button>
          </form>

          {/* Toggle login/register */}
          <p className="text-center mt-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="font-semibold"
              style={{ color: 'var(--color-surgical-cyan)' }}
            >
              {isRegister ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          </p>

          {/* Demo accounts */}
          {!isRegister && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-center"
                 style={{ color: 'var(--color-text-muted)' }}>
                Acceso rápido (demo)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Paciente', email: 'juan.perez@email.com' },
                  { label: 'Doctor', email: 'dr.garcia@medicore.com' },
                  { label: 'Admin', email: 'admin@medicore.com' },
                ].map(({ label, email }) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => demoLogin(email, 'MediCore2024!')}
                    className="glass-btn glass-btn-secondary text-xs py-2"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
