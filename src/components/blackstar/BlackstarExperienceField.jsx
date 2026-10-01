import { useEffect, useRef } from 'react'
import AstraDepthField from '@/components/blackstar/AstraDepthField'

export default function BlackstarExperienceField({
  room = 'astra-room-default',
  visualStyle = 'blackstar-style-cosmic-core',
  dedicatedWebGL = false,
}) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === 'undefined') return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) return

    let frame = 0
    let x = 0
    let y = 0
    const apply = () => {
      root.style.setProperty('--bx-px', x.toFixed(4))
      root.style.setProperty('--bx-py', y.toFixed(4))
      frame = 0
    }
    const onMove = (event) => {
      x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2
      y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2
      if (!frame) frame = requestAnimationFrame(apply)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="blackstar-experience pointer-events-none fixed inset-0 overflow-hidden"
      data-room={room}
      data-style={visualStyle}
    >
      <div className="blackstar-experience-base" />
      <div className="blackstar-experience-aurora blackstar-experience-aurora-a" />
      <div className="blackstar-experience-aurora blackstar-experience-aurora-b" />
      <div className="blackstar-experience-aurora blackstar-experience-aurora-c" />
      <div className="blackstar-experience-ribbon blackstar-experience-ribbon-a" />
      <div className="blackstar-experience-ribbon blackstar-experience-ribbon-b" />
      <div className="blackstar-experience-horizon" />
      <div className="blackstar-experience-grid" />
      <div className="blackstar-experience-dust" />
      <div className="blackstar-experience-vignette" />
      {!dedicatedWebGL ? (
        <div className="absolute inset-0 opacity-[.92]">
          <AstraDepthField room={room} visualStyle={visualStyle} />
        </div>
      ) : null}
    </div>
  )
}
