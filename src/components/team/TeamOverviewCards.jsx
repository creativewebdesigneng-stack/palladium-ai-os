import { motion } from 'framer-motion';
import { Users, UserCheck, Network, ShieldCheck, UserCog } from 'lucide-react';

export default function TeamOverviewCards({ members = [], teams = [], loading }) {
  const total = members.length;
  const owners = members.filter((m) => m.role === 'owner').length;
  const admins = members.filter((m) => m.role === 'admin').length;
  const regular = members.filter((m) => m.role === 'member').length;

  const cards = [
    { label: 'Total Members', value: total, grad: 'from-violet-500 to-indigo-500', icon: Users },
    { label: 'Teams', value: teams.length, grad: 'from-sky-500 to-blue-500', icon: Network },
    { label: 'Owners', value: owners, grad: 'from-amber-500 to-yellow-500', icon: ShieldCheck },
    { label: 'Admins', value: admins, grad: 'from-rose-500 to-red-500', icon: UserCog },
    { label: 'Members', value: regular, grad: 'from-emerald-500 to-teal-500', icon: UserCheck },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.25) }} whileHover={{ y: -2 }}
          className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}><m.icon className="h-4 w-4 text-white" /></span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-white">{m.value}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{m.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
