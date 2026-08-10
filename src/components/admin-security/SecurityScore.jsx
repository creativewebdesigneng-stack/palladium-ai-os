import { ShieldCheck } from 'lucide-react';
import { SCORE_BREAKDOWN } from './securityData';

export default function SecurityScore({ data }) {
  const { score, label, trend, detail } = data;
  const r = 52, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ss)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
            <defs>
              <linearGradient id="ss" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{score}</span>
            <span className="text-[10px] text-zinc-500">/ 100</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-emerald-300"><ShieldCheck className="h-4 w-4" /><span className="text-sm font-semibold">{label}</span><span className="text-[10px] font-medium text-emerald-300">({trend})</span></div>
          <p className="mt-1 text-[12px] text-zinc-400">{detail}</p>
          <div className="mt-3 space-y-1.5">
            {SCORE_BREAKDOWN.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-[10px] text-zinc-500">{s.label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-white/5"><div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: s.value + '%' }} /></div>
                <span className="w-7 text-right text-[10px] text-zinc-400">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}