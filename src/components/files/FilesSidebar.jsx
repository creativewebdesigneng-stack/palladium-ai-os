import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HardDrive } from 'lucide-react';
import { SIDEBAR_FOLDERS } from './filesData';
import { Progress } from './shared';

export default function FilesSidebar({ active, setActive }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-1">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`} />
        Folders
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {SIDEBAR_FOLDERS.map(f => {
              const isActive = active === f.label;
              return (
                <button
                  key={f.label}
                  onClick={() => setActive(isActive ? null : f.label)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition ${isActive ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${f.grad}`}>
                    <f.icon className="h-3 w-3 text-white" />
                  </span>
                  <span className="flex-1 text-left">{f.label}</span>
                  <span className="text-[10px] tabular-nums text-zinc-600">{f.count.toLocaleString()}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3">
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-white">Storage</span>
        </div>
        <Progress value={41} grad="from-violet-500 to-indigo-500" />
        <p className="mt-2 text-[10px] text-zinc-500">847 GB of 2 TB used</p>
      </div>
    </div>
  );
}