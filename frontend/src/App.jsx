import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import BackgroundOrbs from './components/BackgroundOrbs'
import GlassNavbar from './components/GlassNavbar'

import PortalSelector from './views/PortalSelector'
import LoginView from './views/LoginView'
import PacienteView from './views/PacienteView'
import DoctorView from './views/DoctorView'
import AdminView from './views/AdminView'

/**
 * App — Root component with routing, auth state, and layout.
 */
function AppContent() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const location = useLocation()

  // Check for stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('medicore_token')
    const storedUser = localStorage.getItem('medicore_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogin = (userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('medicore_token')
    localStorage.removeItem('medicore_user')
  }

  // Pages that don't show the navbar
  const hideNavbar = ['/', '/login'].includes(location.pathname)

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--color-clinical-bg)' }}>
      <BackgroundOrbs />

      {!hideNavbar && <GlassNavbar user={user} onLogout={handleLogout} />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PortalSelector />} />
        <Route path="/login" element={<LoginView onLogin={handleLogin} />} />

        {/* Protected routes */}
        <Route
          path="/paciente"
          element={
            user ? <PacienteView /> : <Navigate to="/login" state={{ role: 'paciente' }} />
          }
        />
        <Route
          path="/doctor"
          element={
            user ? <DoctorView /> : <Navigate to="/login" state={{ role: 'medico' }} />
          }
        />
        <Route
          path="/admin"
          element={
            user ? <AdminView /> : <Navigate to="/login" state={{ role: 'admin' }} />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
