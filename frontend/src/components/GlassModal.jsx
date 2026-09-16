import React from 'react'
import { X } from 'lucide-react'

/**
 * GlassModal — Modal overlay with frosted glass panel.
 * Centered on screen with backdrop blur and close button.
 */
export default function GlassModal({ isOpen, onClose, title, children, maxWidth = '500px' }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel-strong p-6 animate-fade-in-up w-full mx-4"
        style={{ maxWidth, animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/50"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>
        {/* Content */}
        {children}
      </div>
    </div>
  )
}
