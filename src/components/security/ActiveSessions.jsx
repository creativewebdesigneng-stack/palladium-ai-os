import { motion } from 'framer-motion';
import { MonitorSmartphone, LogOut, AlertTriangle, MapPin } from 'lucide-react';
import { SESSIONS } from './securityData';
import { SectionHead, StatusPill } from './shared';

export default function ActiveSessions({ query }) {
  const q = query.trim().toLowerCase();
  const list = q ? SESSIONS.filter(s => s.device.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.browser.toLowerCase().includes(q)) : SESSIONS;
  return (
    <div>
      <SectionHead icon={MonitorSmartphone} title="Active Sessions" grad="from-sky-500 to-blue-500" count={list.length} action={
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><LogOut className="h-3.5 w-3.5" />Sign out all others</button>
      } />
      <motion.div layout className="space-y-2">
        {list.map((s, i) => (
          <motion.div key={s.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${s.current ? 'border-violet-400/30 bg-violet-500/5' : s.suspicious ? 'border-amber-400/20 bg-amber-400/[.03]' : 'border-white/10 bg-white/[.025]'}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${s.grad}`}><s.icon className="h-5 w-5 text-white" /></span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{s.device}</p>
                  {s.current && <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">This device</span>}
                  {s.suspicious && <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"><AlertTriangle className="h-3 w-3" />Suspicious</span>}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{s.browser} · {s.os}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600"><MapPin className="h-3 w-3" />{s.location} · {s.ip}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-13 sm:pl-0">
              <p className="text-[11px] text-zinc-500">{s.lastActive}</p>
              {!s.current && (
                <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><LogOut className="h-3.5 w-3.5" />Sign out</button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}