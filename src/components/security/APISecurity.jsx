import { motion } from 'framer-motion';
import { useState } from 'react';
import { KeyRound, Ticket, Plug, Webhook, UserCog, Copy, RotateCw, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { API_SECURITY } from './securityData';
import { SectionHead, StatusPill } from './shared';

const SECTIONS = [
  { id: 'keys', label: 'API Keys', icon: KeyRound, grad: 'from-amber-500 to-orange-500', items: API_SECURITY.keys, cols: [['Name', 'name'], ['Key', 'prefix'], ['Scope', 'scope'], ['Created', 'created'], ['Last used', 'lastUsed'], ['Status', 'status']] },
  { id: 'tokens', label: 'Access Tokens', icon: Ticket, grad: 'from-violet-500 to-indigo-500', items: API_SECURITY.tokens, cols: [['Name', 'name'], ['Token', 'prefix'], ['Scope', 'scope'], ['Expires', 'expires'], ['Status', 'status']] },
  { id: 'oauth', label: 'OAuth Connections', icon: Plug, grad: 'from-fuchsia-500 to-purple-500', items: API_SECURITY.oauth, cols: [['Provider', 'name'], ['Token', 'prefix'], ['Scopes', 'scope'], ['Status', 'status']] },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, grad: 'from-sky-500 to-blue-500', items: API_SECURITY.webhooks, cols: [['Name', 'name'], ['Endpoint', 'url'], ['Events', 'events'], ['Status', 'status']] },
  { id: 'svc', label: 'Service Accounts', icon: UserCog, grad: 'from-emerald-500 to-teal-500', items: API_SECURITY.serviceAccounts, cols: [['Account', 'name'], ['Token', 'prefix'], ['Role', 'role'], ['Status', 'status']] },
];

function Row({ item, cols }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <tr className="text-xs text-zinc-300 hover:bg-white/[.025]">
      {cols.map(([label, key]) => (
        <td key={key} className="px-4 py-3">
          {key === 'status' ? <StatusPill status={item[key]} /> :
           key === 'prefix' ? (
            <div className="flex items-center gap-1.5">
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{revealed ? item.prefix : '••••••••••••••••'}</code>
              <button onClick={() => setRevealed(v => !v)} className="text-zinc-500 hover:text-white">{revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
              <button className="text-zinc-500 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          ) :
           key === 'url' ? <code className="font-mono text-[11px] text-zinc-400">{item[key]}</code> :
           key === 'events' ? <span className="tabular-nums">{item[key].toLocaleString()}</span> :
           key === 'name' ? <span className="font-medium text-white">{item[key]}</span> :
           <span className="text-zinc-400">{item[key]}</span>}
        </td>
      ))}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button title="Rotate" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><RotateCw className="h-3.5 w-3.5" /></button>
          <button title="Revoke" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-red-400 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

export default function APISecurity() {
  const [active, setActive] = useState('keys');
  const sec = SECTIONS.find(s => s.id === active);
  return (
    <div>
      <SectionHead icon={KeyRound} title="API Security" grad="from-amber-500 to-orange-500" action={
        <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />New key</button>
      } />
      <div className="mb-3 flex flex-wrap gap-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${active === s.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <s.icon className="h-3.5 w-3.5" />{s.label}<span className="rounded bg-white/5 px-1 text-[10px] text-zinc-500">{s.items.length}</span>
          </button>
        ))}
      </div>
      <motion.div key={active} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                {sec.cols.map(([label]) => <th key={label} className="px-4 py-2.5 font-medium">{label}</th>)}
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sec.items.map(item => <Row key={item.id} item={item} cols={sec.cols} />)}
            </tbody>
          </table>
        </div>
      </motion.div>
      <p className="mt-2 text-[10px] text-zinc-600">Secrets are never shown in full. Use the eye toggle only in trusted environments.</p>
    </div>
  );
}