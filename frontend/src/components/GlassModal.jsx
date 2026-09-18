import React from 'react'
import { X } from 'lucide-react'

/**
 * GlassModal — Modal overlay with frosted dark glass panel.
 * Clean design with subtle close button.
 */
export default function GlassModal({ isOpen, onClose, title, children, maxWidth = '500px' }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel-strong p-5 animate-fade-in-up w-full mx-4 border border-white/[0.06] shadow-2xl"
        style={{ maxWidth, animationDuration: '0.2s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
          <h2 className="text-sm font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/[0.06] text-text-muted hover:text-text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Content */}
        {children}
      </div>
    </div>
  )
}
