import { motion } from 'framer-motion';

/**
 * Mission Control ambience — glowing nodes with animated data streams between
 * them. Deliberately subtle: one slow SVG animation layer, no particle storms.
 */
const NODES = [
  { x: 12, y: 22 }, { x: 34, y: 12 }, { x: 58, y: 26 }, { x: 82, y: 16 },
  { x: 22, y: 62 }, { x: 48, y: 74 }, { x: 72, y: 58 }, { x: 90, y: 78 },
];
const LINKS = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [2, 6], [6, 7], [5, 7]];

export default function NeuralField({ className = '' }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[110px]" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70">
        <defs>
          <linearGradient id="mc-stream" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="50%" stopColor="rgba(167,139,250,.75)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>
        {LINKS.map(([a, b], i) => {
          const p = NODES[a]; const q = NODES[b];
          return (
            <g key={i}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(255,255,255,.07)" strokeWidth="0.15" />
              <line
                x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                stroke="url(#mc-stream)" strokeWidth="0.35" strokeLinecap="round"
                strokeDasharray="6 26"
              >
                <animate attributeName="stroke-dashoffset" from="32" to="0" dur={`${3.2 + i * 0.4}s`} repeatCount="indefinite" />
              </line>
            </g>
          );
        })}
        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="0.55" fill="rgba(196,181,253,.9)">
            <animate attributeName="r" values="0.4;0.85;0.4" dur={`${2.6 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <motion.div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/10 to-transparent"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
