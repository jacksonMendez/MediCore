import React, { useState, useEffect, useRef } from 'react'
import {
  Calendar, Users, CheckCircle, XCircle, Clock,
  FileText, Send, MessageCircle, ChevronDown, ChevronUp,
  Stethoscope, Activity,
} from 'lucide-react'
import StatCard from '../components/StatCard'

const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('medicore_token')
}

function getUser() {
  const u = localStorage.getItem('medicore_user')
  return u ? JSON.parse(u) : null
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  })
  return res.json()
}

/**
 * DoctorView — Clinical dashboard with daily schedule, patient info, and AI copilot.
 */
export default function DoctorView() {
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCita, setExpandedCita] = useState(null)
  const [showCopilot, setShowCopilot] = useState(false)
  const [copilotMessages, setCopilotMessages] = useState([
    {
      emisor: 'asistente',
      contenido: '🩺 Copiloto IA listo. Puedo consultar tu agenda, buscar historial de pacientes o resolver dudas administrativas. ¿Qué necesitas?',
    },
  ])
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotSesionId, setCopilotSesionId] = useState(null)
  const copilotEndRef = useRef(null)

  useEffect(() => {
    loadAgenda()
  }, [])

  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [copilotMessages])

  const loadAgenda = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/citas/mis-citas')
      if (Array.isArray(data)) setCitas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const todayCitas = citas.filter((c) => {
    const citaDate = new Date(c.fecha_hora).toDateString()
    return citaDate === new Date().toDateString()
  })

  const stats = {
    total: todayCitas.length,
    confirmadas: todayCitas.filter((c) => c.estado === 'confirmada').length,
    atendidas: todayCitas.filter((c) => c.estado === 'atendida').length,
    pendientes: todayCitas.filter((c) => c.estado === 'pendiente_pago').length,
    canceladas: todayCitas.filter((c) => c.estado === 'cancelada').length,
  }

  const statusBadge = (estado) => {
    const map = {
      confirmada: 'badge badge-confirmed',
      pendiente_pago: 'badge badge-pending',
      cancelada: 'badge badge-cancelled',
      atendida: 'badge badge-attended',
      no_asistio: 'badge badge-cancelled',
    }
    const labels = {
      confirmada: 'Confirmada',
      pendiente_pago: 'Pend. Pago',
      cancelada: 'Cancelada',
      atendida: 'Atendida',
      no_asistio: 'No Asistió',
    }
    return <span className={map[estado] || 'badge'}>{labels[estado] || estado}</span>
  }

  const sendCopilotMessage = async () => {
    if (!copilotInput.trim() || copilotLoading) return

    const userMsg = { emisor: 'usuario', contenido: copilotInput.trim() }
    setCopilotMessages((prev) => [...prev, userMsg])
    setCopilotInput('')
    setCopilotLoading(true)

    try {
      const data = await apiFetch('/chat/mensaje', {
        method: 'POST',
        body: JSON.stringify({
          mensaje: userMsg.contenido,
          sesion_id: copilotSesionId || undefined,
        }),
      })
      if (data.sesion_id) setCopilotSesionId(data.sesion_id)
      setCopilotMessages((prev) => [
        ...prev,
        { emisor: 'asistente', contenido: data.respuesta || data.detail || 'Sin respuesta.' },
      ])
    } catch (e) {
      setCopilotMessages((prev) => [
        ...prev,
        { emisor: 'asistente', contenido: '⚠️ Error al conectar con el servidor.' },
      ])
    } finally {
      setCopilotLoading(false)
    }
  }

  const changeStatus = async (citaId, newStatus) => {
    try {
      await apiFetch(`/citas/${citaId}/estado?nuevo_estado=${newStatus}`, { method: 'PATCH' })
      loadAgenda()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mt-16 p-6 max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard Clínico
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Citas Hoy" value={stats.total} color="cyan" delay={0} />
        <StatCard icon={CheckCircle} label="Confirmadas" value={stats.confirmadas} color="teal" delay={100} />
        <StatCard icon={Clock} label="Pendientes" value={stats.pendientes} color="amber" delay={200} />
        <StatCard icon={XCircle} label="Canceladas" value={stats.canceladas} color="rose" delay={300} />
      </div>

      {/* Appointments Table */}
      <div className="glass-panel p-6 animate-fade-in-up" style={{ animationDelay: '400ms', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Activity className="w-5 h-5" style={{ color: 'var(--color-surgical-cyan)' }} />
            Agenda del Día
          </h2>
          <button onClick={loadAgenda} className="glass-btn glass-btn-secondary text-xs">
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando agenda...</p>
          </div>
        ) : todayCitas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              No hay citas programadas para hoy
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Las citas aparecerán aquí cuando los pacientes las agenden
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {todayCitas.map((cita) => (
                  <React.Fragment key={cita.id}>
                    <tr className="cursor-pointer" onClick={() => setExpandedCita(expandedCita === cita.id ? null : cita.id)}>
                      <td className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {new Date(cita.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                               style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}>
                            {cita.paciente_nombre?.charAt(0) || 'P'}
                          </div>
                          <span>{cita.paciente_nombre || 'Paciente'}</span>
                        </div>
                      </td>
                      <td>{cita.motivo || 'Sin motivo especificado'}</td>
                      <td>{statusBadge(cita.estado)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {cita.estado === 'confirmada' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); changeStatus(cita.id, 'atendida') }}
                              className="glass-btn glass-btn-success text-xs py-1 px-2"
                            >
                              <CheckCircle className="w-3 h-3" /> Atender
                            </button>
                          )}
                          {expandedCita === cita.id
                            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                          }
                        </div>
                      </td>
                    </tr>
                    {expandedCita === cita.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="glass-panel-sm p-4 m-2 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Sede</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{cita.sede_nombre || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Especialidad</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{cita.especialidad_nombre || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Duración</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{cita.duracion_minutos} minutos</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Creada</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                  {new Date(cita.creado_en).toLocaleString('es-CO')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Appointments */}
      {citas.length > 0 && (
        <div className="glass-panel p-6 mt-6 animate-fade-in-up" style={{ animationDelay: '500ms', opacity: 0, animationFillMode: 'forwards' }}>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-5" style={{ color: 'var(--color-text-primary)' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--color-medical-blue)' }} />
            Todas las Citas ({citas.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Fecha & Hora</th>
                  <th>Paciente</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {citas.slice(0, 20).map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {new Date(c.fecha_hora).toLocaleString('es-CO', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>{c.paciente_nombre || 'Paciente'}</td>
                    <td>{c.motivo || '—'}</td>
                    <td>{statusBadge(c.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Copilot Floating Button */}
      <button
        onClick={() => setShowCopilot(!showCopilot)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #0891b2, #0284c7)',
          animation: showCopilot ? 'none' : 'pulse-glow 2s infinite',
        }}
      >
        <Stethoscope className="w-6 h-6 text-white" />
      </button>

      {/* AI Copilot Panel */}
      {showCopilot && (
        <div
          className="fixed bottom-24 right-6 z-50 glass-panel-strong animate-fade-in-up"
          style={{ width: '380px', maxHeight: '500px' }}
        >
          {/* Copilot Header */}
          <div className="p-4 flex items-center gap-3"
               style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0891b2, #0284c7)' }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Copiloto IA
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Asistente clínico inteligente
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-3 overflow-y-auto space-y-3" style={{ maxHeight: '320px' }}>
            {copilotMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                  msg.emisor === 'usuario' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}>
                  {msg.contenido}
                </div>
              </div>
            ))}
            {copilotLoading && (
              <div className="flex justify-start">
                <div className="chat-bubble-assistant px-3 py-2">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={copilotEndRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCopilotMessage()}
                placeholder="Pregunta al copiloto..."
                className="glass-input text-xs py-2 border-0 bg-transparent"
                style={{ backdropFilter: 'none' }}
              />
              <button
                onClick={sendCopilotMessage}
                disabled={copilotLoading || !copilotInput.trim()}
                className="glass-btn glass-btn-primary p-2 shrink-0 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
