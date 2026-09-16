import React, { useState, useRef, useEffect } from 'react'
import { Send, Plus, Clock, MessageCircle, CreditCard } from 'lucide-react'

/**
 * PacienteView — AI-assisted appointment booking chatbot.
 * Full-screen conversational interface with Liquid Glass styling.
 */

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
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      emisor: 'asistente',
      contenido:
        '🏥 ¡Hola! Soy **MediCore**, tu asistente médico virtual.\n\nPuedo ayudarte a:\n\n• 📋 Agendar citas médicas\n• ⏰ Consultar disponibilidad de horarios\n• 💳 Gestionar pagos de consultas\n\n¿En qué puedo ayudarte hoy?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sesionId, setSesionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await apiFetch('/chat/sesiones')
      if (Array.isArray(data)) setSessions(data)
    } catch (e) {
      // silently fail if backend isn't running
    }
  }

  const loadSessionMessages = async (sid) => {
    try {
      const data = await apiFetch(`/chat/sesiones/${sid}/mensajes`)
      if (Array.isArray(data)) {
        setMessages(data)
        setSesionId(sid)
        setShowSidebar(false)
      }
    } catch (e) {
      console.error(e)
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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'asistente',
          contenido:
            '⚠️ No se pudo conectar con el servidor. Verifica que el backend esté corriendo en `localhost:8000`.',
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
          '🏥 ¡Hola de nuevo! ¿En qué puedo ayudarte?\n\nPuedo buscar disponibilidad de citas, agendar consultas o responder tus preguntas.',
      },
    ])
    setShowSidebar(false)
  }

  const renderMarkdown = (text) => {
    // Simple markdown: bold, bullet points, line breaks
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• /gm, '&bull; ')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] mt-16 relative">
      {/* Sessions sidebar */}
      <div
        className={`glass-panel-strong h-full overflow-y-auto transition-all duration-300 ${
          showSidebar ? 'w-72 p-4' : 'w-0 p-0 overflow-hidden'
        }`}
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Conversaciones
          </h3>
          <button onClick={startNewChat} className="glass-btn glass-btn-primary p-1.5" title="Nueva conversación">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left p-3 rounded-xl transition-all text-sm ${
                sesionId === s.id ? 'bg-white/60' : 'hover:bg-white/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-surgical-cyan)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(s.creado_en).toLocaleDateString('es-CO')}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {s.ultimo_mensaje || 'Conversación vacía'}
              </p>
            </button>
          ))}

          {sessions.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              Sin conversaciones previas
            </p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="glass-panel-sm mx-4 mt-4 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="glass-btn glass-btn-secondary p-2"
            >
              <Clock className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Asistente MediCore
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  En línea — IA
                </span>
              </div>
            </div>
          </div>
          <button onClick={startNewChat} className="glass-btn glass-btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Nuevo chat
          </button>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex ${msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 ${
                  msg.emisor === 'usuario' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}
              >
                <p
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.contenido) }}
                />
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-assistant px-4 py-3">
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

        {/* Input area */}
        <div className="p-4">
          <div className="glass-panel-strong p-3 flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu mensaje... (ej: Quiero agendar una cita de cardiología)"
              className="glass-input border-0 bg-transparent"
              style={{ backdropFilter: 'none' }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="glass-btn glass-btn-primary p-3 shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            MediCore IA — No proporciona diagnósticos médicos. Consulte siempre a un profesional.
          </p>
        </div>
      </div>
    </div>
  )
}
