import React, { useState, useEffect } from 'react'
import {
  Users, Building2, BookOpen, Calendar, Plus,
  Search, Filter, RefreshCw, Stethoscope, MapPin, DollarSign,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import GlassModal from '../components/GlassModal'

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

/**
 * AdminView — Central management panel for doctors, locations, specialties, and global appointments.
 */
export default function AdminView() {
  const [activeTab, setActiveTab] = useState('medicos')
  const [medicos, setMedicos] = useState([])
  const [sedes, setSedes] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [formData, setFormData] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [med, sed, esp] = await Promise.all([
        apiFetch('/medicos'),
        apiFetch('/sedes'),
        apiFetch('/especialidades'),
      ])
      if (Array.isArray(med)) setMedicos(med)
      if (Array.isArray(sed)) setSedes(sed)
      if (Array.isArray(esp)) setEspecialidades(esp)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (type) => {
    setModalType(type)
    setFormData({})
    setFormError('')
    setShowModal(true)
  }

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      let endpoint = ''
      let body = {}

      if (modalType === 'sede') {
        endpoint = '/sedes'
        body = {
          nombre: formData.nombre,
          direccion: formData.direccion,
          telefono: formData.telefono || null,
        }
      } else if (modalType === 'especialidad') {
        endpoint = '/especialidades'
        body = {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          precio_base: parseFloat(formData.precio_base) || 0,
        }
      } else if (modalType === 'medico') {
        endpoint = '/medicos'
        body = {
          nombre_completo: formData.nombre_completo,
          correo: formData.correo,
          password: formData.password,
          telefono: formData.telefono || null,
          especialidad_id: formData.especialidad_id,
          sede_id: formData.sede_id,
          tarjeta_profesional: formData.tarjeta_profesional,
          duracion_cita_minutos: parseInt(formData.duracion_cita_minutos) || 30,
        }
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.detail || 'Error al crear registro')

      setShowModal(false)
      loadAll()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const tabs = [
    { id: 'medicos', label: 'Médicos', icon: Stethoscope },
    { id: 'sedes', label: 'Sedes', icon: Building2 },
    { id: 'especialidades', label: 'Especialidades', icon: BookOpen },
  ]

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

  return (
    <div className="mt-16 p-6 max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Panel de Administración
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Gestión central de MediCore OS
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Stethoscope} label="Médicos Activos" value={medicos.length} color="cyan" delay={0} />
        <StatCard icon={Building2} label="Sedes" value={sedes.length} color="teal" delay={100} />
        <StatCard icon={BookOpen} label="Especialidades" value={especialidades.length} color="blue" delay={200} />
        <StatCard icon={DollarSign} label="Precio Prom."
          value={especialidades.length > 0
            ? `$${Math.round(especialidades.reduce((a, e) => a + e.precio_base, 0) / especialidades.length).toLocaleString()}`
            : '$0'}
          color="amber" delay={300} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '300ms', opacity: 0, animationFillMode: 'forwards' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`glass-btn text-sm py-2 px-4 ${
                activeTab === tab.id ? 'glass-btn-primary' : 'glass-btn-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}

        <div className="flex-1" />

        <button
          onClick={() => {
            if (activeTab === 'medicos') openModal('medico')
            else if (activeTab === 'sedes') openModal('sede')
            else openModal('especialidad')
          }}
          className="glass-btn glass-btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>

        <button onClick={loadAll} className="glass-btn glass-btn-secondary p-2" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel p-6 animate-fade-in-up" style={{ animationDelay: '400ms', opacity: 0, animationFillMode: 'forwards' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* Médicos Tab */}
            {activeTab === 'medicos' && (
              <div className="overflow-x-auto">
                {medicos.length === 0 ? (
                  <div className="text-center py-12">
                    <Stethoscope className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      No hay médicos registrados
                    </p>
                  </div>
                ) : (
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Médico</th>
                        <th>Especialidad</th>
                        <th>Sede</th>
                        <th>Tarjeta Prof.</th>
                        <th>Duración Cita</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicos.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                   style={{ background: 'linear-gradient(135deg, #0d9488, #2dd4bf)' }}>
                                {m.nombre_completo?.charAt(0) || 'D'}
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {m.nombre_completo || 'Doctor'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {m.correo}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>{m.especialidad_nombre || 'N/A'}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                              {m.sede_nombre || 'N/A'}
                            </div>
                          </td>
                          <td className="font-mono text-xs">{m.tarjeta_profesional}</td>
                          <td>{m.duracion_cita_minutos} min</td>
                          <td>
                            <span className={`badge ${m.activo ? 'badge-confirmed' : 'badge-cancelled'}`}>
                              {m.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Sedes Tab */}
            {activeTab === 'sedes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sedes.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      No hay sedes registradas
                    </p>
                  </div>
                ) : (
                  sedes.map((s) => (
                    <div key={s.id} className="glass-panel-sm p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: 'linear-gradient(135deg, #0d9488, #2dd4bf)' }}>
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {s.nombre}
                          </h3>
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                            <MapPin className="w-3 h-3" /> {s.direccion}
                          </p>
                          {s.telefono && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              📞 {s.telefono}
                            </p>
                          )}
                          <span className={`badge mt-2 ${s.activa ? 'badge-confirmed' : 'badge-cancelled'}`}>
                            {s.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Especialidades Tab */}
            {activeTab === 'especialidades' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {especialidades.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      No hay especialidades registradas
                    </p>
                  </div>
                ) : (
                  especialidades.map((e) => (
                    <div key={e.id} className="glass-panel-sm p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }}>
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {e.nombre}
                        </h3>
                      </div>
                      {e.descripcion && (
                        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                          {e.descripcion}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--color-antiseptic-green)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--color-antiseptic-green)' }}>
                          ${e.precio_base?.toLocaleString()} COP
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalType === 'medico' ? 'Nuevo Médico' :
          modalType === 'sede' ? 'Nueva Sede' :
          'Nueva Especialidad'
        }
        maxWidth="550px"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium"
               style={{ background: 'rgba(225,29,72,0.1)', color: 'var(--color-alert-rose)' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {modalType === 'sede' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Nombre</label>
                <input name="nombre" className="glass-input" required
                       placeholder="Sede Norte" onChange={handleFormChange} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Dirección</label>
                <input name="direccion" className="glass-input" required
                       placeholder="Calle 100 #15-25" onChange={handleFormChange} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Teléfono</label>
                <input name="telefono" className="glass-input"
                       placeholder="+57 601 555 0101" onChange={handleFormChange} />
              </div>
            </>
          )}

          {modalType === 'especialidad' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Nombre</label>
                <input name="nombre" className="glass-input" required
                       placeholder="Dermatología" onChange={handleFormChange} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Descripción</label>
                <textarea name="descripcion" className="glass-input" rows={3}
                          placeholder="Descripción de la especialidad..." onChange={handleFormChange} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                       style={{ color: 'var(--color-text-muted)' }}>Precio Base (COP)</label>
                <input name="precio_base" type="number" className="glass-input" required
                       placeholder="50000" onChange={handleFormChange} />
              </div>
            </>
          )}

          {modalType === 'medico' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Nombre Completo</label>
                  <input name="nombre_completo" className="glass-input" required
                         placeholder="Dr. Juan Rodríguez" onChange={handleFormChange} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Correo</label>
                  <input name="correo" type="email" className="glass-input" required
                         placeholder="dr.rodriguez@medicore.com" onChange={handleFormChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Contraseña</label>
                  <input name="password" type="password" className="glass-input" required
                         placeholder="••••••••" onChange={handleFormChange} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Teléfono</label>
                  <input name="telefono" className="glass-input"
                         placeholder="+57 300 123 4567" onChange={handleFormChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Especialidad</label>
                  <select name="especialidad_id" className="glass-input" required onChange={handleFormChange}>
                    <option value="">Seleccionar...</option>
                    {especialidades.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Sede</label>
                  <select name="sede_id" className="glass-input" required onChange={handleFormChange}>
                    <option value="">Seleccionar...</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Tarjeta Profesional</label>
                  <input name="tarjeta_profesional" className="glass-input" required
                         placeholder="TP-DERM-003" onChange={handleFormChange} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                         style={{ color: 'var(--color-text-muted)' }}>Duración Cita (min)</label>
                  <input name="duracion_cita_minutos" type="number" className="glass-input"
                         placeholder="30" defaultValue={30} onChange={handleFormChange} />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="glass-btn glass-btn-primary w-full py-3">
            <Plus className="w-4 h-4" />
            {modalType === 'medico' ? 'Crear Médico' :
             modalType === 'sede' ? 'Crear Sede' : 'Crear Especialidad'}
          </button>
        </form>
      </GlassModal>
    </div>
  )
}
