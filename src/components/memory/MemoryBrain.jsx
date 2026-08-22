import { useMemo } from 'react';

const NODE_COUNT = 44;

function seededPoint(index) {
  const angle = index * 2.3999632297;
  const ring = 0.25 + ((index * 37) % 70) / 100;
  const side = index % 2 === 0 ? -1 : 1;
  const x = 50 + side * (8 + Math.cos(angle) * 25 * ring) + Math.sin(angle * 0.7) * 5;
  const y = 50 + Math.sin(angle) * 35 * ring;
  return { x: Math.max(17, Math.min(83, x)), y: Math.max(13, Math.min(87, y)) };
}

export default function MemoryBrain({ memoryCount = 0, active = false, pulse = 0 }) {
  const density = Math.min(NODE_COUNT, Math.max(16, 16 + Math.ceil(Math.log2(memoryCount + 1) * 5)));
  const growth = Math.min(1.13, 0.9 + Math.log10(memoryCount + 1) * 0.065);
  const nodes = useMemo(() => Array.from({ length: NODE_COUNT }, (_, i) => seededPoint(i)), []);
  const visible = nodes.slice(0, density);
  const links = useMemo(
    () => visible.flatMap((node, i) => {
      const targets = [i + 1, i + 5, i + 9].filter((j) => j < visible.length);
      return targets.map((j) => ({ from: node, to: visible[j], id: `${i}-${j}` }));
    }),
    [visible]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(129,140,248,0.11),transparent_31%),radial-gradient(circle_at_30%_70%,rgba(34,211,238,0.07),transparent_34%)]" />
      <div
        className="memory-brain absolute right-[-7rem] top-[-5rem] h-[46rem] w-[46rem] opacity-70 sm:right-[-4rem] xl:right-[1rem]"
        style={{ transform: `scale(${growth})` }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" role="presentation">
          <defs>
            <filter id="memoryBrainGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="memoryBrainCore">
              <stop offset="0%" stopColor="rgb(224 231 255)" stopOpacity="0.9" />
              <stop offset="48%" stopColor="rgb(129 140 248)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d="M49 10C35 7 23 14 20 26c-8 5-10 17-4 25-4 10 2 22 12 25 5 11 18 15 28 9 10 5 23 0 27-11 9-5 12-17 6-25 5-10 0-22-10-26C75 12 62 7 49 10Z"
            fill="rgba(9,9,18,.34)"
            stroke="rgba(165,180,252,.18)"
            strokeWidth="0.55"
            filter="url(#memoryBrainGlow)"
          />
          <ellipse cx="51" cy="49" rx="35" ry="39" fill="url(#memoryBrainCore)" opacity="0.22" />

          <g className={active ? 'memory-brain-links is-active' : 'memory-brain-links'}>
            {links.map(({ from, to, id }, i) => (
              <line
                key={id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={i % 3 === 0 ? 'rgba(34,211,238,.28)' : 'rgba(165,180,252,.25)'}
                strokeWidth="0.32"
                strokeDasharray={i % 4 === 0 ? '1.2 1.8' : undefined}
                style={{ animationDelay: `${(i % 12) * -0.31}s` }}
              />
            ))}
          </g>

          <g filter="url(#memoryBrainGlow)">
            {visible.map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                r={i < 7 ? 0.85 : 0.48}
                fill={i % 4 === 0 ? 'rgb(103 232 249)' : 'rgb(199 210 254)'}
                opacity={0.42 + (i % 5) * 0.1}
                className="memory-brain-node"
                style={{ animationDelay: `${(i % 13) * -0.27}s` }}
              />
            ))}
          </g>

          <circle key={pulse} cx="50" cy="50" r="4" fill="none" stroke="rgba(129,140,248,.8)" strokeWidth="0.5" className="memory-brain-pulse" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#09090b] to-transparent" />
    </div>
  );
}
