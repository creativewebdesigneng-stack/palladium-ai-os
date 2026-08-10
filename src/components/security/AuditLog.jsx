import { motion } from 'framer-motion';
import { History, Check, X, Download } from 'lucide-react';
import { AUDIT } from './securityData';
import { SectionHead } from './shared';

export default function AuditLog() {
  return (
    <div>
      <SectionHead icon={History} title="Audit Log" grad="from-cyan-500 to-sky-500" count={`${AUDIT.length} of 1,284`} action={
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Download className="h-3.5 w-3.5" />Export</button>
      } />
      <motion.div layout className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Resource</th>
                <th className="px-4 py-2.5 font-medium">IP Address</th>
                <th className="px-4 py-2.5 font-medium">Timestamp</th>
                <th className="px-4 py-2.5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {AUDIT.map((a, i) => (
                <motion.tr key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  className="text-xs text-zinc-300 hover:bg-white/[.025]">
                  <td className="px-4 py-3 font-medium text-white">{a.user}</td>
                  <td className="px-4 py-3"><code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">{a.action}</code></td>
                  <td className="px-4 py-3 text-zinc-400">{a.resource}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{a.ip}</td>
                  <td className="px-4 py-3 text-zinc-500">{a.time}</td>
                  <td className="px-4 py-3">
                    {a.result === 'success'
                      ? <span className="flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" />Success</span>
                      : <span className="flex items-center gap-1 text-red-400"><X className="h-3.5 w-3.5" />Failed</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}