import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Stethoscope, Shield, ArrowRight } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * PortalSelector — Landing page to choose between Patient, Doctor, and Admin portals.
 * Features dark glass cards with hover effects and unified cyan accent.
 */

const portals = [
  {
    id: 'paciente',
    title: 'Portal Paciente',
    subtitle: 'Agenda tu cita con asistente IA',
    description: 'Chatbot inteligente para agendar citas médicas, consultar disponibilidad y realizar pagos de forma asistida.',
    icon: MessageCircle,
    path: '/login',
    role: 'paciente',
  },
  {
    id: 'doctor',
    title: 'Portal Doctor',
    subtitle: 'Dashboard clínico con copiloto IA',
    description: 'Visualiza tu agenda del día, gestiona consultas, accede a historiales clínicos y usa el copiloto IA para consultas rápidas.',
    icon: Stethoscope,
    path: '/login',
    role: 'medico',
  },
  {
    id: 'admin',
    title: 'Panel Admin',
    subtitle: 'Gestión central del sistema',
    description: 'Administra médicos, sedes, especialidades, horarios y monitorea todas las citas del sistema en tiempo real.',
    icon: Shield,
    path: '/login',
    role: 'admin',
  },
]

export default function PortalSelector() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative bg-slate-950">
      <BackgroundOrbs />

      {/* Hero */}
      <div className="text-center mb-12 relative z-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full mb-5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-400">
            Sistema médico integral
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight text-white">
          MediCore<span className="text-cyan-400">OS</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-normal leading-relaxed">
          Plataforma médica asistida por inteligencia artificial.
          <br />Selecciona tu portal para comenzar.
        </p>
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full relative z-10">
        {portals.map((portal, i) => {
          const Icon = portal.icon
          return (
            <div
              key={portal.id}
              className="glass-panel p-6 cursor-pointer group border border-slate-800 hover:border-cyan-500/50 animate-fade-in-up"
              style={{
                animationDelay: `${(i + 1) * 120}ms`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
              onClick={() => navigate(portal.path, { state: { role: portal.role } })}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-5 text-cyan-400 transition-transform group-hover:scale-105">
                <Icon className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text */}
              <h3 className="text-lg font-bold text-white mb-1">
                {portal.title}
              </h3>
              <p className="text-xs font-medium text-cyan-400 mb-3">
                {portal.subtitle}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal">
                {portal.description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 transition-all group-hover:gap-3">
                <span>Ingresar</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-slate-500 relative z-10">
        MediCore OS v1.0 — Sistema médico integral asistido por IA
      </p>
    </div>
  )
}

