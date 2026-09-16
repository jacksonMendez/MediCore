import React from 'react'

/**
 * BackgroundOrbs — Animated gradient spheres for the Liquid Glass background.
 * Creates a layered depth effect behind glass panels.
 */
export default function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Cyan orb — top right */}
      <div
        className="orb orb-cyan animate-orb"
        style={{
          width: '500px',
          height: '500px',
          top: '-10%',
          right: '-5%',
        }}
      />
      {/* Teal orb — bottom left */}
      <div
        className="orb orb-teal animate-orb"
        style={{
          width: '400px',
          height: '400px',
          bottom: '-8%',
          left: '-5%',
          animationDelay: '-5s',
        }}
      />
      {/* Sky orb — center */}
      <div
        className="orb orb-sky animate-orb"
        style={{
          width: '350px',
          height: '350px',
          top: '40%',
          left: '30%',
          animationDelay: '-10s',
        }}
      />
      {/* Small accent orb */}
      <div
        className="orb orb-cyan animate-orb"
        style={{
          width: '200px',
          height: '200px',
          top: '20%',
          left: '60%',
          animationDelay: '-15s',
          opacity: 0.3,
        }}
      />
    </div>
  )
}
