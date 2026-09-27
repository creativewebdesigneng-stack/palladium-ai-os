import { useEffect, useRef } from 'react'

const ROOM_PALETTES = {
  'astra-room-mission': { primary: 0x7b5cff, secondary: 0xc9a227, density: 1.18 },
  'astra-room-hub': { primary: 0x8b5cf6, secondary: 0xa78bfa, density: 0.95 },
  'astra-room-workforce': { primary: 0x8b5cf6, secondary: 0xc4b5fd, density: 0.9 },
  'astra-room-finance': { primary: 0x3a8f5c, secondary: 0x7b5cff, density: 0.72 },
  'astra-room-trading': { primary: 0x22c55e, secondary: 0x38bdf8, density: 0.88 },
  'astra-room-legal': { primary: 0xb8ae9c, secondary: 0x7b5cff, density: 0.55 },
  'astra-room-compliance': { primary: 0xc9a227, secondary: 0x7b5cff, density: 0.62 },
  'astra-room-cinema': { primary: 0xe879f9, secondary: 0x7b5cff, density: 0.9 },
  'astra-room-game': { primary: 0x22d3ee, secondary: 0x8b5cf6, density: 0.92 },
  'astra-room-memory': { primary: 0x7b5cff, secondary: 0xe8e6f0, density: 0.82 },
  'astra-room-knowledge': { primary: 0xe8e6f0, secondary: 0x38bdf8, density: 0.76 },
  'astra-room-company': { primary: 0x8b5cf6, secondary: 0xc9a227, density: 0.7 },
  'astra-room-industry': { primary: 0x94a3b8, secondary: 0xf59e0b, density: 0.68 },
  'astra-room-commerce': { primary: 0x60a5fa, secondary: 0xa78bfa, density: 0.78 },
  'astra-room-builder': { primary: 0x22d3ee, secondary: 0xc084fc, density: 0.84 },
  'astra-room-admin': { primary: 0xe8e6f0, secondary: 0x7b5cff, density: 0.45 },
  'astra-room-default': { primary: 0x7b5cff, secondary: 0x7dd3fc, density: 0.65 },
}

function paletteFor(room) {
  return ROOM_PALETTES[room] || ROOM_PALETTES['astra-room-default']
}

function coreGeometryFor(THREE, room, size) {
  if (room === 'astra-room-finance') return new THREE.OctahedronGeometry(size, 0)
  if (room === 'astra-room-trading') return new THREE.ConeGeometry(size * 0.85, size * 1.8, 6, 1)
  if (room === 'astra-room-legal') return new THREE.BoxGeometry(size * 1.15, size * 1.15, size * 1.15)
  if (room === 'astra-room-compliance') return new THREE.CylinderGeometry(size * 0.8, size, size * 1.5, 6, 1)
  if (room === 'astra-room-cinema') return new THREE.TetrahedronGeometry(size, 0)
  if (room === 'astra-room-game') return new THREE.IcosahedronGeometry(size * 0.96, 0)
  if (room === 'astra-room-memory') return new THREE.DodecahedronGeometry(size * 0.92, 0)
  if (room === 'astra-room-knowledge') return new THREE.DodecahedronGeometry(size * 0.86, 1)
  if (room === 'astra-room-company') return new THREE.OctahedronGeometry(size * 0.94, 1)
  if (room === 'astra-room-industry') return new THREE.BoxGeometry(size * 1.35, size * 0.8, size * 1.35, 2, 1, 2)
  if (room === 'astra-room-commerce') return new THREE.SphereGeometry(size * 0.92, 8, 6)
  if (room === 'astra-room-builder') return new THREE.TorusKnotGeometry(size * 0.62, size * 0.16, 72, 8)
  if (room === 'astra-room-admin') return new THREE.OctahedronGeometry(size * 0.86, 0)
  if (room === 'astra-room-workforce') return new THREE.IcosahedronGeometry(size * 0.9, 1)
  if (room === 'astra-room-hub') return new THREE.IcosahedronGeometry(size, 1)
  return new THREE.IcosahedronGeometry(size, 2)
}

/**
 * Low-cost WebGL depth field for the authenticated Blackstar shell.
 *
 * It deliberately stays non-interactive: controls, forms and live operational
 * UI must remain stable while the environment communicates depth and room
 * identity behind them. Mobile devices get fewer particles and a lower DPR.
 * Reduced-motion users receive one static frame.
 */
export default function AstraDepthField({
  room = 'astra-room-default',
  className = 'h-full w-full',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let disposed = false
    let frame = 0
    let resizeObserver = null
    let fallbackResize = null
    let renderer = null
    let scene = null
    let camera = null
    let core = null
    let halo = null
    let ringA = null
    let ringB = null
    let particleField = null
    let particleGeometry = null
    let particleMaterial = null
    let coreGeometry = null
    let coreMaterial = null
    let haloGeometry = null
    let haloMaterial = null
    let ringAGeometry = null
    let ringAMaterial = null
    let ringBGeometry = null
    let ringBMaterial = null
    let contextLost = false
    const canvas = canvasRef.current
    if (!canvas || typeof window === 'undefined') return

    const onContextLost = (event) => {
      event.preventDefault()
      contextLost = true
      cancelAnimationFrame(frame)
    }
    canvas.addEventListener('webglcontextlost', onContextLost, false)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 767px)').matches
    const saveData = navigator.connection?.saveData === true
    const deviceMemory = Number(navigator.deviceMemory || 0)
    const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0)
    const constrained =
      mobile ||
      saveData ||
      (deviceMemory > 0 && deviceMemory <= 4) ||
      (hardwareConcurrency > 0 && hardwareConcurrency <= 4)
    const targetFps = constrained ? 30 : 45
    const frameInterval = 1000 / targetFps
    const palette = paletteFor(room)
    const mission = room === 'astra-room-mission'

    const boot = async () => {
      try {
        const THREE = await import('three')
        if (disposed || !canvas) return

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
        })
        renderer.setClearColor(0x000000, 0)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : constrained ? 1.25 : 1.5))
        renderer.outputColorSpace = THREE.SRGBColorSpace

        scene = new THREE.Scene()
        camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
        camera.position.set(0, 0.15, 8.4)

        const root = new THREE.Group()
        root.rotation.x = -0.08
        scene.add(root)

        const coreSize = mobile ? 0.72 : mission ? 1.02 : 0.92
        coreGeometry = coreGeometryFor(THREE, room, coreSize)
        coreMaterial = new THREE.MeshBasicMaterial({
          color: palette.primary,
          wireframe: true,
          transparent: true,
          opacity: mission ? 0.2 : 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        core = new THREE.Mesh(coreGeometry, coreMaterial)
        core.position.set(2.55, -0.55, -1.2)
        root.add(core)

        haloGeometry = new THREE.SphereGeometry(mobile ? 1.04 : mission ? 1.48 : 1.34, 24, 16)
        haloMaterial = new THREE.MeshBasicMaterial({
          color: palette.secondary,
          wireframe: true,
          transparent: true,
          opacity: 0.035,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        halo = new THREE.Mesh(haloGeometry, haloMaterial)
        halo.position.copy(core.position)
        root.add(halo)

        ringAGeometry = new THREE.TorusGeometry(mobile ? 1.3 : mission ? 1.88 : 1.72, 0.012, 6, 96)
        ringAMaterial = new THREE.MeshBasicMaterial({
          color: palette.primary,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        ringA = new THREE.Mesh(ringAGeometry, ringAMaterial)
        ringA.position.copy(core.position)
        ringA.rotation.set(1.15, 0.35, -0.28)
        root.add(ringA)

        ringBGeometry = new THREE.TorusGeometry(mobile ? 1.06 : 1.42, 0.008, 6, 96)
        ringBMaterial = new THREE.MeshBasicMaterial({
          color: palette.secondary,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        ringB = new THREE.Mesh(ringBGeometry, ringBMaterial)
        ringB.position.copy(core.position)
        ringB.rotation.set(0.42, 1.08, 0.55)
        root.add(ringB)

        const particleCount = Math.max(
          24,
          Math.round((mobile ? 44 : constrained ? 82 : 118) * palette.density),
        )
        const positions = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i += 1) {
          const radius = 2.4 + Math.random() * 6.2
          const theta = Math.random() * Math.PI * 2
          const y = (Math.random() - 0.5) * 5.2
          positions[i * 3] = Math.cos(theta) * radius
          positions[i * 3 + 1] = y
          positions[i * 3 + 2] = Math.sin(theta) * radius - 2.5
          sizes[i] = 0.55 + Math.random() * 0.9
        }

        particleGeometry = new THREE.BufferGeometry()
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
        particleMaterial = new THREE.PointsMaterial({
          color: palette.secondary,
          size: mobile ? 0.018 : 0.024,
          transparent: true,
          opacity: 0.24,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
        particleField = new THREE.Points(particleGeometry, particleMaterial)
        root.add(particleField)

        const resize = () => {
          if (!renderer || !camera || !canvas) return
          const rect = canvas.getBoundingClientRect()
          const width = Math.max(2, rect.width)
          const height = Math.max(2, rect.height)
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(resize)
          resizeObserver.observe(canvas)
        } else {
          fallbackResize = resize
          window.addEventListener('resize', fallbackResize)
        }
        resize()

        let last = performance.now()
        let lastPaint = 0
        const render = (now) => {
          if (disposed || contextLost || !renderer || !scene || !camera) return
          if (!reduceMotion && lastPaint && now - lastPaint < frameInterval) {
            frame = requestAnimationFrame(render)
            return
          }
          lastPaint = now
          const dt = Math.min(40, now - last)
          last = now
          const t = now * 0.001

          if (!reduceMotion) {
            if (core) {
              core.rotation.x += dt * 0.000055
              core.rotation.y += dt * 0.000085
              core.position.y = -0.55 + Math.sin(t * 0.38) * 0.07
            }
            if (halo && core) {
              halo.rotation.y -= dt * 0.000025
              halo.position.y = core.position.y
            }
            if (ringA && core) {
              ringA.rotation.z += dt * 0.000055
              ringA.position.y = core.position.y
            }
            if (ringB && core) {
              ringB.rotation.z -= dt * 0.00004
              ringB.position.y = core.position.y
            }
            if (particleField) {
              particleField.rotation.y += dt * 0.000008
              particleField.rotation.x = Math.sin(t * 0.1) * 0.015
            }
            camera.position.x = Math.sin(t * 0.12) * 0.08
            camera.position.y = 0.15 + Math.cos(t * 0.1) * 0.05
            camera.lookAt(0.45, -0.1, -1.8)
          }

          renderer.render(scene, camera)
          if (!reduceMotion && !document.hidden) frame = requestAnimationFrame(render)
        }

        const onVisibility = () => {
          cancelAnimationFrame(frame)
          if (!document.hidden && !reduceMotion) {
            last = performance.now()
            lastPaint = 0
            frame = requestAnimationFrame(render)
          }
        }
        document.addEventListener('visibilitychange', onVisibility)

        render(performance.now())

        canvas.__astraCleanup = () => {
          document.removeEventListener('visibilitychange', onVisibility)
        }
      } catch {
        // WebGL is enhancement only. The CSS/2D Blackstar atmosphere remains.
      }
    }

    boot()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      if (fallbackResize) window.removeEventListener('resize', fallbackResize)
      canvas.removeEventListener('webglcontextlost', onContextLost, false)
      canvas.__astraCleanup?.()
      delete canvas.__astraCleanup

      particleGeometry?.dispose()
      particleMaterial?.dispose()
      coreGeometry?.dispose()
      coreMaterial?.dispose()
      haloGeometry?.dispose()
      haloMaterial?.dispose()
      ringAGeometry?.dispose()
      ringAMaterial?.dispose()
      ringBGeometry?.dispose()
      ringBMaterial?.dispose()
      renderer?.dispose()
    }
  }, [room])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-astra-depth-room={room}
      className={className}
    />
  )
}
