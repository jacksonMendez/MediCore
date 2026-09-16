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
  ChevronRight,
  User as UserIcon,
  LayoutDashboard,
  HeartPulse,
  Award,
  FileText,
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
  const nextCita = citas.find((c) => c.estado === 'confirmada' || c.estado === 'pendiente_pago')

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans select-none relative">
      {/* ── SIDEBAR COMPACTO Y ELEGANTE ───────────────────────────────────── */}
      <aside
        className={`flex flex-col h-full bg-slate-900/90 text-slate-200 backdrop-blur-2xl border-r border-slate-800/80 transition-all duration-300 ease-in-out z-30 shrink-0 ${
          sidebarOpen ? 'w-64 p-3.5 shadow-2xl opacity-100' : 'w-0 p-0 opacity-0 border-none overflow-hidden pointer-events-none'
        }`}
      >
        {/* Header Marca */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Activity className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white leading-none">
                MediCore<span className="text-cyan-400">OS</span>
              </h2>
              <span className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-widest block mt-0.5">
                Clinical SaaS
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Colapsar navegación"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Botón "+ Nueva Consulta" */}
        <button
          onClick={startNewChat}
          className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-cyan-500/15 transition-all mb-3 hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nueva Consulta</span>
        </button>

        {/* Grupo de Navegación Principal */}
        <div className="space-y-1 mb-4">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'chat' && messages.length <= 1
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            <span>Dashboard Principal</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'citas' ? 'chat' : 'citas')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'citas'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Mis Citas Médicas</span>
            </div>
            {pendingCitasCount > 0 ? (
              <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingCitasCount}
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {citas.length}
              </span>
            )}
          </button>
        </div>

        {/* Separador */}
        <div className="h-px bg-slate-800/80 my-2" />

        {/* Buscador de Consultas */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar consulta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-800 placeholder-slate-500 text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Historial Independiente */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 px-2 block mb-1">
            Historial de Consultas
          </span>

          {filteredSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-center gap-2 text-xs ${
                sesionId === s.id && activeTab === 'chat' && messages.length > 1
                  ? 'bg-slate-800 border-l-2 border-cyan-400 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
              <span className="truncate flex-1">
                {s.ultimo_mensaje || 'Consulta previa'}
              </span>
            </button>
          ))}

          {filteredSessions.length === 0 && (
            <span className="text-[11px] text-slate-600 block text-center py-4">
              Sin historial
            </span>
          )}
        </div>

        {/* Footer Sidebar: User Badge & Action Icons */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {user?.nombre_completo || 'Paciente'}
              </p>
              <span className="text-[9px] text-cyan-400 font-semibold uppercase block">
                {user?.rol || 'paciente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleLogoutAction}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── CANVAS PRINCIPAL (HEALTHCARE SAAS DASHBOARD GRID) ─────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
        {/* Header Superior del Dashboard */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700/60 transition-colors"
                title="Abrir menú"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-tight">
                MediCore<span className="text-cyan-400">OS</span>
              </h1>
              <span className="bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                Panel Clínico
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Groq LLM v3.8 Conectado</span>
            </div>

            {messages.length > 1 && activeTab === 'chat' && (
              <button
                onClick={startNewChat}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Volver al Dashboard
              </button>
            )}
          </div>
        </header>

        {/* ── CONTENIDO DINÁMICO DE LA APLICACIÓN ───────────────────────────── */}
        {activeTab === 'citas' ? (
          /* VISTA: GESTIÓN DE CITAS MÉRIDICAS */
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-400" />
                  Gestión de Citas Médicas
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Revisa tus citas agendadas y gestiona los pagos Sandbox Wompi en Supabase.
                </p>
              </div>

              <button
                onClick={loadMisCitas}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingCitas ? 'animate-spin text-teal-400' : ''}`}
                />
                Actualizar
              </button>
            </div>

            {paymentSuccessCitaId && (
              <div className="mb-6 p-4 rounded-xl bg-teal-950/80 border border-teal-700 text-teal-200 flex items-center gap-3 shadow-md animate-fade-in">
                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold">¡Pago Sandbox Confirmado!</p>
                  <p className="text-xs text-teal-300">
                    La cita médica ha sido activada exitosamente en el sistema.
                  </p>
                </div>
              </div>
            )}

            {loadingCitas ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : citas.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Sin Citas Registradas</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Usa la consola de IA del dashboard para consultar agenda y agendar tu cita.
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Ir al Dashboard
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {citas.map((c) => {
                  const isPending = c.estado === 'pendiente_pago'
                  const isConfirmed = c.estado === 'confirmada'

                  return (
                    <div
                      key={c.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-slate-950 font-black flex items-center justify-center text-base shrink-0 shadow-md">
                            {c.medico_nombre?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/60">
                              {c.especialidad_nombre || 'Medicina General'}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-1">
                              {c.medico_nombre || 'Doctor Asignado'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {c.sede_nombre || 'Sede Principal'}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-700/80 px-3 py-1 rounded-full text-xs font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              Pendiente de Pago
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1.5 bg-teal-950/80 text-teal-300 border border-teal-700/80 px-3 py-1 rounded-full text-xs font-bold">
                              <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                              Confirmada
                            </span>
                          )}
                          {!isPending && !isConfirmed && (
                            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                              {c.estado}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-500 font-semibold block">Fecha</span>
                            <span className="text-slate-200 font-bold">{formatFecha(c.fecha_hora)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block">Hora</span>
                            <span className="text-slate-200 font-bold">{formatHora(c.fecha_hora)}</span>
                          </div>
                        </div>

                        {isPending && (
                          <button
                            onClick={() => handlePagarCita(c.id)}
                            disabled={payingCitaId === c.id}
                            className="bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
                          >
                            {payingCitaId === c.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Procesando Wompi...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                Pagar Cita (Sandbox Wompi)
                              </>
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
        ) : messages.length <= 1 ? (
          /* ── DASHBOARD GRID COMPOSITION (CUANDO NO HAY CHAT ACTIVO) ─────── */
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* HERO WELCOME BANNER (BANNER COMPACTO DE DASHBOARD) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full">
                        Portal Paciente
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date().toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Bienvenido, <span className="text-cyan-400">{firstName}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl font-normal leading-relaxed">
                      Gestión integral de agendamientos médicos, consulta de doctores por género y pagos seguros con Sandbox Wompi.
                    </p>
                  </div>

                  {/* Tarjetas de Métricas Rápidas */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-slate-950/60 border border-slate-800 px-4 py-3 rounded-xl text-center min-w-[110px]">
                      <span className="text-[11px] font-normal text-slate-400 block">Citas registradas</span>
                      <span className="text-lg font-bold text-white mt-0.5 block">{citas.length}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 px-4 py-3 rounded-xl text-center min-w-[110px]">
                      <span className="text-[11px] font-normal text-slate-400 block">Pagos pendientes</span>
                      <span className="text-lg font-bold text-amber-400 mt-0.5 block">{pendingCitasCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID PRINCIPAL DE 2 COLUMNAS (ACCIONES & PROXIMA CITA + CONSOLA IA) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA (2/3 WIDE): ACCIONES Y CONSOLA IA */}
                <div className="lg:col-span-2 space-y-8">

                  {/* SECCIÓN 1: ACCIONES PRINCIPALES CON HÉROE DESTACADO */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Tarjeta HERO Principal Agendamiento (Span 2 cols) */}
                    <div
                      onClick={() => handleSend('Quiero agendar una cita médica')}
                      className="sm:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 border border-cyan-500/50 hover:border-cyan-400 p-6 rounded-2xl shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
                          <Stethoscope className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                          Acción principal
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                        Agendar cita médica
                        <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-normal">
                        Consulta horarios disponibles en tiempo real por especialidad y reserva tu turno clínico.
                      </p>
                    </div>

                    {/* Tarjeta Secundaria Filtro Doctora */}
                    <div
                      onClick={() => handleSend('Quiero una cita con una doctora')}
                      className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 text-cyan-400 flex items-center justify-center mb-3">
                        <Filter className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-semibold text-white mb-1">Atención por doctora</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Filtra médicos especialistas por género femenino.
                      </p>
                    </div>

                    {/* Tarjeta Secundaria Disponibilidad Hoy */}
                    <div
                      onClick={() => handleSend('Consultar disponibilidad de citas para hoy')}
                      className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 text-cyan-400 flex items-center justify-center mb-3">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-semibold text-white mb-1">Disponibilidad hoy</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Revisa turnos de atención inmediata en la agenda.
                      </p>
                    </div>

                    {/* Tarjeta Mis Citas / Pagos (Span 2 cols) */}
                    <div
                      onClick={() => setActiveTab('citas')}
                      className="sm:col-span-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 text-cyan-400 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                            Mis citas y pagos
                            {pendingCitasCount > 0 && (
                              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                {pendingCitasCount} pend.
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Revisa el estado de tus consultas y gestiona el pago de tus citas.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </div>

                  {/* SECCIÓN 2: CONSOLA IA INTEGRADA AL DASHBOARD */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-semibold text-white">
                          Consola de asistencia médica IA
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Asistente Groq LLM v3.8
                      </span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe tu consulta clínica... (ej: 'Quiero agendar cita de cardiología para el viernes')"
                        className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-40 transition-all shadow-md"
                      >
                        <span>Consultar</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Chips de sugerencias rápidas */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleSend('¿Qué especialidades médicas tienen disponibles?')}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-normal px-3 py-1 rounded-full transition-colors"
                      >
                        ¿Qué especialidades hay?
                      </button>
                      <button
                        onClick={() => handleSend('Necesito una cita de cardiología')}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-normal px-3 py-1 rounded-full transition-colors"
                      >
                        Cita de cardiología
                      </button>
                      <button
                        onClick={() => handleSend('Cuáles son mis citas agendadas')}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-normal px-3 py-1 rounded-full transition-colors"
                      >
                        Mis citas registradas
                      </button>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA (1/3 WIDE): WIDGET DE PROXIMA CITA & RESUMEN DE SALUD */}
                <div className="space-y-8">

                  {/* WIDGET 1: ESTADO DE PRÓXIMA CITA */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-semibold text-white">
                          Próxima cita
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('citas')}
                        className="text-[11px] text-cyan-400 hover:underline font-medium"
                      >
                        Ver todas
                      </button>
                    </div>

                    {nextCita ? (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="bg-cyan-500/10 text-cyan-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-cyan-500/20">
                            {nextCita.especialidad_nombre || 'Medicina General'}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            nextCita.estado === 'confirmada'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                          }`}>
                            {nextCita.estado === 'confirmada' ? 'Confirmada' : 'Pend. Pago'}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-white">{nextCita.medico_nombre}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {nextCita.sede_nombre}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Fecha y hora</span>
                            <span className="text-slate-200 font-semibold">
                              {formatFecha(nextCita.fecha_hora)} - {formatHora(nextCita.fecha_hora)}
                            </span>
                          </div>

                          {nextCita.estado === 'pendiente_pago' && (
                            <button
                              onClick={() => handlePagarCita(nextCita.id)}
                              disabled={payingCitaId === nextCita.id}
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0"
                            >
                              Pagar Wompi
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        <Calendar className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-400">Sin citas próximas</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Agenda tu turno mediante el asistente</p>
                      </div>
                    )}
                  </div>

                  {/* WIDGET 2: ESPECIALIDADES MÉDICAS & INFORMACIÓN (LISTA LIMPIA SIN CAJAS EXCESIVAS) */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-semibold text-white">
                          Especialidades disponibles
                        </h3>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-800/80 text-xs">
                      <div className="pb-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200">Medicina General</p>
                          <p className="text-[11px] text-slate-400">Atención básica y chequeos</p>
                        </div>
                        <span className="text-cyan-400 font-semibold text-xs">$80.000 COP</span>
                      </div>

                      <div className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200">Cardiología</p>
                          <p className="text-[11px] text-slate-400">Evaluación cardiovascular</p>
                        </div>
                        <span className="text-cyan-400 font-semibold text-xs">$150.000 COP</span>
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200">Pediatría</p>
                          <p className="text-[11px] text-slate-400">Atención médica infantil</p>
                        </div>
                        <span className="text-cyan-400 font-semibold text-xs">$120.000 COP</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        ) : (
          /* ── VISTA DE CONVERSACIÓN DE CHAT ACTIVA (`messages.length > 1`) ── */
          <div className="flex-1 flex flex-col h-full overflow-hidden relative justify-between">
            {/* Mensajes de la Conversaciones Activas */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-3xl mx-auto w-full custom-scrollbar">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${
                    msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.emisor === 'asistente' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shrink-0 mr-3 shadow-md">
                      <Stethoscope className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-4 sm:p-5 ${
                      msg.emisor === 'usuario'
                        ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 text-white rounded-2xl rounded-tr-none shadow-lg text-xs leading-relaxed font-medium'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-none shadow-xl backdrop-blur-xl text-xs leading-relaxed'
                    }`}
                  >
                    <p
                      className="text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.contenido),
                      }}
                    />
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                    <Stethoscope className="w-4 h-4 text-slate-950 animate-spin" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-xs font-semibold text-cyan-400 flex items-center gap-2">
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

            {/* Console Prompt Bar Flotante */}
            <div className="p-4 mb-2 max-w-3xl w-full mx-auto shrink-0">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-2xl flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu mensaje..."
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md transition-all disabled:opacity-40 shrink-0 font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <p className="text-center mt-2 text-[10px] text-slate-500 font-medium">
                MediCore IA — Asistente administrativo clínico. Consulta siempre a un médico profesional.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
