import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, LogOut, User, PanelLeft } from 'lucide-react'

/**
 * GlassNavbar — Top navigation bar. Clean and minimal.
 * Fixed height h-14 with subtle borders.
 */
export default function GlassNavbar({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()

  const portalLabels = {
    '/paciente': 'Portal Paciente',
    '/doctor': 'Portal Doctor',
    '/admin': 'Panel Admin',
  }

  const currentLabel = portalLabels[location.pathname] || 'MediCore OS'

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 px-5 bg-slate-900/75 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between">
      {/* Brand & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
            title="Alternar panel de conversaciones"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded-lg bg-primary-cyan flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white leading-none">
              MediCore<span className="text-primary-cyan">OS</span>
            </h1>
            <p className="text-[10px] text-text-muted mt-0.5">
              {currentLabel}
            </p>
          </div>
        </div>
      </div>

      {/* User actions */}
      <div className="flex items-center gap-2.5">
        {user && (
          <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-lg">
            <User className="w-3.5 h-3.5 text-primary-cyan" />
            <span className="text-xs text-text-secondary">
              {user.nombre_completo}
            </span>
            <span className="text-[10px] text-primary-cyan bg-primary-cyan/10 px-1.5 py-0.5 rounded-full">
              {user.rol}
            </span>
          </div>
        )}
        {user && (
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-rose-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  )
}
