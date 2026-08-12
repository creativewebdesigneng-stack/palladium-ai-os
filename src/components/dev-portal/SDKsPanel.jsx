import { useState } from 'react';
import { Package, Copy, Check } from 'lucide-react';
import { SDKS } from './devPortalData';
import { highlight } from '@/components/dev/highlight';

const LANGS = Object.keys(SDKS);

export default function SDKsPanel() {
  const [lang, setLang] = useState('cURL');
  const [copied, setCopied] = useState(false);
  const sdk = SDKS[lang];
  const copy = (txt) => { navigator.clipboard?.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1200); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Package className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Code examples</h2></div>
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1">
        {LANGS.map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-medium ${lang === l ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white">Install</span>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
            <code className="flex-1 font-mono text-[11px] text-zinc-300">{sdk.install}</code>
            <button onClick={() => copy(sdk.install)} className="text-zinc-500 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
        </div>
        <p className="mb-2 text-[11px] font-semibold text-white">Quickstart</p>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4">
          <pre className="font-mono text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: highlight(sdk.code, sdk.lang) }} />
        </div>
      </div>
    </div>
  );
}