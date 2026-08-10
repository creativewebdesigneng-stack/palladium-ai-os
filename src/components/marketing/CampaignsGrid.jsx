import { CAMPAIGNS, CAMPAIGN_STATUS, CHANNEL_TONE } from './marketingData';
import { Megaphone, Eye, Target, Wallet } from 'lucide-react';

export default function CampaignsGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {CAMPAIGNS.map((c) => (
        <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${CHANNEL_TONE[c.channel]}`}><Megaphone className="h-4 w-4 text-white" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{c.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{c.channel} · {c.owner}</p>
            </div>
            <span className={`rounded-full border px-2 py-px text-[10px] font-medium ${CAMPAIGN_STATUS[c.status]}`}>{c.status}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[9px] uppercase text-zinc-500">Budget</p><p className="text-sm font-semibold text-white">${(c.budget / 1000).toFixed(0)}k</p></div>
            <div><p className="text-[9px] uppercase text-zinc-500">Reach</p><p className="text-sm font-semibold text-white">{(c.reach / 1000).toFixed(0)}k</p></div>
            <div><p className="text-[9px] uppercase text-zinc-500">Conv.</p><p className="text-sm font-semibold text-white">{c.conversions.toLocaleString()}</p></div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{((c.conversions / (c.budget || 1)) * 1000).toFixed(0)} conv/$k</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{((c.conversions / (c.reach || 1)) * 100).toFixed(1)}%</span>
            <span className="ml-auto flex items-center gap-1"><Target className="h-3 w-3" />{c.status === 'active' ? 'Live' : c.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}