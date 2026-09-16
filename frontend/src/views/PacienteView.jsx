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
  User,
  MapPin,
  Stethoscope,
  DollarSign,
  Check,
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
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      emisor: 'asistente',
      contenido:
        '🏥 ¡Hola! Soy **MediCore**, tu asistente médico virtual.\n\nPuedo ayudarte a:\n\n• 📋 Agendar citas médicas (¡ahora puedes pedir doctor o doctora!)\n• ⏰ Consultar disponibilidad de horarios por género o especialidad\n• 💳 Consultar tus citas agendadas y realizar pagos en línea\n\n¿En qué puedo ayudarte hoy?',
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
          '🏥 ¡Hola de nuevo! ¿En qué puedo ayudarte?\n\nPuedo buscar disponibilidad de citas, filtrar por especialista hombre o mujer, agendar consultas o revisar tus citas programadas.',
      },
    ])
    setActiveTab('chat')
  }

  const handlePagarCita = async (citaId) => {
    setPayingCitaId(citaId)
    try {
      // 1. Initiate Sandbox payment
      const pagoData = await apiFetch('/pagos/simular', {
        method: 'POST',
        body: JSON.stringify({
          cita_id: citaId,
          metodo_pago: 'wompi_sandbox',
        }),
      })

      if (pagoData && pagoData.referencia) {
        // 2. Process sandbox webhook to instantly confirm appointment
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
      alert('Error al conectar con la pasarela de pagos Sandbox.')
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

  return (
    <div className="mt-16 h-[calc(100vh-4rem)] p-4 max-w-7xl mx-auto flex gap-4 relative z-10">
      {/* Sidebar Izquierdo: Historial y Navegación */}
      <div className="w-80 flex flex-col glass-panel-strong border border-white/80 backdrop-blur-2xl bg-white/75 rounded-3xl p-4 shadow-xl shrink-0">
        {/* Pestañas de Navegación */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1.5 rounded-2xl mb-4 border border-white/60">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-white text-cyan-700 shadow-md border border-white/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-600" />
            Asistente IA
          </button>
          <button
            onClick={() => {
              setActiveTab('citas')
              loadMisCitas()
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'citas'
                ? 'bg-white text-cyan-700 shadow-md border border-white/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Calendar className="w-4 h-4 text-teal-600" />
            Mis Citas
          </button>
        </div>

        {/* Botón "+ Nueva Consulta" */}
        <button
          onClick={startNewChat}
          className="w-full glass-btn glass-btn-primary py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold mb-5 shadow-lg shadow-cyan-900/10 hover:scale-[1.02] transition-transform"
        >
          <Plus className="w-4 h-4" />
          Nueva Consulta
        </button>

        {/* Subtítulo Conversaciones */}
        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Historial de Chats
          </span>
          <span className="text-xs bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-semibold">
            {sessions.length}
          </span>
        </div>

        {/* Lista de Sesiones de Chat */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                sesionId === s.id && activeTab === 'chat'
                  ? 'bg-gradient-to-r from-cyan-50/90 to-teal-50/90 border-cyan-300/80 shadow-sm'
                  : 'bg-white/40 hover:bg-white/70 border-white/60 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-[11px] font-medium text-slate-500">
                    {new Date(s.creado_en).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-relaxed">
                {s.ultimo_mensaje || 'Conversación sin mensajes'}
              </p>
            </button>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8 px-4 border border-dashed border-slate-300/80 rounded-2xl bg-white/20">
              <MessageCircle className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-xs text-slate-500 font-medium">
                Aún no tienes conversaciones grabadas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Principal */}
      <div className="flex-1 flex flex-col glass-panel-strong border border-white/80 backdrop-blur-2xl bg-white/70 rounded-3xl overflow-hidden shadow-2xl">
        {activeTab === 'chat' ? (
          /* VISTA: ASISTENTE IA (CHAT) */
          <div className="flex-1 flex flex-col h-full max-w-4xl w-full mx-auto">
            {/* Header del Chat */}
            <div className="bg-white/60 border-b border-white/80 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center shadow-md shadow-cyan-600/20">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Asistente MediCore OS
                    <span className="bg-cyan-100 text-cyan-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-200">
                      Groq LLM
                    </span>
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-slate-500">
                      En línea — IA Clínica 24/7
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={startNewChat}
                className="glass-btn glass-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border border-white/80"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-600" />
                Nuevo Chat
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${
                    msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[78%] p-4 ${
                      msg.emisor === 'usuario'
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-3xl rounded-tr-none shadow-lg shadow-cyan-900/10'
                        : 'bg-white/85 border border-white/90 text-slate-800 rounded-3xl rounded-tl-none shadow-md backdrop-blur-md'
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
                  <div className="bg-white/85 border border-white/90 px-5 py-4 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2 text-cyan-700 text-xs font-semibold">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                      <span>MediCore consultando la agenda...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white/40 border-t border-white/80 backdrop-blur-xl">
              <div className="bg-white/80 border border-white/90 rounded-2xl p-2 flex items-center gap-3 shadow-lg backdrop-blur-2xl">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ej: Quiero una cita de cardiología con una doctora para el viernes..."
                  className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="glass-btn glass-btn-primary p-3 rounded-xl shrink-0 disabled:opacity-40 transition-all hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center mt-2.5 text-[11px] text-slate-500 font-medium">
                MediCore OS — Asistente Inteligente de Citas Médicas. Todos los
                datos están resguardados por Supabase PostgreSQL.
              </p>
            </div>
          </div>
        ) : (
          /* VISTA: MIS CITAS (GESTIÓN Y PAGOS SANDBOX) */
          <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 max-w-4xl w-full mx-auto">
            {/* Header Citas */}
            <div className="flex items-center justify-between mb-6 bg-white/60 p-5 rounded-2xl border border-white/80 backdrop-blur-xl shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  Mis Citas Médicas
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Revisa el estado de tus consultas y gestiona los pagos en línea
                  con Sandbox Wompi.
                </p>
              </div>

              <button
                onClick={loadMisCitas}
                className="glass-btn glass-btn-secondary py-2 px-3 rounded-xl text-xs flex items-center gap-2 border border-white/80"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingCitas ? 'animate-spin text-teal-600' : ''}`}
                />
                Actualizar
              </button>
            </div>

            {/* Success Toast / Notification */}
            {paymentSuccessCitaId && (
              <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3 animate-fade-in shadow-md">
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold">¡Pago Sandbox Aprobado!</p>
                  <p className="text-xs text-teal-700">
                    Tu cita médica ha sido confirmada en el sistema.
                  </p>
                </div>
              </div>
            )}

            {/* Listado de Citas */}
            {loadingCitas ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-600">
                    Cargando tus citas desde la base de datos...
                  </p>
                </div>
              </div>
            ) : citas.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="text-center max-w-sm p-8 bg-white/50 border border-white/80 rounded-3xl shadow-sm">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    No tienes citas programadas
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Usa el asistente virtual en la sección "Asistente IA" para buscar
                    horarios y agendar tu consulta.
                  </p>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="glass-btn glass-btn-primary py-2.5 px-4 rounded-xl text-xs font-semibold"
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
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
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

                        {/* Estado Badge */}
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

                      {/* Detalles & Acción */}
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

                        {/* Acciones de Pago */}
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
      </div>
    </div>
  )
}

