import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, LogOut, User } from 'lucide-react'

/**
 * GlassNavbar — Top navigation bar with frosted glass effect.
 * Shows the MediCore logo, current portal label, and user actions.
 */
export default function GlassNavbar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  const portalLabels = {
    '/paciente': 'Portal Paciente',
    '/doctor': 'Portal Doctor',
    '/admin': 'Panel Admin',
  }

  const currentLabel = portalLabels[location.pathname] || 'MediCore OS'

  return (
    <nav className="glass-panel-strong fixed top-0 left-0 right-0 z-40 px-6 py-3 flex items-center justify-between"
         style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}>
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            MediCore<span style={{ color: 'var(--color-surgical-cyan)' }}>OS</span>
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {currentLabel}
          </p>
        </div>
      </div>

      {/* User actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 glass-panel-sm px-3 py-2">
            <User className="w-4 h-4" style={{ color: 'var(--color-surgical-cyan)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {user.nombre_completo}
            </span>
            <span className="badge badge-confirmed text-xs">
              {user.rol}
            </span>
          </div>
        )}
        {user && (
          <button
            onClick={onLogout}
            className="glass-btn glass-btn-secondary p-2"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        )}
      </div>
    </nav>
  )
}
