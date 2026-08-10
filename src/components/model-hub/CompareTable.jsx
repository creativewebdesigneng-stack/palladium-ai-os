import { Check, X, Brain, Eye, Wrench, Sparkles } from 'lucide-react';

const ROWS = [
  { key: 'provider', label: 'Provider' },
  { key: 'context', label: 'Context' },
  { key: 'speed', label: 'Speed' },
  { key: 'cost', label: 'Cost' },
  { key: 'vision', label: 'Vision', bool: true },
  { key: 'tools', label: 'Tools', bool: true },
  { key: 'reasoning', label: 'Reasoning', bool: true },
];

export default function CompareTable({ models, onRemove }) {
  if (models.length === 0) return null;
  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
      <table className="w-full min-w-[520px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Attribute</th>
            {models.map(m => (
              <th key={m.id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-[11px] font-semibold text-white`}>{m.provider[0]}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{m.name}</p>
                    <p className="text-[10px] text-zinc-500">{m.provider}</p>
                  </div>
                  <button onClick={() => onRemove(m.id)} className="ml-auto text-zinc-600 hover:text-white">✕</button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(r => (
            <tr key={r.key} className="border-b border-white/5">
              <td className="p-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{r.label}</td>
              {models.map(m => (
                <td key={m.id} className="p-3">
                  {r.bool ? (
                    m[r.key] ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-zinc-700" />
                  ) : (
                    <span className="text-zinc-200">{m[r.key]}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Capabilities</td>
            {models.map(m => (
              <td key={m.id} className="p-3">
                <div className="flex flex-wrap gap-1">
                  {m.capabilities.map(c => <span key={c} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>)}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}