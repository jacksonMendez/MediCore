import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Stethoscope, Shield, ArrowRight } from 'lucide-react'
import BackgroundOrbs from '../components/BackgroundOrbs'

/**
 * PortalSelector — Landing page to choose between Patient, Doctor, and Admin portals.
 * Clean glass cards with subtle hover effects.
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative bg-clinical-bg">
      <BackgroundOrbs />

      {/* Hero */}
      <div className="text-center mb-14 relative z-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-cyan animate-pulse" />
          <span className="text-xs text-text-muted">
            Sistema médico integral
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold mb-3 tracking-tight text-text-primary">
          MediCore<span className="text-primary-cyan">OS</span>
        </h1>
        <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
          Plataforma médica asistida por inteligencia artificial.
          <br />Selecciona tu portal para comenzar.
        </p>
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full relative z-10">
        {portals.map((portal, i) => {
          const Icon = portal.icon
          return (
            <div
              key={portal.id}
              className="glass-panel p-6 cursor-pointer group hover:border-primary-cyan/30 animate-fade-in-up"
              style={{
                animationDelay: `${(i + 1) * 120}ms`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
              onClick={() => navigate(portal.path, { state: { role: portal.role } })}
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-primary-cyan/10 flex items-center justify-center mb-5 text-primary-cyan transition-transform group-hover:scale-105">
                <Icon className="w-5 h-5" />
              </div>

              {/* Text */}
              <h3 className="text-base font-semibold text-text-primary mb-1">
                {portal.title}
              </h3>
              <p className="text-xs text-primary-cyan mb-3">
                {portal.subtitle}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed mb-6">
                {portal.description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-xs font-medium text-primary-cyan transition-all group-hover:gap-3">
                <span>Ingresar</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="mt-14 text-xs text-text-muted relative z-10">
        MediCore OS v1.0 — Sistema médico integral asistido por IA
      </p>
    </div>
  )
}
