import { motion } from 'framer-motion';
import { Shield, Key, Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { SECURITY, STATUS } from './integrationsData';
import { SectionHead } from './shared';

export default function SecurityPanel() {
  const s = SECURITY;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Shield} title="Security & Credentials" grad="from-red-500 to-rose-500" />

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {s.summary.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-1.5 flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${m.grad}`}><m.icon className="h-3.5 w-3.5 text-white" /></span><span className="text-lg font-semibold text-white">{m.value}</span></div>
            <p className="text-[10px] text-zinc-500">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      <div className="mb-4 space-y-1.5">
        {s.alerts.map((a, i) => (
          <div key={i} className={`flex items-center gap-2 rounded-lg border p-2 ${a.level === 'error' ? 'border-red-400/20 bg-red-500/5' : a.level === 'warning' ? 'border-amber-400/20 bg-amber-500/5' : 'border-emerald-400/20 bg-emerald-500/5'}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br ${a.grad}`}><a.icon className="h-3 w-3 text-white" /></span>
            <p className="flex-1 text-xs text-zinc-300">{a.text}</p>
          </div>
        ))}
      </div>

      {/* Credentials */}
      <h4 className="mb-2 text-xs font-semibold text-white">Encrypted Credentials</h4>
      <div className="space-y-1.5">
        {s.credentials.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2.5">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{c.name}</p>
              <p className="truncate font-mono text-[10px] text-zinc-500">{c.masked}</p>
            </div>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{c.type}</span>
            <span className="hidden text-[10px] text-zinc-600 sm:inline">Rotated {c.lastRotated}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2.5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /><p className="text-xs text-emerald-300">All credentials AES-256 encrypted</p></div>
        <span className="text-[10px] text-emerald-400/70">Last check {s.lastCheck}</span>
      </div>
    </div>
  );
}