import { motion } from 'framer-motion';
import { Pencil, RefreshCw, Ban, Trash2, KeyRound } from 'lucide-react';
import { API_KEYS } from './modelsData';

export default function APIManagement() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">API Management</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{API_KEYS.length} keys</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 text-left text-[11px] text-zinc-500">
            <tr>{['Provider', 'Status', 'Last Used', 'Requests', 'Monthly Usage', 'Limit', ''].map(h => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {API_KEYS.map((k, i) => (
              <motion.tr key={k.provider} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-2.5"><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${k.grad} text-[10px] font-bold`}>{k.provider[0]}</span><span className="text-xs font-medium text-white">{k.provider}</span></div></td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] ${k.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>{k.status}</span></td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{k.lastUsed}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-300">{k.requests}</td>
                <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: k.usage === '—' ? '0%' : k.usage }} /></div><span className="text-[11px] text-zinc-500">{k.usage}</span></div></td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{k.limit}</td>
                <td className="px-3 py-2.5"><div className="flex justify-end gap-1"><IconBtn icon={Pencil} /><IconBtn icon={RefreshCw} /><IconBtn icon={Ban} /><IconBtn icon={Trash2} danger /></div></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, danger }) {
  return <button className={`rounded-lg border border-white/10 p-1.5 ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-zinc-400 hover:bg-white/5'}`}><Icon className="h-3.5 w-3.5" /></button>;
}