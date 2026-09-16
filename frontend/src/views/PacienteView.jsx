import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Plus,
  Clock,
  MessageCircle,
  CreditCard,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  MapPin,
  Stethoscope,
  Check,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('medicore_token')
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

export default function PacienteView() {
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'citas'
  const [showDrawer, setShowDrawer] = useState(true)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      emisor: 'asistente',
      contenido:
        '🏥 ¡Hola! Soy **MediCore**, tu asistente médico virtual.\n\nPuedo ayudarte a:\n\n• 📋 Agendar citas médicas (especialista hombre o mujer)\n• ⏰ Consultar horarios reales disponibles\n• 💳 Revisar tus citas agendadas y realizar pagos en línea\n\n¿En qué puedo ayudarte hoy?',
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

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = {
      id: Date.now(),
      emisor: 'usuario',
      contenido: input.trim(),
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
          contenido:
            '⚠️ No se pudo conectar con el servidor. Por favor verifica tu conexión.',
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
          '🏥 ¡Hola de nuevo! ¿En qué puedo ayudarte hoy?\n\nPuedo buscar disponibilidad de citas, filtrar doctores por género, o responder sobre tus citas en el sistema.',
      },
    ])
    setActiveTab('chat')
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

  // Group chat sessions by date category: Hoy, Ayer, Anteriores
  const groupSessions = (list) => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups = { Hoy: [], Ayer: [], Anteriores: [] }

    list.forEach((s) => {
      const d = new Date(s.creado_en).toDateString()
      if (d === today) {
        groups.Hoy.push(s)
      } else if (d === yesterday) {
        groups.Ayer.push(s)
      } else {
        groups.Anteriores.push(s)
      }
    })

    return groups
  }

  const groupedSessions = groupSessions(sessions)

  return (
    <div className="h-screen pt-16 flex flex-col bg-slate-100 font-sans overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Drawer Colapsable Sidebar */}
        <aside
          className={`flex flex-col h-full bg-white/75 backdrop-blur-2xl border-r border-white/80 transition-all duration-300 z-30 relative shrink-0 ${
            showDrawer
              ? 'w-80 p-4 shadow-xl opacity-100'
              : 'w-0 p-0 opacity-0 border-none overflow-hidden pointer-events-none'
          }`}
        >
          {/* Header Drawer */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-700" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Historial de Chats
              </h3>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors"
              title="Ocultar panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Botón "+ Nuevo Chat" */}
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md shadow-cyan-900/10 hover:scale-[1.02] transition-all mb-4"
          >
            <Plus className="w-4 h-4" />
            Nuevo Chat
          </button>

          {/* Grouped Session List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {Object.entries(groupedSessions).map(([category, items]) => {
              if (items.length === 0) return null
              return (
                <div key={category} className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2">
                    {category}
                  </span>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => loadSessionMessages(s.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                        sesionId === s.id && activeTab === 'chat'
                          ? 'bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-300/80 shadow-xs'
                          : 'bg-white/40 hover:bg-white/80 border-white/60 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-500">
                          {new Date(s.creado_en).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                        {s.ultimo_mensaje || 'Conversación vacía'}
                      </p>
                    </button>
                  ))}
                </div>
              )
            })}

            {sessions.length === 0 && (
              <div className="text-center py-8 px-4 border border-dashed border-slate-300/80 rounded-2xl bg-white/20">
                <MessageCircle className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                <p className="text-xs text-slate-500 font-medium">
                  No hay conversaciones previas
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Panel Principal */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50">
          {/* Top Control Bar */}
          <div className="bg-white/70 border-b border-white/80 px-6 py-3 flex items-center justify-between backdrop-blur-2xl shadow-xs z-10 shrink-0">
            <div className="flex items-center gap-3">
              {/* Drawer Toggle Button */}
              {!showDrawer && (
                <button
                  onClick={() => setShowDrawer(true)}
                  className="p-2 rounded-2xl bg-white border border-white/80 text-cyan-700 shadow-xs hover:bg-cyan-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Mostrar conversaciones"
                >
                  <PanelLeft className="w-4 h-4 text-cyan-600" />
                  <span>Historial</span>
                </button>
              )}

              {/* Navigation Tabs */}
              <div className="flex bg-slate-200/60 p-1 rounded-2xl border border-white/60">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'chat'
                      ? 'bg-white text-cyan-700 shadow-sm border border-white/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  Asistente IA
                </button>
                <button
                  onClick={() => {
                    setActiveTab('citas')
                    loadMisCitas()
                  }}
                  className={`flex items-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'citas'
                      ? 'bg-white text-teal-700 shadow-sm border border-white/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Mis Citas
                </button>
              </div>
            </div>

            <button
              onClick={startNewChat}
              className="hidden sm:flex items-center gap-1.5 bg-white/80 hover:bg-white border border-white/90 text-slate-700 hover:text-cyan-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-600" />
              Nuevo Chat
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'chat' ? (
            /* VISTA: ASISTENTE IA (CHAT) */
            <div className="flex-1 flex flex-col h-full overflow-hidden max-w-4xl w-full mx-auto">
              {/* Messages scroll area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex ${
                      msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[82%] p-4 ${
                        msg.emisor === 'usuario'
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-3xl rounded-tr-none shadow-md shadow-cyan-900/10 font-medium'
                          : 'bg-white/85 border border-white/90 text-slate-800 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-xl'
                      }`}
                    >
                      <p
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(msg.contenido),
                        }}
                      />
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/85 border border-white/90 px-5 py-4 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-xl">
                      <div className="flex items-center gap-2 text-cyan-700 text-xs font-semibold">
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                        <span>MediCore consultando información clínica...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Fixed Bottom Input Bar */}
              <div className="p-4 bg-white/40 border-t border-white/80 backdrop-blur-2xl shrink-0">
                <div className="bg-white/90 border border-white/90 rounded-2xl p-2 flex items-center gap-3 shadow-lg backdrop-blur-2xl">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe tu mensaje... (ej: 'Cuáles son mis citas agendadas')"
                    className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white p-3 rounded-xl shrink-0 disabled:opacity-40 transition-all shadow-md hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center mt-2 text-[11px] text-slate-500 font-medium">
                  MediCore OS — Portal Oficial de Inteligencia Clínica. Respuestas concisas directo desde Supabase.
                </p>
              </div>
            </div>
          ) : (
            /* VISTA: MIS CITAS (GESTIÓN Y PAGOS SANDBOX) */
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto custom-scrollbar">
              {/* Header Citas */}
              <div className="flex items-center justify-between mb-6 bg-white/70 p-5 rounded-3xl border border-white/90 backdrop-blur-xl shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-teal-600" />
                    Mis Citas Médicas
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Gestión integral de citas y pagos simulados con Sandbox Wompi.
                  </p>
                </div>

                <button
                  onClick={loadMisCitas}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingCitas ? 'animate-spin text-teal-600' : ''}`}
                  />
                  Actualizar
                </button>
              </div>

              {/* Toast de pago exitoso */}
              {paymentSuccessCitaId && (
                <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3 animate-fade-in shadow-md">
                  <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">¡Pago Sandbox Aprobado!</p>
                    <p className="text-xs text-teal-700">
                      La cita se ha confirmado automáticamente en Supabase PostgreSQL.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid de Citas */}
              {loadingCitas ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-semibold text-slate-600">
                      Cargando historial de citas...
                    </p>
                  </div>
                </div>
              ) : citas.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center max-w-sm p-8 bg-white/70 border border-white/90 rounded-3xl shadow-xs">
                    <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      No tienes citas agendadas
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Solicita una cita en la pestaña "Asistente IA" para verla registrada aquí.
                    </p>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold py-2 px-4 rounded-xl text-xs"
                    >
                      Ir al Asistente IA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {citas.map((c) => {
                    const isPending = c.estado === 'pendiente_pago'
                    const isConfirmed = c.estado === 'confirmada'

                    return (
                      <div
                        key={c.id}
                        className="bg-white/80 border border-white/90 rounded-3xl p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                              {c.medico_nombre?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                                {c.especialidad_nombre || 'Medicina General'}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 mt-1">
                                {c.medico_nombre || 'Doctor Asignado'}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{c.sede_nombre || 'Sede Principal'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Badges de Estado */}
                          <div>
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente de Pago
                              </span>
                            )}
                            {isConfirmed && (
                              <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 border border-teal-300 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                Confirmada
                              </span>
                            )}
                            {!isPending && !isConfirmed && (
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                                {c.estado}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detalle y Botón Sandbox */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 font-semibold block">
                                Fecha
                              </span>
                              <span className="text-slate-800 font-bold text-sm">
                                {formatFecha(c.fecha_hora)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block">
                                Hora
                              </span>
                              <span className="text-slate-800 font-bold text-sm">
                                {formatHora(c.fecha_hora)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                            {isPending && (
                              <button
                                onClick={() => handlePagarCita(c.id)}
                                disabled={payingCitaId === c.id}
                                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-white font-bold py-2.5 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 transition-all hover:scale-105 disabled:opacity-50"
                              >
                                {payingCitaId === c.id ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Procesando Pago Wompi...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4" />
                                    Pagar Cita (Sandbox Wompi)
                                  </>
                                )}
                              </button>
                            )}

                            {isConfirmed && (
                              <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-2 rounded-xl border border-teal-200">
                                <Check className="w-4 h-4 text-teal-600" />
                                Cita Pagada y Lista
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
