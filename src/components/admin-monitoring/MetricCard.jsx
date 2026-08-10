import { METRICS } from './monitoringData';

const TONE = {
  violet: { stroke: '#a78bfa', fill: 'rgba(167,139,250,.18)' },
  cyan: { stroke: '#22d3ee', fill: 'rgba(34,211,238,.18)' },
  emerald: { stroke: '#34d399', fill: 'rgba(52,211,153,.18)' },
  amber: { stroke: '#fbbf24', fill: 'rgba(251,191,36,.18)' },
  rose: { stroke: '#fb7185', fill: 'rgba(251,113,133,.18)' },
  blue: { stroke: '#60a5fa', fill: 'rgba(96,165,250,.18)' },
};

function Sparkline({ series, tone }) {
  const t = TONE[tone] || TONE.violet;
  const w = 120, h = 36, max = Math.max(...series), min = Math.min(...series);
  const range = max - min || 1;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <polygon points={area} fill={t.fill} />
      <polyline points={pts} fill="none" stroke={t.stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function MetricCard({ id }) {
  const m = METRICS[id];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{m.label}</span>
        <span className="font-mono text-[15px] font-semibold text-white">{m.value.toLocaleString()}<span className="ml-0.5 text-[10px] font-normal text-zinc-500">{m.unit}</span></span>
      </div>
      <div className="mt-2"><Sparkline series={m.series} tone={m.tone} /></div>
    </div>
  );
}