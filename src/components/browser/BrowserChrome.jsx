import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Monitor, Tablet, Smartphone, ExternalLink, Camera, Lock, Home } from 'lucide-react';
import { DEVICES } from './browserData';

const DEVS = [
  { id: 'desktop', I: Monitor },
  { id: 'tablet', I: Tablet },
  { id: 'mobile', I: Smartphone },
];

export default function BrowserChrome({ url, setUrl, device, setDevice, canBack, canForward, onBack, onForward, onRefresh, onScreenshot, onToast }) {
  const [draft, setDraft] = useState(url);

  const go = (e) => { e.preventDefault(); setUrl(draft.trim()); };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex gap-0.5">
          <button onClick={onBack} disabled={!canBack} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/10 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
          <button onClick={onForward} disabled={!canForward} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/10 disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
          <button onClick={onRefresh} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/10"><RotateCw className="h-4 w-4" /></button>
        </div>
        <form onSubmit={go} className="relative flex-1">
          <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-400" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-9 pr-9 text-[12px] text-zinc-200 outline-none" />
          <Home className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 hover:text-white" onClick={() => { setDraft('https://app.palladium.ai/'); setUrl('https://app.palladium.ai/'); }} />
        </form>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {DEVS.map(({ id, I }) => (
            <button key={id} onClick={() => setDevice(id)} className={`grid h-7 w-7 place-items-center rounded-md transition ${device === id ? 'bg-violet-500/25 text-white' : 'text-zinc-400 hover:text-white'}`} title={DEVICES[id].label}><I className="h-3.5 w-3.5" /></button>
          ))}
        </div>
        <div className="flex gap-0.5">
          <button onClick={onScreenshot} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/10" title="Screenshot"><Camera className="h-4 w-4" /></button>
          <button onClick={() => window.open(url, '_blank')} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/10" title="Open external"><ExternalLink className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}