import { Instagram, Facebook, Linkedin, Twitter, Music2, Youtube, TrendingUp, Users, FileText } from 'lucide-react';
import { PLATFORMS, SOCIAL_POSTS } from './marketingData';

const ICONS = { Instagram, Facebook, Linkedin, Twitter, Music2, Youtube };

export default function SocialMediaPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Connected Platforms</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((p) => { const I = ICONS[p.icon]; return (
            <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${p.tone}`}><I className="h-4 w-4 text-white" /></span>
                <div>
                  <p className="text-[12px] font-medium text-white">{p.label}</p>
                  <p className="text-[10px] text-zinc-500">{p.followers} followers</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{p.posts} posts</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-400" />{p.engagement}%</span>
              </div>
            </div>
          ); })}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Recent Posts</h3>
        <div className="space-y-2">
          {SOCIAL_POSTS.map((s) => { const p = PLATFORMS.find((pl) => pl.id === s.platform); const I = ICONS[p.icon]; return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${p.tone}`}><I className="h-3.5 w-3.5 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-zinc-200">{s.title}</p>
                <p className="text-[10px] text-zinc-500">{p.label} · {s.when}</p>
              </div>
              <div className="text-right text-[10px]"><p className="text-zinc-400">{(s.reach / 1000).toFixed(0)}k reach</p><p className="text-emerald-400">{s.engagement}% eng</p></div>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}