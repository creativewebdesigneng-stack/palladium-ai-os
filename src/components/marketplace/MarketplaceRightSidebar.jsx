import { motion } from 'framer-motion';
import { Bell, Sparkles, Eye, Heart, TrendingUp, Newspaper, BadgeCheck } from 'lucide-react';
import { NOTIFICATIONS, RECOMMENDATIONS, RECENTLY_VIEWED, WISHLIST, FEATURED_CREATOR, MARKETPLACE_NEWS } from './marketplaceData';

const NOTIF_DOT = { update: 'bg-sky-400', recommend: 'bg-violet-400', sale: 'bg-emerald-400' };

function Panel({ icon: Icon, title, action, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-violet-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function MarketplaceRightSidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      <Panel icon={Bell} title="Notifications">
        <div className="space-y-2">
          {NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 text-[11px]">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${NOTIF_DOT[n.kind]}`} />
              <span className="text-zinc-300">{n.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Sparkles} title="Recommendations">
        <div className="space-y-1.5">
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5">
              <span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${r.grad} text-white`}>
                <r.icon className="h-3 w-3" />
              </span>
              {r.text}
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Eye} title="Recently Viewed">
        <div className="space-y-1">
          {RECENTLY_VIEWED.map((v, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/5">
              <span className="flex-1 truncate text-zinc-300">{v.name}</span>
              <span className="text-zinc-600">{v.type}</span>
              <span className="text-zinc-700">{v.time}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Heart} title="Wishlist">
        <div className="space-y-1.5">
          {WISHLIST.map((w, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px]">
              <span className="truncate text-zinc-300">{w.name}</span>
              <span className="shrink-0 text-violet-400">{w.price}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={TrendingUp} title="Featured Creator">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center">
          <div className="relative mx-auto h-14 w-14">
            <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${FEATURED_CREATOR.grad} text-lg font-bold text-white shadow-lg`}>
              {FEATURED_CREATOR.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            {FEATURED_CREATOR.verified && <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#0c0d13] text-sky-400" />}
          </div>
          <h4 className="mt-2 text-sm font-semibold text-white">{FEATURED_CREATOR.name}</h4>
          <p className="text-[11px] text-zinc-500">{FEATURED_CREATOR.handle}</p>
          <div className="mt-2 flex justify-center gap-3 text-[11px] text-zinc-500">
            <span><b className="text-white">{FEATURED_CREATOR.followers}</b> followers</span>
            <span><b className="text-white">{FEATURED_CREATOR.items}</b> items</span>
          </div>
          <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-1.5 text-xs font-medium text-white hover:opacity-90">Follow</button>
        </div>
      </Panel>

      <Panel icon={Newspaper} title="Marketplace News">
        <div className="space-y-2">
          {MARKETPLACE_NEWS.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <div>
                <p className="text-zinc-300">{n.title}</p>
                <p className="text-zinc-600">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}