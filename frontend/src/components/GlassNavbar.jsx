import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, LogOut, User, PanelLeft } from 'lucide-react'

/**
 * GlassNavbar — Top navigation bar with Apple Liquid Glass styling.
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
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 px-6 bg-white/75 backdrop-blur-2xl border-b border-white/80 flex items-center justify-between shadow-xs">
      {/* Brand & Optional Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-200/50 hover:bg-slate-200 border border-white/60 text-slate-700 transition-colors mr-1"
            title="Alternar panel de conversaciones"
          >
            <PanelLeft className="w-5 h-5 text-cyan-700" />
          </button>
        )}

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}
          >
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              MediCore<span className="text-cyan-600">OS</span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {currentLabel}
            </p>
          </div>
        </div>
      </div>

      {/* User actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 bg-white/60 border border-white/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-xs">
            <User className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-semibold text-slate-800">
              {user.nombre_completo}
            </span>
            <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              {user.rol}
            </span>
          </div>
        )}
        {user && (
          <button
            onClick={onLogout}
            className="p-2 rounded-2xl bg-white/60 hover:bg-rose-50 border border-white/80 text-slate-600 hover:text-rose-600 backdrop-blur-xl transition-all shadow-xs"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  )
}

