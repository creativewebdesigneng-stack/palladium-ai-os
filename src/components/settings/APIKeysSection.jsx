import { useState } from 'react';
import { KeyRound, Plus, Copy, RotateCw, Trash2, Eye, EyeOff, Check } from 'lucide-react';
import { Panel } from './shared';
import { API_KEYS } from './settingsData';

export default function APIKeysSection() {
  const [keys, setKeys] = useState(API_KEYS);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);
  const [newKey, setNewKey] = useState(null);

  const reveal = (id) => setRevealed((r) => ({ ...r, [id]: !r[id] }));
  const copy = (id) => { setCopied(id); setTimeout(() => setCopied(null), 1500); };
  const rotate = (id) => setRevealed((r) => ({ ...r, [id]: false }));
  const revoke = (id) => setKeys((k) => k.filter((x) => x.id !== id));
  const create = () => {
    const id = 'key_' + Date.now();
    setNewKey({ id, name: 'New Key', prefix: 'pk_live_', full: 'sk_live_' + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18) });
  };

  return (
    <Panel icon={KeyRound} title="API Keys" grad="from-sky-500 to-cyan-500" desc="Create and revoke API keys. Secrets are never fully shown."
      action={<button onClick={create} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" /> New Key</button>}>
      {newKey && (
        <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-3.5">
          <div className="mb-1 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            <p className="text-xs font-medium text-emerald-200">Key created — copy it now, it won't be shown again.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white">{newKey.full}</code>
            <button onClick={() => copy(newKey.id)} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-white/5">{copied === newKey.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}</button>
            <button onClick={() => setNewKey(null)} className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-zinc-300 hover:bg-white/5">Done</button>
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {keys.map((k) => (
          <div key={k.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">{k.name}</p>
                <p className="text-[10px] text-zinc-500">{k.scope} · created {new Date(k.created).toLocaleDateString('en-GB')} · last used {new Date(k.lastUsed).toLocaleDateString('en-GB')}</p>
              </div>
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{k.prefix.includes('test') ? 'TEST' : 'LIVE'}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-1.5 font-mono text-xs text-zinc-400">
                {k.prefix}{revealed[k.id] ? k.masked.replace(/•/g, 'x') : k.masked}
              </code>
              <button onClick={() => reveal(k.id)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5">{revealed[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
              <button onClick={() => copy(k.id)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5">{copied === k.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}</button>
              <button onClick={() => rotate(k.id)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5"><RotateCw className="h-3.5 w-3.5" /></button>
              <button onClick={() => revoke(k.id)} className="rounded-lg border border-red-400/20 p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {keys.length === 0 && <p className="py-6 text-center text-xs text-zinc-500">No API keys. Create one to get started.</p>}
      </div>
    </Panel>
  );
}