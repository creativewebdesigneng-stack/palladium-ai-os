import { LIVE_FEED } from './workforceData';

export default function LiveActivity() {
  return (
    <div className="relative space-y-3 pl-4">
      <div className="absolute bottom-1 left-1 top-1 w-px bg-white/10" />
      {LIVE_FEED.map((f, i) => (
        <div key={i} className="relative">
          <span className={`absolute -left-3 top-1.5 h-2.5 w-2.5 rounded-full ${f.color.replace('text', 'bg')} ring-2 ring-[#0c0d13]`} />
          <p className="text-xs text-zinc-300"><span className={f.color}>{f.agent}</span> {f.text}</p>
          <p className="text-[10px] text-zinc-600">{f.time}</p>
        </div>
      ))}
    </div>
  );
}