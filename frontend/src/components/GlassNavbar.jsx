import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, LogOut, User, PanelLeft } from 'lucide-react'

/**
 * GlassNavbar — Top navigation bar with Dark Liquid Glass styling.
 * Fixed height h-16 with crisp borders and user actions.
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
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 px-6 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/80 flex items-center justify-between shadow-lg">
      {/* Brand & Optional Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors mr-1"
            title="Alternar panel de conversaciones"
          >
            <PanelLeft className="w-5 h-5 text-cyan-400" />
          </button>
        )}

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              MediCore<span className="text-cyan-400">OS</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {currentLabel}
            </p>
          </div>
        </div>
      </div>

      {/* User actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/60 backdrop-blur-xl px-3 py-1.5 rounded-xl shadow-xs">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">
              {user.nombre_completo}
            </span>
            <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
              {user.rol}
            </span>
          </div>
        )}
        {user && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/40 border border-slate-700/60 text-slate-400 hover:text-rose-300 transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  )
}


