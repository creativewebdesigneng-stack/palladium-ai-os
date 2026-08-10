import { HEALTH } from './monitoringData';

export default function ServiceCard({ service, onSelect, selected }) {
  const h = HEALTH[service.health];
  return (
    <button onClick={() => onSelect(service)} className={`flex flex-col gap-2 rounded-2xl border bg-white/[.03] p-4 text-left transition hover:bg-white/[.06] ${selected?.id === service.id ? `ring-1 ${h.ring} border-transparent` : 'border-white/10'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${h.dot}`} />
          <p className="text-[13px] font-semibold text-white">{service.name}</p>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${h.tone}`}>{h.label}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">{service.note}</p>
      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
        <span><span className="text-zinc-600">uptime</span> <span className="font-mono text-zinc-300">{service.uptime}%</span></span>
        <span><span className="text-zinc-600">p95</span> <span className="font-mono text-zinc-300">{service.latency}ms</span></span>
      </div>
    </button>
  );
}