import React from 'react'

/**
 * StatCard — Metric card with icon, value, label, and optional trend.
 * Clean design with subtle left border accent.
 */
export default function StatCard({ icon: Icon, label, value, trend, color = 'cyan', delay = 0 }) {
  const colorMap = {
    cyan: {
      iconBg: 'rgba(79, 168, 160, 0.1)',
      iconColor: '#4FA8A0',
      borderLeft: '#4FA8A0',
    },
    blue: {
      iconBg: 'rgba(91, 155, 213, 0.1)',
      iconColor: '#5B9BD5',
      borderLeft: '#5B9BD5',
    },
    teal: {
      iconBg: 'rgba(52, 199, 123, 0.1)',
      iconColor: '#34C77B',
      borderLeft: '#34C77B',
    },
    amber: {
      iconBg: 'rgba(240, 180, 41, 0.1)',
      iconColor: '#F0B429',
      borderLeft: '#F0B429',
    },
    rose: {
      iconBg: 'rgba(232, 84, 84, 0.1)',
      iconColor: '#E85454',
      borderLeft: '#E85454',
    },
  }

  const c = colorMap[color] || colorMap.cyan

  return (
    <div
      className="p-4 animate-fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        animationFillMode: 'forwards',
        borderLeft: `3px solid ${c.borderLeft}`,
        background: 'rgba(22, 33, 52, 0.4)',
        borderRadius: '10px',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-secondary mb-1">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight text-text-primary">
            {value}
          </p>
          {trend && (
            <p className="text-[11px] mt-1 text-text-muted">
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: c.iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: c.iconColor }} />
        </div>
      </div>
    </div>
  )
}
