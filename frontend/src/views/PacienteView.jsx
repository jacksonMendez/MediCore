import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Search,
  LogOut,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
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

export default function PacienteView() {
  const navigate = useNavigate()
  const user = getUser()

  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'citas'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      emisor: 'asistente',
      contenido:
        '🏥 ¡Hola! Soy **MediCore**, tu asistente médico virtual.\n\nPuedo ayudarte a agendar citas, buscar doctores por género, o revisar tus citas agendadas.',
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
          '🏥 ¡Hola de nuevo! ¿En qué puedo ayudarte hoy?\n\nPuedo buscar disponibilidad de citas, filtrar doctores por género, o consultar tus citas programadas.',
      },
    ])
    setActiveTab('chat')
  }

  const handleLogout = () => {
    localStorage.removeItem('medicore_token')
    localStorage.removeItem('medicore_user')
    navigate('/login')
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

  // Filtered session list
  const filteredSessions = sessions.filter((s) =>
    s.ultimo_mensaje?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // User initials
  const initials = user?.nombre_completo
    ? user.nombre_completo
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'P'

  const firstName = user?.nombre_completo?.split(' ')[0] || 'Paciente'

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-100 font-sans select-none relative">
      {/* ── BARRA LATERAL IZQUIERDA (GEMINI SIDEBAR) ────────────────── */}
      <aside
        className={`flex flex-col h-full bg-white/70 backdrop-blur-2xl border-r border-white/80 transition-all duration-300 z-30 shrink-0 ${
          sidebarOpen ? 'w-72 sm:w-80 p-4 shadow-xl opacity-100' : 'w-0 p-0 opacity-0 border-none overflow-hidden pointer-events-none'
        }`}
      >
        {/* Header Superior del Sidebar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-2xl bg-slate-200/50 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Colapsar menú"
          >
            <PanelLeft className="w-5 h-5 text-cyan-700" />
          </button>

          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            MediCore OS
          </span>
        </div>

        {/* Botón Destacado: "+ Nueva consulta" */}
        <button
          onClick={startNewChat}
          className="w-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-800 font-bold py-3 px-4 rounded-full flex items-center justify-start gap-3 text-xs shadow-xs transition-all mb-3 border border-white/80 hover:scale-[1.01]"
        >
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs">
            <Plus className="w-3.5 h-3.5 text-cyan-700" />
          </div>
          <span>Nueva consulta</span>
        </button>

        {/* Buscador de Conversaciones */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 text-xs pl-9 pr-3 py-2 rounded-2xl border border-white/80 placeholder-slate-400 text-slate-800 focus:outline-none backdrop-blur-md"
          />
        </div>

        {/* Botón Píldora Directo "Mis Citas Médicas" */}
        <button
          onClick={() => setActiveTab(activeTab === 'citas' ? 'chat' : 'citas')}
          className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all mb-4 border ${
            activeTab === 'citas'
              ? 'bg-teal-100 text-teal-800 border-teal-300 shadow-xs'
              : 'bg-white/50 hover:bg-white/90 text-slate-700 border-white/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Mis Citas Médicas</span>
          </div>
          <span className="bg-teal-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            {citas.length}
          </span>
        </button>

        {/* Historial Independiente "Recientes" */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Recientes
            </span>
          </div>

          {filteredSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center gap-2.5 border ${
                sesionId === s.id && activeTab === 'chat'
                  ? 'bg-white text-cyan-800 border-cyan-200/80 shadow-xs font-semibold'
                  : 'bg-transparent hover:bg-white/60 border-transparent text-slate-700'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="text-xs truncate font-medium flex-1">
                {s.ultimo_mensaje || 'Nueva conversación'}
              </span>
            </button>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-6 px-3 border border-dashed border-slate-300/80 rounded-2xl bg-white/20">
              <p className="text-xs text-slate-400 font-medium">
                Sin conversaciones previas
              </p>
            </div>
          )}
        </div>

        {/* Footer del Sidebar: Ficha de Usuario Autenticado */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md border border-white/80">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.nombre_completo || 'Paciente Demo'}
              </p>
              <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase">
                {user?.rol || 'paciente'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-2xl bg-white/60 hover:bg-rose-50 border border-white/80 text-slate-500 hover:text-rose-600 transition-all shadow-xs"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL CENTRAL (CANVAS DE GEMINI) ────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50">
        {/* Header Superior Minimalista */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-white/60 bg-white/40 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-2xl bg-white/80 hover:bg-white text-cyan-700 border border-white/90 shadow-xs transition-colors"
                title="Abrir menú"
              >
                <PanelLeft className="w-5 h-5 text-cyan-700" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                MediCore<span className="text-cyan-600">OS</span>
              </h1>
              <span className="inline-flex items-center gap-1 bg-white/80 text-slate-700 border border-white/90 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                Modo Clínico Groq IA
              </span>
            </div>
          </div>

          {/* Estado de conexión */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>En línea</span>
          </div>
        </header>

        {/* Contenido Dinámico (Chat vs Citas) */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Si no hay conversación iniciada: Gran Saludo Estilo Gemini (Empty State) */}
            {messages.length <= 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl w-full">
                  {/* Saludo Tipográfico Principal */}
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-cyan-600 via-teal-600 to-sky-600 bg-clip-text text-transparent">
                    Hola, {firstName}
                  </h2>
                  <p className="text-xl sm:text-2xl font-bold text-slate-400 mb-8">
                    ¿En qué te puedo ayudar hoy?
                  </p>

                  {/* Sugerencias Rápidas en Grilla (Action Chips) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                    <button
                      onClick={() => handleSend('Quiero agendar una cita médica')}
                      className="p-4 rounded-3xl bg-white/70 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] text-xs"
                    >
                      <span className="font-bold text-slate-900 block mb-0.5">
                        📋 Agendar cita médica
                      </span>
                      <span className="text-slate-500">
                        Busca disponibilidad por especialidad y hora.
                      </span>
                    </button>

                    <button
                      onClick={() => handleSend('Quiero una cita con una doctora')}
                      className="p-4 rounded-3xl bg-white/70 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] text-xs"
                    >
                      <span className="font-bold text-slate-900 block mb-0.5">
                        👩‍⚕️ Buscar doctora disponible
                      </span>
                      <span className="text-slate-500">
                        Filtra médicos especialistas por género femenino.
                      </span>
                    </button>

                    <button
                      onClick={() => handleSend('Consultar disponibilidad de citas para hoy')}
                      className="p-4 rounded-3xl bg-white/70 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] text-xs"
                    >
                      <span className="font-bold text-slate-900 block mb-0.5">
                        ⏰ Disponibilidad para hoy
                      </span>
                      <span className="text-slate-500">
                        Revisa huecos de atención médica inmediata.
                      </span>
                    </button>

                    <button
                      onClick={() => handleSend('Cuáles son mis citas agendadas')}
                      className="p-4 rounded-3xl bg-white/70 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] text-xs"
                    >
                      <span className="font-bold text-slate-900 block mb-0.5">
                        💳 Consultar mis citas
                      </span>
                      <span className="text-slate-500">
                        Verifica el estado de pago de tus citas agendadas.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Conversación Activa: Lista Limpia de Mensajes */
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-3xl mx-auto w-full custom-scrollbar">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex ${
                      msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.emisor === 'asistente' && (
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-3 shadow-md">
                        <Stethoscope className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-4 ${
                        msg.emisor === 'usuario'
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-3xl rounded-tr-none shadow-md text-sm leading-relaxed font-medium'
                          : 'bg-white/80 border border-white/90 text-slate-800 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-xl text-sm leading-relaxed'
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
                  <div className="flex justify-start items-center gap-3">
                    <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                      <Stethoscope className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-white/80 border border-white/90 px-4 py-3 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-xl text-xs font-semibold text-cyan-700 flex items-center gap-2">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                      <span>MediCore consultando base de datos clínica...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* ── BARRA DE ENTRADA FLOTANTE (GEMINI PROMPT BAR) ───────────── */}
            <div className="p-4 max-w-3xl mx-auto w-full shrink-0">
              <div className="bg-white/85 border border-white/90 rounded-3xl p-2.5 shadow-xl backdrop-blur-2xl flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta a MediCore o agenda tu cita..."
                  className="w-full bg-transparent px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white flex items-center justify-center shadow-md transition-all disabled:opacity-40 hover:scale-105 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <p className="text-center mt-2 text-[11px] text-slate-400 font-medium">
                MediCore IA — Asistente administrativo clínico. Consulta siempre a un médico profesional.
              </p>
            </div>
          </div>
        ) : (
          /* ── MÓDULO INTEGRADO "MIS CITAS" ───────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6 bg-white/70 p-5 rounded-3xl border border-white/90 backdrop-blur-xl shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  Mis Citas Médicas
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Revisa tus consultas registradas y realiza pagos simulados con Sandbox Wompi.
                </p>
              </div>

              <button
                onClick={loadMisCitas}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingCitas ? 'animate-spin text-teal-600' : ''}`}
                />
                Actualizar
              </button>
            </div>

            {paymentSuccessCitaId && (
              <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3 animate-fade-in shadow-md">
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold">¡Pago Sandbox Aprobado!</p>
                  <p className="text-xs text-teal-700">
                    Tu cita médica ha sido confirmada en tiempo real en Supabase.
                  </p>
                </div>
              </div>
            )}

            {loadingCitas ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-600">
                    Cargando citas...
                  </p>
                </div>
              </div>
            ) : citas.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-sm p-8 bg-white/70 border border-white/90 rounded-3xl shadow-xs">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    No tienes citas registradas
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Usa el asistente IA para agendar una consulta médica.
                  </p>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold py-2 px-4 rounded-xl text-xs"
                  >
                    Volver al Chat
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
  )
}
