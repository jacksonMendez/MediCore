import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Stethoscope, Shield, ArrowRight } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * PortalSelector — Landing page to choose between Patient, Doctor, and Admin portals.
 * Features glass cards with hover effects and gradient accents.
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
    gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)',
    accentColor: '#0891b2',
  },
  {
    id: 'doctor',
    title: 'Portal Doctor',
    subtitle: 'Dashboard clínico con copiloto IA',
    description: 'Visualiza tu agenda del día, gestiona consultas, accede a historiales clínicos y usa el copiloto IA para consultas rápidas.',
    icon: Stethoscope,
    path: '/login',
    role: 'medico',
    gradient: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
    accentColor: '#0d9488',
  },
  {
    id: 'admin',
    title: 'Panel Admin',
    subtitle: 'Gestión central del sistema',
    description: 'Administra médicos, sedes, especialidades, horarios y monitorea todas las citas del sistema en tiempo real.',
    icon: Shield,
    path: '/login',
    role: 'admin',
    gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    accentColor: '#0284c7',
  },
]

export default function PortalSelector() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative">
      <BackgroundOrbs />

      {/* Hero */}
      <div className="text-center mb-12 relative z-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 glass-panel-sm px-4 py-2 mb-6">
          <div className="w-2 h-2 rounded-full" style={{ background: '#0891b2' }} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
            Sistema Médico Integral
          </span>
        </div>
        <h1 className="text-5xl font-bold mb-3 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Medi<span style={{ color: 'var(--color-surgical-cyan)' }}>Core</span>{' '}
          <span style={{ color: 'var(--color-medical-blue)' }}>OS</span>
        </h1>
        <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
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
              className="glass-panel p-6 cursor-pointer group animate-fade-in-up"
              style={{
                animationDelay: `${(i + 1) * 150}ms`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
              onClick={() => navigate(portal.path, { state: { role: portal.role } })}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: portal.gradient }}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {portal.title}
              </h3>
              <p className="text-sm font-medium mb-3" style={{ color: portal.accentColor }}>
                {portal.subtitle}
              </p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                {portal.description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                   style={{ color: portal.accentColor }}>
                <span>Ingresar</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs relative z-10" style={{ color: 'var(--color-text-muted)' }}>
        MediCore OS v1.0 — Sistema Médico Integral Asistido por IA
      </p>
    </div>
  )
}
