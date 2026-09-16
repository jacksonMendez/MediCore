import React from 'react'

/**
 * StatCard — Metric card with icon, value, label, and optional trend.
 * Used in the Doctor and Admin dashboards.
 */
export default function StatCard({ icon: Icon, label, value, trend, color = 'cyan', delay = 0 }) {
  const colorMap = {
    cyan: {
      gradient: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(34,211,238,0.08))',
      iconBg: 'linear-gradient(135deg, #0891b2, #22d3ee)',
      text: 'var(--color-surgical-cyan)',
    },
    blue: {
      gradient: 'linear-gradient(135deg, rgba(2,132,199,0.15), rgba(56,189,248,0.08))',
      iconBg: 'linear-gradient(135deg, #0284c7, #38bdf8)',
      text: 'var(--color-medical-blue)',
    },
    teal: {
      gradient: 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(45,212,191,0.08))',
      iconBg: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
      text: 'var(--color-antiseptic-green)',
    },
    amber: {
      gradient: 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(251,191,36,0.08))',
      iconBg: 'linear-gradient(135deg, #d97706, #fbbf24)',
      text: 'var(--color-alert-amber)',
    },
    rose: {
      gradient: 'linear-gradient(135deg, rgba(225,29,72,0.15), rgba(251,113,133,0.08))',
      iconBg: 'linear-gradient(135deg, #e11d48, #fb7185)',
      text: 'var(--color-alert-rose)',
    },
  }

  const c = colorMap[color] || colorMap.cyan

  return (
    <div
      className="glass-panel p-5 animate-fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-3xl font-bold" style={{ color: c.text }}>
            {value}
          </p>
          {trend && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: c.iconBg }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}
