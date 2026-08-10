import { useEffect, useRef } from 'react';

// PalladiumAI core visual engine. A single canvas component that renders the
// deep-space / neural-network aesthetic in two modes:
//   - 'space': starfield + drifting neural nodes + travelling pulses + faint
//     palladium-inspired hexagons + drifting nebula clouds (galaxy movement) +
//     glowing particles + vertical AI data streams + occasional metallic
//     streaks. Used as the global / page background.
//   - 'brain': nodes arranged into a two-lobe neural "brain" that grows in on
//     mount, breathes, and fires pulses whose frequency tracks `agentStates`
//     (online/working/thinking…). Used behind agent interfaces.
//
// Performance: capped node counts, DPR capped at 2, pauses when the tab is
// hidden, halves density on mobile, and renders a single static frame when the
// user prefers reduced motion. Designed so a future backend can drive state via
// the `agentStates` prop without touching this file.

const INTENSITY = {
  subtle: { nodes: 22, stars: 60, speed: 0.14, line: 118, pulse: 0.0016, hex: 0.0006, alpha: 0.5, nebula: 2, streams: 4, metal: 0.0008, glow: 6 },
  low: { nodes: 34, stars: 84, speed: 0.18, line: 128, pulse: 0.0022, hex: 0.0009, alpha: 0.62, nebula: 3, streams: 6, metal: 0.0012, glow: 8 },
  medium: { nodes: 46, stars: 110, speed: 0.22, line: 136, pulse: 0.003, hex: 0.0012, alpha: 0.72, nebula: 3, streams: 8, metal: 0.0016, glow: 12 },
  hero: { nodes: 72, stars: 160, speed: 0.26, line: 146, pulse: 0.005, hex: 0.0016, alpha: 0.9, nebula: 4, streams: 12, metal: 0.0022, glow: 18 },
};

export const STATUS_ACTIVITY = {
  online: 1, working: 1.7, thinking: 1.35, completed: 1.1, running: 1.7, active: 1.3,
  idle: 0.45, paused: 0.4, stopped: 0.25, offline: 0.2, error: 0.3,
};

const rand = (a, b) => a + Math.random() * (b - a);

export default function NeuralSpace({
  mode = 'space',
  intensity = 'low',
  className = '',
  agentStates,
  interactive = false,
  hex = true,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const agentRef = useRef(agentStates);
  agentRef.current = agentStates;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 768;
    const cfg = INTENSITY[intensity] || INTENSITY.low;
    const mf = mobile ? 0.5 : 1;
    const nodeCount = Math.round(cfg.nodes * mf);
    const starCount = Math.round(cfg.stars * mf);
    let w = 0, h = 0;
    let nodes = [], stars = [], pulses = [], hexes = [], nebula = [], glow = [], streams = [], metal = [];
    let t0 = performance.now();
    let start = 0;
    const mouse = { x: -9999, y: -9999 };

    const build = () => {
      if (mode === 'brain') {
        const lobes = [
          { x: w * 0.4, y: h * 0.5, r: Math.min(w, h) * 0.26 },
          { x: w * 0.62, y: h * 0.5, r: Math.min(w, h) * 0.26 },
        ];
        nodes = Array.from({ length: nodeCount }, () => {
          const lobe = lobes[Math.random() < 0.5 ? 0 : 1];
          const a = Math.random() * Math.PI * 2;
          const rr = Math.pow(Math.random(), 0.7) * lobe.r;
          return {
            x: lobe.x + Math.cos(a) * rr * 1.15,
            y: lobe.y + Math.sin(a) * rr * 0.82,
            vx: rand(-0.05, 0.05), vy: rand(-0.05, 0.05),
            r: rand(0.8, 2), ph: Math.random() * Math.PI * 2,
          };
        });
      } else {
        nodes = Array.from({ length: nodeCount }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: rand(-0.12, 0.12) * cfg.speed, vy: rand(-0.12, 0.12) * cfg.speed,
          r: rand(0.7, 1.8), ph: Math.random() * Math.PI * 2,
        }));
      }
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rand(0.3, 1.1), tw: rand(0.4, 1.4), ph: Math.random() * Math.PI * 2,
      }));
      pulses = []; hexes = []; metal = [];
      nebula = Array.from({ length: Math.round(cfg.nebula * mf) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rand(Math.min(w, h) * 0.22, Math.min(w, h) * 0.5), hue: rand(245, 290),
        vx: rand(-0.02, 0.02), vy: rand(-0.015, 0.015), ph: Math.random() * Math.PI * 2,
      }));
      glow = Array.from({ length: Math.round(cfg.glow * mf) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: rand(-0.08, 0.08) * cfg.speed, vy: rand(-0.08, 0.08) * cfg.speed,
        r: rand(1.1, 2.4), ph: Math.random() * Math.PI * 2,
      }));
      streams = Array.from({ length: Math.round(cfg.streams * mf) }, () => ({
        x: Math.random() * w, y: rand(-h, 0), spd: rand(0.3, 0.9), len: rand(40, 120), ph: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (w < 2 || h < 2) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const activity = () => {
      const a = agentRef.current;
      if (!a || !a.length) return 0.8 + Math.sin(t0 * 0.0006) * 0.15;
      let s = 0;
      for (const st of a) s += STATUS_ACTIVITY[(st || '').toLowerCase()] ?? 0.6;
      return s / a.length;
    };

    const spawnPulse = () => {
      if (nodes.length < 2) return;
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let b = nodes[Math.floor(Math.random() * nodes.length)];
      let guard = 0;
      while (b === a && guard++ < 4) b = nodes[Math.floor(Math.random() * nodes.length)];
      const act = activity();
      pulses.push({ a, b, p: 0, spd: (0.004 + Math.random() * 0.006) * (0.6 + act) });
      if (pulses.length > 40) pulses.shift();
    };

    const drawHex = (cx, cy, r, rot, alpha) => {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const ang = rot + (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(130,160,210,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = (now) => {
      const dt = Math.min(40, now - t0);
      t0 = now;
      if (!start) start = now;
      const act = activity();
      // Brain "grows" in over the first ~1.6s, then settles into a breathing pulse.
      const growth = mode === 'brain' ? 0.82 + Math.min(1, (now - start) / 1600) * 0.18 : 1;
      const breath = mode === 'brain' ? (1 + Math.sin(now * 0.0008) * 0.045) * growth : 1;
      ctx.clearRect(0, 0, w, h);

      // nebula / subtle galaxy movement (space mode only)
      if (mode !== 'brain') {
        for (const nb of nebula) {
          nb.x += nb.vx * (dt / 16); nb.y += nb.vy * (dt / 16);
          if (nb.x < -nb.r) nb.x = w + nb.r; if (nb.x > w + nb.r) nb.x = -nb.r;
          if (nb.y < -nb.r) nb.y = h + nb.r; if (nb.y > h + nb.r) nb.y = -nb.r;
          const a = 0.05 * cfg.alpha * (0.6 + 0.4 * Math.sin(now * 0.0004 + nb.ph));
          const g = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
          g.addColorStop(0, `hsla(${nb.hue}, 70%, 62%, ${a})`);
          g.addColorStop(1, 'hsla(240, 60%, 18%, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(nb.x - nb.r, nb.y - nb.r, nb.r * 2, nb.r * 2);
        }
      }

      // stars
      for (const s of stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.001 * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,230,${0.25 * tw})`;
        ctx.fill();
      }

      // palladium-inspired hexagons
      if (hex && !reduce && Math.random() < cfg.hex * (dt / 16)) {
        hexes.push({ x: Math.random() * w, y: Math.random() * h, r: rand(40, 110), rot: Math.random() * Math.PI, life: 1 });
        if (hexes.length > 3) hexes.shift();
      }
      for (let i = hexes.length - 1; i >= 0; i--) {
        const hx = hexes[i];
        hx.life -= 0.004;
        if (hx.life <= 0) { hexes.splice(i, 1); continue; }
        drawHex(hx.x, hx.y, hx.r, hx.rot + now * 0.0002, 0.05 * hx.life * cfg.alpha);
      }

      // move nodes
      const cx = w / 2, cy = h / 2;
      for (const n of nodes) {
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);
        if (mode !== 'brain') {
          if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;
        } else if (n.x < 0 || n.x > w || n.y < 0 || n.y > h) { n.vx *= -1; n.vy *= -1; }
        if (interactive && mouse.x > -9000) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 140 && d > 0.1) { n.x += (dx / d) * 0.18; n.y += (dy / d) * 0.18; }
        }
      }
      const px = (n) => cx + (n.x - cx) * breath;
      const py = (n) => cy + (n.y - cy) * breath;

      // connections
      const lineMax = cfg.line * (mode === 'brain' ? 1.35 : 1);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < lineMax) {
            const al = (1 - d / lineMax) * 0.16 * cfg.alpha * (0.7 + act * 0.4);
            ctx.beginPath();
            ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b));
            ctx.strokeStyle = mode === 'brain' ? `rgba(140,165,220,${al})` : `rgba(120,150,210,${al})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const gl = 0.5 + 0.5 * Math.sin(now * 0.002 + n.ph);
        ctx.beginPath();
        ctx.arc(px(n), py(n), n.r + gl * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = mode === 'brain' ? `rgba(210,220,240,${0.55 * cfg.alpha})` : `rgba(200,215,235,${0.5 * cfg.alpha})`;
        ctx.fill();
      }

      // glowing particles (space mode only) — brighter haloed nodes
      if (mode !== 'brain') {
        for (const gp of glow) {
          gp.x += gp.vx * (dt / 16); gp.y += gp.vy * (dt / 16);
          if (gp.x < -10) gp.x = w + 10; if (gp.x > w + 10) gp.x = -10;
          if (gp.y < -10) gp.y = h + 10; if (gp.y > h + 10) gp.y = -10;
          const pul = 0.5 + 0.5 * Math.sin(now * 0.0018 + gp.ph);
          const r = gp.r * (0.8 + pul * 0.4);
          const g = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, r * 4);
          g.addColorStop(0, `rgba(190,205,255,${0.5 * cfg.alpha})`);
          g.addColorStop(0.4, `rgba(150,170,240,${0.12 * cfg.alpha})`);
          g.addColorStop(1, 'rgba(150,170,240,0)');
          ctx.fillStyle = g;
          ctx.fillRect(gp.x - r * 4, gp.y - r * 4, r * 8, r * 8);
          ctx.beginPath(); ctx.arc(gp.x, gp.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(225,232,255,${0.85 * cfg.alpha})`; ctx.fill();
        }

        // AI data streams
        for (const st of streams) {
          st.y += st.spd * (dt / 16) * (0.6 + act * 0.4);
          if (st.y > h + st.len) { st.y = -st.len; st.x = Math.random() * w; }
          const grad = ctx.createLinearGradient(st.x, st.y - st.len, st.x, st.y);
          grad.addColorStop(0, 'rgba(120,200,255,0)');
          grad.addColorStop(1, `rgba(120,200,255,${0.10 * cfg.alpha})`);
          ctx.strokeStyle = grad; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(st.x, st.y - st.len); ctx.lineTo(st.x, st.y); ctx.stroke();
          ctx.beginPath(); ctx.arc(st.x, st.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150,220,255,${0.5 * cfg.alpha})`; ctx.fill();
        }

        // metallic streaks
        if (!reduce && Math.random() < cfg.metal * (dt / 16)) {
          metal.push({ x: Math.random() * w, y: Math.random() * h, len: rand(120, 260), ang: rand(-0.3, 0.3) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2), life: 1 });
          if (metal.length > 4) metal.shift();
        }
        for (let i = metal.length - 1; i >= 0; i--) {
          const m = metal[i]; m.life -= 0.006;
          if (m.life <= 0) { metal.splice(i, 1); continue; }
          const x2 = m.x + Math.cos(m.ang) * m.len, y2 = m.y + Math.sin(m.ang) * m.len;
          const grad = ctx.createLinearGradient(m.x, m.y, x2, y2);
          grad.addColorStop(0, 'rgba(229,231,235,0)');
          grad.addColorStop(0.5, `rgba(200,215,240,${0.16 * m.life * cfg.alpha})`);
          grad.addColorStop(1, 'rgba(229,231,235,0)');
          ctx.strokeStyle = grad; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }

      // travelling pulses (brain waits until it has grown)
      if (growth > 0.95 && !reduce && Math.random() < cfg.pulse * (dt / 16) * (0.5 + act)) spawnPulse();
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pl = pulses[i];
        pl.p += pl.spd * (dt / 16);
        if (pl.p >= 1) { pulses.splice(i, 1); continue; }
        const x = px(pl.a) + (px(pl.b) - px(pl.a)) * pl.p;
        const y = py(pl.a) + (py(pl.b) - py(pl.a)) * pl.p;
        const fade = Math.sin(pl.p * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + fade * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(170,195,255,${0.7 * fade})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px(pl.a), py(pl.a)); ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(150,180,255,${0.12 * fade})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else if (!reduce) { t0 = performance.now(); rafRef.current = requestAnimationFrame(draw); }
    };

    resize();
    if (reduce) { draw(performance.now()); cancelAnimationFrame(rafRef.current); }
    else { rafRef.current = requestAnimationFrame(draw); }
    window.addEventListener('resize', resize);
    if (interactive) { window.addEventListener('mousemove', onMove); canvas.addEventListener('mouseleave', onLeave); }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mode, intensity, interactive, hex]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}