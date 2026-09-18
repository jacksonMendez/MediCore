import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Plus,
  Calendar,
  MessageCircle,
  CreditCard,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  MapPin,
  Stethoscope,
  PanelLeft,
  LogOut,
  Trash2,
  X,
} from 'lucide-react'

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

export default function PacienteView({ onLogout }) {
  const navigate = useNavigate()
  const user = getUser()

  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      emisor: 'asistente',
      contenido:
        '¡Hola! Soy **MediCore**, tu asistente médico.\n\nPuedo ayudarte a:\n• Agendar citas médicas\n• Buscar doctores por especialidad o género\n• Consultar tus citas programadas',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sesionId, setSesionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [citas, setCitas] = useState([])
  const [loadingCitas, setLoadingCitas] = useState(false)
  const [payingCitaId, setPayingCitaId] = useState(null)
  const [paymentSuccessCitaId, setPaymentSuccessCitaId] = useState(null)
  const [deletingSessionId, setDeletingSessionId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // session id to confirm delete

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    loadSessions()
    loadMisCitas()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await apiFetch('/chat/sesiones')
      if (Array.isArray(data)) setSessions(data)
    } catch (e) {
      console.error('Error cargando sesiones:', e)
    }
  }

  const loadMisCitas = async () => {
    setLoadingCitas(true)
    try {
      const data = await apiFetch('/citas/mis-citas')
      if (Array.isArray(data)) setCitas(data)
    } catch (e) {
      console.error('Error cargando citas:', e)
    } finally {
      setLoadingCitas(false)
    }
  }

  const loadSessionMessages = async (sid) => {
    try {
      const data = await apiFetch(`/chat/sesiones/${sid}/mensajes`)
      if (Array.isArray(data)) {
        setMessages(data)
        setSesionId(sid)
        setActiveTab('chat')
      }
    } catch (e) {
      console.error('Error cargando mensajes de sesión:', e)
    }
  }

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation()
    if (confirmDelete !== sid) {
      setConfirmDelete(sid)
      return
    }
    setConfirmDelete(null)
    setDeletingSessionId(sid)
    try {
      await apiFetch(`/chat/sesiones/${sid}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== sid))
      if (sesionId === sid) {
        startNewChat()
      }
    } catch (e) {
      // If endpoint doesn't exist, just remove from UI
      setSessions((prev) => prev.filter((s) => s.id !== sid))
      if (sesionId === sid) startNewChat()
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handleSend = async (textToSend) => {
    const query = textToSend || input
    if (!query.trim() || loading) return

    const userMsg = {
      id: Date.now(),
      emisor: 'usuario',
      contenido: query.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await apiFetch('/chat/mensaje', {
        method: 'POST',
        body: JSON.stringify({
          mensaje: userMsg.contenido,
          sesion_id: sesionId || undefined,
        }),
      })

      if (data.sesion_id) setSesionId(data.sesion_id)

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'asistente',
          contenido: data.respuesta || data.detail || 'Sin respuesta del servidor.',
        },
      ])
      loadSessions()
      loadMisCitas()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'asistente',
          contenido: '⚠️ No se pudo conectar con el servidor. Por favor verifica tu conexión.',
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const startNewChat = () => {
    setSesionId(null)
    setMessages([
      {
        id: 'welcome',
        emisor: 'asistente',
        contenido:
          '¡Hola de nuevo! ¿En qué puedo ayudarte hoy?\n\nPuedo buscar disponibilidad de citas, filtrar doctores por género, o consultar tus citas programadas.',
      },
    ])
    setActiveTab('chat')
  }

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('medicore_token')
      localStorage.removeItem('medicore_user')
      navigate('/login')
    }
  }

  const handlePagarCita = async (citaId) => {
    setPayingCitaId(citaId)
    try {
      const pagoData = await apiFetch('/pagos/simular', {
        method: 'POST',
        body: JSON.stringify({
          cita_id: citaId,
          metodo_pago: 'wompi_sandbox',
        }),
      })

      if (pagoData && pagoData.referencia) {
        await apiFetch('/pagos/webhook', {
          method: 'POST',
          body: JSON.stringify({
            referencia: pagoData.referencia,
            estado: 'aprobado',
          }),
        })
        setPaymentSuccessCitaId(citaId)
        setTimeout(() => setPaymentSuccessCitaId(null), 4000)
        await loadMisCitas()
      } else {
        alert(pagoData.detail || 'No se pudo generar la referencia de pago.')
      }
    } catch (e) {
      console.error('Error al procesar el pago sandbox:', e)
      alert('Error al conectar con la pasarela Sandbox.')
    } finally {
      setPayingCitaId(null)
    }
  }

  const renderMarkdown = (text) => {
    if (!text) return ''
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• /gm, '&bull; ')
      .replace(/\n/g, '<br/>')
  }

  const formatFecha = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatHora = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const initials = user?.nombre_completo
    ? user.nombre_completo.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'P'

  const pendingCitasCount = citas.filter((c) => c.estado === 'pendiente_pago').length

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0F1724] text-slate-200 font-sans">

      {/* ── SIDEBAR ── */}
      <aside
        className={`flex flex-col h-full border-r border-white/[0.07] transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-0 opacity-0 overflow-hidden pointer-events-none'
        }`}
        style={{ background: '#111927' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4FA8A0] flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-[#0F1724]" />
            </div>
            <span className="text-sm font-semibold text-white">
              Medi<span className="text-[#4FA8A0]">Core</span>
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Nueva Consulta */}
        <div className="px-3 pt-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva consulta
          </button>
        </div>

        {/* Nav tabs */}
        <div className="px-3 pt-3 space-y-0.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeTab === 'chat'
                ? 'bg-[#4FA8A0]/15 text-[#4FA8A0]'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Asistente IA
          </button>
          <button
            onClick={() => setActiveTab('citas')}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeTab === 'citas'
                ? 'bg-[#4FA8A0]/15 text-[#4FA8A0]'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Calendar className="w-3.5 h-3.5" />
              Mis citas
            </span>
            {pendingCitasCount > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {pendingCitasCount}
              </span>
            )}
          </button>
        </div>

        {/* Historial */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 custom-scrollbar">
          {sessions.length > 0 && (
            <p className="text-[10px] text-slate-600 px-1 mb-2 uppercase tracking-wider">
              Conversaciones
            </p>
          )}
          <div className="space-y-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  sesionId === s.id && activeTab === 'chat'
                    ? 'bg-white/[0.07] text-slate-200'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                }`}
                onClick={() => loadSessionMessages(s.id)}
              >
                <MessageCircle className="w-3 h-3 shrink-0 opacity-60" />
                <span className="truncate flex-1 text-[11px]">
                  {s.ultimo_mensaje || 'Consulta previa'}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  disabled={deletingSessionId === s.id}
                  className={`shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${
                    confirmDelete === s.id
                      ? 'opacity-100 text-red-400'
                      : 'text-slate-600 hover:text-red-400'
                  }`}
                  title={confirmDelete === s.id ? 'Clic para confirmar borrado' : 'Borrar conversación'}
                >
                  {deletingSessionId === s.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : confirmDelete === s.id ? (
                    <X className="w-3 h-3" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-[11px] text-slate-600 text-center py-4">Sin historial</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#4FA8A0]/20 text-[#4FA8A0] text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-slate-300 truncate leading-none">
                {user?.nombre_completo || 'Paciente'}
              </p>
              <span className="text-[10px] text-slate-600">paciente</span>
            </div>
          </div>
          <button
            onClick={handleLogoutAction}
            className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06] shrink-0" style={{ background: '#111927' }}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-medium text-slate-300">
              {activeTab === 'citas' ? 'Mis citas médicas' : 'Asistente Médico IA'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C77B]" />
            <span>Groq LLM</span>
          </div>
        </header>

        {/* ── CITAS VIEW ── */}
        {activeTab === 'citas' ? (
          <div className="flex-1 overflow-y-auto p-5 max-w-3xl w-full mx-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-200">Citas agendadas</h2>
              <button
                onClick={loadMisCitas}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingCitas ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {paymentSuccessCitaId && (
              <div className="mb-4 p-3 rounded-lg bg-[#34C77B]/10 border border-[#34C77B]/20 text-[#34C77B] flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0" />
                ¡Pago confirmado! La cita ha sido activada exitosamente.
              </div>
            )}

            {loadingCitas ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#4FA8A0]/30 border-t-[#4FA8A0] rounded-full animate-spin" />
              </div>
            ) : citas.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-1">Sin citas registradas</p>
                <p className="text-xs text-slate-600 mb-4">
                  Usa el asistente de IA para agendar tu cita
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="text-xs bg-[#4FA8A0] text-[#0F1724] font-semibold px-4 py-2 rounded-lg"
                >
                  Ir al asistente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {citas.map((c) => {
                  const isPending = c.estado === 'pendiente_pago'
                  const isConfirmed = c.estado === 'confirmada'
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl p-4 border border-white/[0.06]"
                      style={{ background: '#111927', borderLeft: `3px solid ${isConfirmed ? '#34C77B' : isPending ? '#F0B429' : '#5A7A94'}` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] text-[#4FA8A0] bg-[#4FA8A0]/10 px-2 py-0.5 rounded-md">
                            {c.especialidad_nombre || 'Medicina General'}
                          </span>
                          <p className="text-sm font-medium text-slate-200 mt-1">
                            {c.medico_nombre || 'Doctor Asignado'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {c.sede_nombre || 'Sede Principal'}
                          </p>
                        </div>
                        <span className={`badge ${isConfirmed ? 'badge-confirmed' : isPending ? 'badge-pending' : ''}`}>
                          {isConfirmed && <CheckCircle className="w-3 h-3" />}
                          {isPending && <AlertCircle className="w-3 h-3" />}
                          {isConfirmed ? 'Confirmada' : isPending ? 'Pend. pago' : c.estado}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {formatFecha(c.fecha_hora)} · {formatHora(c.fecha_hora)}
                        </span>
                        {isPending && (
                          <button
                            onClick={() => handlePagarCita(c.id)}
                            disabled={payingCitaId === c.id}
                            className="flex items-center gap-1.5 bg-[#4FA8A0] hover:bg-[#5DBEB7] text-[#0F1724] font-semibold py-1.5 px-3 rounded-lg text-xs disabled:opacity-50 transition-colors"
                          >
                            {payingCitaId === c.id ? (
                              <><RefreshCw className="w-3 h-3 animate-spin" /> Procesando...</>
                            ) : (
                              <><CreditCard className="w-3 h-3" /> Pagar (Wompi)</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── CHAT VIEW ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
              <div className="max-w-2xl mx-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex gap-3 ${msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.emisor === 'asistente' && (
                      <div className="w-7 h-7 rounded-lg bg-[#4FA8A0]/15 text-[#4FA8A0] flex items-center justify-center shrink-0 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                        msg.emisor === 'usuario'
                          ? 'bg-[#4FA8A0] text-[#0F1724] font-medium rounded-tr-sm'
                          : 'bg-[#1A2736] text-slate-200 border border-white/[0.06] rounded-tl-sm'
                      }`}
                    >
                      <p
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.contenido) }}
                      />
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-[#4FA8A0]/15 text-[#4FA8A0] flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#1A2736] border border-white/[0.06] px-4 py-3 rounded-xl rounded-tl-sm">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Sugerencias rápidas (solo al inicio) */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2">
                <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
                  {[
                    'Quiero agendar una cita médica',
                    'Cita con una doctora',
                    'Disponibilidad para hoy',
                    'Ver mis citas',
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      onClick={() => handleSend(sugg)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 bg-[#1A2736] hover:bg-[#1E2F42] border border-white/[0.06] px-3 py-1.5 rounded-full transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 bg-[#1A2736] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-[#4FA8A0]/40 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe tu mensaje..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                    className="w-8 h-8 bg-[#4FA8A0] hover:bg-[#5DBEB7] text-[#0F1724] rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-700 mt-2">
                  MediCore IA — Asistente administrativo clínico. Consulta siempre a un médico profesional.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
