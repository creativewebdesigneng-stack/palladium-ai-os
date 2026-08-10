import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, KeyRound } from 'lucide-react';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from './teamData';
import { SectionHead } from './shared';

const groups = [...new Set(PERMISSIONS.map(p => p.group))];

export default function RolesPermissions() {
  const [selected, setSelected] = useState('admin');
  const role = ROLES.find(r => r.id === selected) || ROLES[0];
  const granted = new Set(ROLE_PERMISSIONS[selected] || []);

  return (
    <div>
      <SectionHead icon={KeyRound} title="Roles & Permissions" grad="from-amber-500 to-orange-500" count={`${ROLES.length} roles`} />
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        {/* Role list */}
        <div className="space-y-1.5">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setSelected(r.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${selected === r.id ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/10 bg-white/[.02] hover:bg-white/5'}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${r.grad}`}><r.icon className="h-4 w-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{r.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{r.members} member{r.members === 1 ? '' : 's'}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="mb-4 flex items-center gap-2.5">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${role.grad}`}><role.icon className="h-4.5 w-4.5 text-white" /></span>
            <div>
              <p className="text-sm font-semibold text-white">{role.name}</p>
              <p className="text-[11px] text-zinc-500">{role.desc}</p>
            </div>
          </div>

          <div className="space-y-4">
            {groups.map(g => (
              <div key={g}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{g}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {PERMISSIONS.filter(p => p.group === g).map(p => {
                    const on = granted.has(p.id);
                    return (
                      <div key={p.id} className={`flex items-center gap-2 rounded-lg border p-2.5 ${on ? 'border-emerald-400/20 bg-emerald-500/5' : 'border-white/5 bg-white/[.015]'}`}>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-600'}`}>
                          {on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </span>
                        <p.icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span className={`text-xs ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}