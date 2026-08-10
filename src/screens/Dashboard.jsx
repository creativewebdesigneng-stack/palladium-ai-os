import { Bot, Cpu, Workflow, Zap, FolderKanban, Files, MessageSquare, Bell, Activity, CreditCard, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import MetricCard from '@/components/palladium/MetricCard';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const activity = ['Research Agent completed market brief', 'GitHub workflow deployed v2.4.1', 'Maya connected Gemini 2.5 Pro', 'Invoice #PI-2048 was paid'];
const quick = [['New chat','/chat',MessageSquare],['Create agent','/agents/new',Bot],['Run research','/search',Activity],['Upload file','/files-analysis',Files]];

export default function Dashboard() {
  return (
    <>
      <PageHeader eyebrow="Workspace" title="AI Workspace Dashboard" description="Your AI operating system at a glance." action={<button onClick={() => toast({ title: 'Quick start', description: 'Onboarding guide will open here once the backend is connected.' })} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">Quick start</button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="AI requests today" value="4,128" detail="12.4% vs yesterday" icon={Zap} />
        <MetricCard label="Running agents" value="3" detail="2 active now" icon={Bot} />
        <MetricCard label="Running tasks" value="8" detail="4 queued" icon={Workflow} />
        <MetricCard label="Connected models" value="7" detail="All operational" icon={Cpu} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="AI usage" subtitle="Requests across the last 7 days" className="xl:col-span-2">
          <div className="flex h-52 items-end gap-2">{[38, 58, 46, 72, 64, 88, 78, 92, 68, 96, 84, 104].map((h, i) => <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400" style={{ height: h + 'px' }} />)}</div>
          <div className="mt-3 flex justify-between text-[10px] text-zinc-600"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
        </Panel>
        <Panel title="Quick actions" subtitle="Jump back in"><div className="grid grid-cols-2 gap-2">{quick.map(([l, p, I]) => <Link key={l} to={p} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm text-zinc-300 hover:border-violet-400/30 hover:bg-white/5"><I className="h-4 w-4 text-violet-400" />{l}<ArrowRight className="ml-auto h-3.5 w-3.5 text-zinc-600" /></Link>)}</div></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Today's activity"><div className="space-y-4">{activity.map((a, i) => <div key={a} className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" /><div><p className="text-sm text-zinc-300">{a}</p><p className="mt-1 text-[11px] text-zinc-600">{i + 2} minutes ago</p></div></div>)}</div></Panel>
        <Panel title="Recent projects"><div className="space-y-2">{['Atlas Analytics','Nova Support','Orbit Commerce'].map(p => <Link key={p} to="/projects" className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300 hover:bg-white/5"><FolderKanban className="h-4 w-4 text-violet-400" />{p}</Link>)}</div></Panel>
        <Panel title="Recent conversations"><div className="space-y-2">{['Product launch plan','Q3 metrics analysis','Website copy ideas'].map(c => <Link key={c} to="/chat" className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300 hover:bg-white/5"><MessageSquare className="h-4 w-4 text-cyan-400" />{c}</Link>)}</div></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent files"><div className="space-y-2">{['Brand system.fig','Quarterly brief.pdf','Agent prompts.md'].map(f => <div key={f} className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300"><Files className="h-4 w-4 text-zinc-500" />{f}</div>)}</div></Panel>
        <Panel title="AI credits"><p className="text-sm text-zinc-300">68,240 / 100,000 credits</p><div className="mt-3 h-2 rounded-full bg-white/5"><div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div><Link to="/billing" className="mt-3 flex items-center gap-1 text-xs text-violet-400">Manage plan <ArrowRight className="h-3 w-3" /></Link></Panel>
        <Panel title="Notifications"><div className="space-y-2">{[['Agent approval needed','bg-amber-400'],['Deploy succeeded','bg-emerald-400'],['New team member','bg-cyan-400']].map(([t, c]) => <div key={t} className="flex items-center gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-zinc-300"><Bell className="h-4 w-4 text-zinc-500" /><span className={`h-2 w-2 rounded-full ${c}`} />{t}</div>)}</div></Panel>
      </div>
    </>
  );
}