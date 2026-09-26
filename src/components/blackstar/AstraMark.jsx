import React from 'react'
import './blackstar-astra.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * Astra Mark — void star + orbital ring.
 * Bounded intelligence identity. Not an AGI claim and not a chatbot spark.
 */
export function AstraMark({
  size = 36,
  animate = true,
  className = '',
  title = 'Blackstar',
}) {
  const id = React.useId()
  return (
    <span
      className={cx('astra-mark', animate && 'astra-mark-live', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="8" x2="64" y2="56">
            <stop offset="0%" stopColor="#7B5CFF" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#E8E6F0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7B5CFF" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`${id}-facet`} x1="32" y1="4" x2="32" y2="60">
            <stop offset="0%" stopColor="#C9C6D4" />
            <stop offset="100%" stopColor="#3A3944" />
          </linearGradient>
        </defs>
        <ellipse
          className="astra-ring"
          cx="32"
          cy="32"
          rx="26"
          ry="12"
          stroke={`url(#${id}-ring)`}
          strokeWidth="1.15"
        />
        <path
          d="M32 6 L38.4 24.2 L58 26.2 L42.6 38.2 L47.2 56 L32 46.2 L16.8 56 L21.4 38.2 L6 26.2 L25.6 24.2 Z"
          fill="#07070A"
          stroke={`url(#${id}-facet)`}
          strokeWidth="1.4"
          strokeLinejoin="miter"
        />
        <circle cx="32" cy="32" r="4.2" fill="#050508" stroke="#8B7CFF" strokeOpacity="0.35" strokeWidth="0.8" />
      </svg>
    </span>
  )
}

export function AstraWordmark({ descriptor = 'Astra-class intelligence', className = '' }) {
  return (
    <span className={cx('astra-wordmark', className)}>
      <AstraMark size={28} />
      <span className="astra-wordmark-copy">
        <span className="astra-wordmark-name">BLACKSTAR</span>
        {descriptor ? <span className="astra-wordmark-desc">{descriptor}</span> : null}
      </span>
    </span>
  )
}
