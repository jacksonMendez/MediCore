import React from 'react'
import { X } from 'lucide-react'

/**
 * GlassModal — Modal overlay with frosted dark glass panel.
 * Centered on screen with backdrop blur and close button.
 */
export default function GlassModal({ isOpen, onClose, title, children, maxWidth = '500px' }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel-strong p-6 animate-fade-in-up w-full mx-4 border border-slate-800 shadow-2xl"
        style={{ maxWidth, animationDuration: '0.25s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-3">
          <h2 className="text-base font-bold text-white tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        {children}
      </div>
    </div>
  )
}

