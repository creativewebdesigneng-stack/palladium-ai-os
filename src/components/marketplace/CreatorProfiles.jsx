import { motion } from 'framer-motion';
import { Users, BadgeCheck, Globe, UserPlus } from 'lucide-react';
import SectionHead from './SectionHead';
import { CREATORS } from './marketplaceData';

export default function CreatorProfiles() {
  return (
    <div>
      <SectionHead icon={Users} title="Top Creators" count={CREATORS.length} grad="from-fuchsia-500 to-pink-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CREATORS.map((c, i) => (
          <motion.article
            key={c.handle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -3 }}
            className="group rounded-2xl border border-white/10 bg-white/[.025] p-4 text-center hover:border-violet-400/30"
          >
            <div className="relative mx-auto h-16 w-16">
              <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${c.grad} text-xl font-bold text-white shadow-lg`}>
                {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              {c.verified && <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#0c0d13] text-sky-400" />}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">{c.name}</h3>
            <p className="text-[11px] text-zinc-500">{c.handle}</p>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center">
              <div><p className="text-xs font-semibold text-white">{c.followers}</p><p className="text-[9px] text-zinc-600">Followers</p></div>
              <div><p className="text-xs font-semibold text-white">{c.items}</p><p className="text-[9px] text-zinc-600">Items</p></div>
              <div><p className="text-xs font-semibold text-white">{c.downloads}</p><p className="text-[9px] text-zinc-600">Downloads</p></div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-1.5 text-[11px] font-medium text-white hover:opacity-90">
                <UserPlus className="h-3 w-3" />Follow
              </button>
              <button className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><Globe className="h-3.5 w-3.5" /></button>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}