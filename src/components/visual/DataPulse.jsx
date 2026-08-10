// Thin animated data pathway — a travelling pulse along a horizontal line.
// Used under workflow/section headers to make the interface feel like a living
// digital nervous system. Stretches to its container width. Honours reduced
// motion via the global CSS reduced-motion override.
export default function DataPulse({ active = true, duration = 2.4, className = '' }) {
  return (
    <svg aria-hidden className={`block w-full ${className}`} height="2" viewBox="0 0 100 2" preserveAspectRatio="none">
      <line x1="0" y1="1" x2="100" y2="1" stroke="rgba(120,150,210,.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {active && (
        <line
          x1="0" y1="1" x2="100" y2="1"
          stroke="rgba(160,185,255,.85)" strokeWidth="1.2"
          strokeDasharray="4 16" className="dp-flow" vectorEffect="non-scaling-stroke"
          style={{ animationDuration: `${duration}s` }}
        />
      )}
    </svg>
  );
}