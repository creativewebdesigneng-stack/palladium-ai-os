import { CONTENT, EMAILS, SEO, MARKETING_ANALYTICS, AI_AGENTS, ISSUE_TONE } from './marketingData';
import { FileText, Mail, Search, BarChart3, Bot, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };
const TREND_COLOR = { up: 'text-emerald-400', down: 'text-rose-400', flat: 'text-zinc-500' };

export function ContentView() {
  return (
    <div className="space-y-2">
      {CONTENT.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <FileText className="h-4 w-4 text-violet-400" />
          <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-zinc-200">{p.title}</p><p className="text-[10px] text-zinc-500">{p.type} · by {p.agent} · {p.date}</p></div>
          <span className="text-[10px] text-zinc-400">{p.views.toLocaleString()} views</span>
          <span className={`rounded-full px-2 py-px text-[10px] ${p.status === 'Published' ? 'text-emerald-300 bg-emerald-400/10' : p.status === 'Scheduled' ? 'text-sky-300 bg-sky-400/10' : 'text-zinc-300 bg-white/5'}`}>{p.status}</span>
        </div>
      ))}
    </div>
  );
}

export function EmailView() {
  return (
    <div className="space-y-2">
      {EMAILS.map((e) => (
        <div key={e.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-sky-400" /><p className="flex-1 truncate text-[12px] text-zinc-200">{e.subject}</p><span className={`rounded-full px-2 py-px text-[10px] ${e.status === 'Sent' ? 'text-emerald-300 bg-emerald-400/10' : e.status === 'Scheduled' ? 'text-sky-300 bg-sky-400/10' : 'text-zinc-300 bg-white/5'}`}>{e.status}</span></div>
          {e.status === 'Sent' && <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div><p className="text-[9px] uppercase text-zinc-500">Sent</p><p className="text-sm font-semibold text-white">{(e.sent / 1000).toFixed(0)}k</p></div><div><p className="text-[9px] uppercase text-zinc-500">Open</p><p className="text-sm font-semibold text-white">{e.open}%</p></div><div><p className="text-[9px] uppercase text-zinc-500">Click</p><p className="text-sm font-semibold text-white">{e.click}%</p></div></div>}
        </div>
      ))}
    </div>
  );
}

export function SEOView() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">SEO Score</h3></div>
        <div className="mt-2 flex items-center gap-3"><p className="text-3xl font-bold text-white">{SEO.score}</p><div className="h-3 flex-1 rounded-full bg-white/5"><div className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${SEO.score}%` }} /></div></div>
        <p className="mb-2 mt-4 text-[10px] uppercase tracking-wide text-zinc-500">Tracked Keywords</p>
        <div className="space-y-1.5">
          {SEO.keywords.map((k) => { const I = TREND_ICON[k.trend]; return (
            <div key={k.term} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-[12px] text-zinc-200">#{k.rank}</span>
              <span className="flex-1 truncate text-[12px] text-zinc-300">{k.term}</span>
              <span className="text-[10px] text-zinc-500">{k.volume}</span>
              <I className={`h-3.5 w-3.5 ${TREND_COLOR[k.trend]}`} />
            </div>
          ); })}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Issues & Recommendations</h3>
        <div className="space-y-2">
          {SEO.issues.map((i, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <span className={`rounded-full px-2 py-px text-[10px] font-medium ${ISSUE_TONE[i.type]}`}>{i.type}</span>
              <p className="flex-1 text-[12px] text-zinc-200">{i.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsView() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MARKETING_ANALYTICS.map((m) => (
          <div key={m.k} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.k}</p>
            <p className="mt-1 text-xl font-semibold text-white">{m.v}</p>
            <p className="text-[10px] text-emerald-400">{m.d} vs prev</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Reach & Conversions · 7 days</h3></div>
        <div className="flex h-48 items-end gap-2">
          {[58, 72, 64, 88, 96, 82, 104].map((h, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400" style={{ height: h + 'px' }} /><div className="w-full rounded-t bg-gradient-to-t from-cyan-600/30 to-cyan-400" style={{ height: h * 0.4 + 'px' }} /></div>)}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-zinc-600"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
      </div>
    </>
  );
}

export function AIAgentsView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {AI_AGENTS.map((a) => (
        <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><Bot className="h-4 w-4 text-white" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-white">{a.name}</p><p className="truncate text-[10px] text-zinc-500">{a.role}</p></div><span className={`rounded-full px-2 py-px text-[10px] ${a.status === 'active' ? 'text-emerald-300 bg-emerald-400/10' : 'text-amber-300 bg-amber-400/10'}`}>{a.status}</span></div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500"><span>{a.tasks} tasks</span><span className="text-zinc-400">{a.success}% success</span></div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/5"><div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${a.success}%` }} /></div>
        </div>
      ))}
    </div>
  );
}