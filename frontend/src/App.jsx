import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import BackgroundOrbs from './components/BackgroundOrbs'
import GlassNavbar from './components/GlassNavbar'
import SplashScreen from './components/SplashScreen'

import LoginView from './views/LoginView'
import PacienteView from './views/PacienteView'
import DoctorView from './views/DoctorView'
import AdminView from './views/AdminView'

/**
 * App — Root component with centralized auth state, splash screen, and Apple Liquid Glass layout.
 */
function AppContent() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const location = useLocation()

  // Check for stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('medicore_token')
    const storedUser = localStorage.getItem('medicore_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('medicore_token')
        localStorage.removeItem('medicore_user')
      }
    }
    setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-4 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Pages that don't show global navbar (PacienteView renders its own Gemini layout)
  const hideNavbar = ['/', '/login', '/paciente'].includes(location.pathname)

  // Determine home route by role
  const getHomeRoute = () => {
    if (!user) return '/login'
    if (user.rol === 'medico') return '/doctor'
    if (user.rol === 'admin') return '/admin'
    return '/paciente'
  }

  return (
    <div className="min-h-screen relative bg-slate-100 text-slate-900 font-sans overflow-x-hidden">
      {/* Cinematic Entry Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <BackgroundOrbs />

      {!hideNavbar && user && <GlassNavbar user={user} onLogout={handleLogout} />}

      <Routes>
        {/* Root & Auth */}
        <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={getHomeRoute()} replace />
            ) : (
              <LoginView onLogin={handleLogin} />
            )
          }
        />

        {/* Protected Portals */}
        <Route
          path="/paciente"
          element={user ? <PacienteView onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/doctor"
          element={user ? <DoctorView /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user ? <AdminView /> : <Navigate to="/login" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
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

