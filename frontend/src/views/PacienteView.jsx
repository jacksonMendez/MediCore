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
  Settings,
  Activity,
  Filter,
  UserCheck,
  Zap,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
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
  const pendingCitasCount = citas.filter((c) => c.estado === 'pendiente_pago').length

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-100 font-sans select-none relative">
      {/* ── BARRA LATERAL IZQUIERDA (SIDEBAR LIQUID GLASS MEDICO) ──────────── */}
      <aside
        className={`flex flex-col h-full bg-slate-900/95 text-slate-100 backdrop-blur-2xl border-r border-slate-800 transition-all duration-300 ease-in-out z-30 shrink-0 ${
          sidebarOpen ? 'w-72 sm:w-80 p-4 shadow-2xl opacity-100' : 'w-0 p-0 opacity-0 border-none overflow-hidden pointer-events-none'
        }`}
      >
        {/* Header Superior del Sidebar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white leading-none">
                MediCore<span className="text-cyan-400">OS</span>
              </h2>
              <span className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-widest block mt-0.5">
                Plataforma Clínica
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Colapsar menú"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Botón Destacado "+ Nueva Consulta" */}
        <button
          onClick={startNewChat}
          className="w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 text-xs shadow-lg shadow-cyan-500/20 transition-all duration-200 mb-3 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>Nueva Consulta</span>
        </button>

        {/* Botón Píldora "Mis Citas Médicas" */}
        <button
          onClick={() => setActiveTab(activeTab === 'citas' ? 'chat' : 'citas')}
          className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all mb-4 border ${
            activeTab === 'citas'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Mis Citas Médicas</span>
          </div>
          <div className="flex items-center gap-1">
            {pendingCitasCount > 0 && (
              <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingCitasCount} pend.
              </span>
            )}
            <span className="bg-cyan-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {citas.length}
            </span>
          </div>
        </button>

        {/* Buscador en tiempo real */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/60 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700/80 placeholder-slate-500 text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>

        {/* Historial Independiente "Recientes" */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Conversaciones Recientes
            </span>
            <span className="text-[10px] font-semibold text-slate-600">
              {filteredSessions.length}
            </span>
          </div>

          {filteredSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2.5 border ${
                sesionId === s.id && activeTab === 'chat'
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-transparent hover:bg-slate-800/50 border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs truncate font-medium flex-1">
                {s.ultimo_mensaje || 'Nueva consulta'}
              </span>
            </button>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-6 px-3 border border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
              <p className="text-xs text-slate-500 font-medium">
                Sin conversaciones grabadas
              </p>
            </div>
          )}
        </div>

        {/* Footer del Sidebar: Perfil de Usuario con Avatar Glowing */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/30 shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {user?.nombre_completo || 'Paciente Authenticated'}
              </p>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase">
                {user?.rol || 'paciente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => alert(`Ajustes de cuenta de ${user?.nombre_completo || 'Paciente'}`)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              title="Configuración de cuenta"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogoutAction}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL CENTRAL (CANVAS CLINICO INTEGRADO) ──────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/60">
        {/* Header Superior Clinical Glass */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-white/60 bg-white/50 backdrop-blur-md shrink-0 z-20 shadow-xs">
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
                Modo Clínico Groq LLM
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>En línea 24/7</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-900 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30 shadow-xs">
              {initials}
            </div>
          </div>
        </header>

        {/* Contenido Dinámico (Chat vs Citas) */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative justify-between">
            {/* Si no hay conversación iniciada: HUB DE ACCIONES CLÍNICAS ASIMÉTRICAS (EMPTY STATE REDISEÑADO) */}
            {messages.length <= 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto custom-scrollbar my-auto">
                <div className="max-w-3xl w-full">
                  {/* Hero Header del Hub */}
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 px-4 py-1.5 rounded-full text-cyan-800 text-xs font-bold mb-3 shadow-xs">
                      <Stethoscope className="w-4 h-4 text-cyan-600" />
                      <span>Plataforma de Asistencia Médica Inteligente</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-cyan-700 via-teal-700 to-sky-700 bg-clip-text text-transparent">
                      Hola, {firstName}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
                      ¿Qué consulta o procedimiento médico deseas realizar hoy? Selecciona una acción rápida o escribe directamente a nuestro asistente.
                    </p>
                  </div>

                  {/* Dashboard de Acciones Clínicas Asimétricas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                    {/* Tarjeta Principal Destacada (Span 2 cols on MD) */}
                    <div
                      onClick={() => handleSend('Quiero agendar una cita médica')}
                      className="md:col-span-2 p-5 rounded-3xl bg-gradient-to-br from-white/90 via-cyan-50/40 to-teal-50/30 border border-cyan-200/80 shadow-md backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer relative overflow-hidden group"
                    >
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl group-hover:bg-cyan-500/20 transition-all" />
                      
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Recomendado
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                        Agendar Cita Médica Inteligente
                        <ArrowRight className="w-4 h-4 text-cyan-600 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        Consulta disponibilidad en tiempo real por especialidad (Medicina General, Cardiología, Pediatría) y reserva tu turno en segundos.
                      </p>
                    </div>

                    {/* Tarjeta 2: Filtro por Género */}
                    <div
                      onClick={() => handleSend('Quiero una cita con una doctora')}
                      className="p-5 rounded-3xl bg-white/80 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs mb-3">
                        <Filter className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Atención por Doctora
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        Filtra especialistas médicas de género femenino.
                      </p>
                    </div>

                    {/* Tarjeta 3: Disponibilidad Hoy */}
                    <div
                      onClick={() => handleSend('Consultar disponibilidad de citas para hoy')}
                      className="p-5 rounded-3xl bg-white/80 hover:bg-white border border-white/90 shadow-md backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shadow-xs mb-3">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Disponibilidad Inmediata
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed font-medium">
                        Revisa huecos de atención médica agendables hoy mismo.
                      </p>
                    </div>

                    {/* Tarjeta 4: Mis Citas y Pagos Sandbox (Span 2 cols on MD) */}
                    <div
                      onClick={() => setActiveTab('citas')}
                      className="md:col-span-2 p-5 rounded-3xl bg-gradient-to-br from-white/90 via-slate-50 to-teal-50/20 border border-teal-200/60 shadow-md backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            Mis Citas y Pagos Wompi
                            {pendingCitasCount > 0 && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                                {pendingCitasCount} pago pendiente
                              </span>
                            )}
                          </h3>
                          <p className="text-slate-500 text-xs font-medium">
                            Revisa el estado de tus consultas y gestiona transacciones Sandbox.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </div>

                  {/* Sugerencias en Chips Horizontales */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
                      Sugerencias Rápidas:
                    </span>
                    <button
                      onClick={() => handleSend('¿Qué especialidades médicas tienen disponibles?')}
                      className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs hover:border-cyan-400 transition-colors"
                    >
                      ¿Qué especialidades hay?
                    </button>
                    <button
                      onClick={() => handleSend('Necesito una cita de cardiología')}
                      className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs hover:border-cyan-400 transition-colors"
                    >
                      Cita de Cardiología
                    </button>
                    <button
                      onClick={() => handleSend('Ver mis citas programadas')}
                      className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs hover:border-cyan-400 transition-colors"
                    >
                      Mis citas activas
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
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-3 shadow-md shadow-cyan-600/20">
                        <Stethoscope className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-4 sm:p-5 ${
                        msg.emisor === 'usuario'
                          ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 text-white rounded-3xl rounded-tr-none shadow-lg shadow-cyan-900/15 text-sm leading-relaxed font-medium'
                          : 'bg-white/90 border border-white text-slate-800 rounded-3xl rounded-tl-none shadow-md backdrop-blur-xl text-sm leading-relaxed font-sans'
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
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                      <Stethoscope className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="bg-white/90 border border-white px-5 py-3.5 rounded-3xl rounded-tl-none shadow-sm backdrop-blur-xl text-xs font-semibold text-cyan-700 flex items-center gap-2.5">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                      <span>MediCore consultando base de datos clínica en tiempo real...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* ── BARRA DE ENTRADA FLOTANTE (PROMPT BAR CLINICO) ────────────── */}
            <div className="p-4 mb-4 pb-2 max-w-3xl w-full mx-auto shrink-0">
              <div className="bg-white/90 border border-white rounded-3xl p-2.5 shadow-xl shadow-cyan-900/5 backdrop-blur-2xl flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu consulta clínica o solicita tu cita..."
                  className="w-full bg-transparent px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-700 hover:to-teal-700 text-white flex items-center justify-center shadow-md transition-all disabled:opacity-40 hover:scale-105 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <p className="text-center mt-2 text-[11px] text-slate-400 font-medium">
                MediCore OS — Asistente administrativo clínico. Consulta siempre a un médico profesional.
              </p>
            </div>
          </div>
        ) : (
          /* ── MÓDULO INTEGRADO "MIS CITAS" ───────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6 bg-white/80 p-5 rounded-3xl border border-white backdrop-blur-xl shadow-xs">
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
