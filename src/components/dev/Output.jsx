import { Terminal } from 'lucide-react';
import { OUTPUT } from './devData';

export default function Output() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2"><Terminal className="h-4 w-4 text-zinc-400" /><h3 className="text-sm font-semibold text-white">Output</h3></div>
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed">
        {OUTPUT.map((l, i) => <p key={i} className={l.startsWith('✓') ? 'text-emerald-400' : l.startsWith('>') ? 'text-zinc-300' : 'text-zinc-500'}>{l}</p>)}
      </div>
    </div>
  );
}