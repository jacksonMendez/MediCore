import React from 'react'

/**
 * StatCard — Metric card with icon, value, label, and optional trend.
 * Used in the Doctor and Admin dashboards.
 */
export default function StatCard({ icon: Icon, label, value, trend, color = 'cyan', delay = 0 }) {
  const colorMap = {
    cyan: {
      iconBg: 'rgba(6, 182, 212, 0.15)',
      iconColor: '#38bdf8',
      text: '#f8fafc',
    },
    blue: {
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38bdf8',
      text: '#f8fafc',
    },
    teal: {
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34d399',
      text: '#f8fafc',
    },
    amber: {
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#fbbf24',
      text: '#f8fafc',
    },
    rose: {
      iconBg: 'rgba(244, 63, 94, 0.15)',
      iconColor: '#f87171',
      text: '#f8fafc',
    },
  }

  const c = colorMap[color] || colorMap.cyan

  return (
    <div
      className="glass-panel p-5 animate-fade-in-up border border-slate-800/80"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          {trend && (
            <p className="text-xs mt-1 font-normal text-slate-400">
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-700/50"
          style={{ background: c.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: c.iconColor }} />
        </div>
      </div>
    </div>
  )
}

