import React, { useEffect, useState } from 'react'
import { Activity, Sparkles, ArrowRight } from 'lucide-react'

/**
 * SplashScreen — Cinematic entry screen with Liquid Glass refraction and glowing pulse.
 */
export default function SplashScreen({ onFinish }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleExit()
    }, 2400)
    return () => clearTimeout(timer)
  }, [])

  const handleExit = () => {
    setExiting(true)
    setTimeout(() => {
      onFinish()
    }, 600)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl transition-all duration-700 ${
        exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Refractive Glowing Background Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-500/25 via-teal-500/20 to-sky-400/15 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-bl from-teal-400/20 via-cyan-600/20 to-blue-500/10 blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Main Glass Card Container */}
      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md w-full mx-4">
        {/* Isotype Container with Neon Glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-3xl blur-xl opacity-75 animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center shadow-2xl border border-white/30 backdrop-blur-xl">
            <Activity className="w-12 h-12 text-white filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse" />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
          MediCore<span className="text-cyan-400">OS</span>
        </h1>

        {/* Subtitle */}
        <div className="flex items-center gap-2 mb-8 bg-white/10 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
            Inteligencia Clínica Asistida
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6 border border-white/10">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 animate-pulse rounded-full w-full transition-all duration-1000" />
        </div>

        {/* Skip Button */}
        <button
          onClick={handleExit}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-slate-200 hover:text-white backdrop-blur-xl transition-all duration-200 shadow-lg hover:scale-105"
        >
          <span>Ingresar al Sistema</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
