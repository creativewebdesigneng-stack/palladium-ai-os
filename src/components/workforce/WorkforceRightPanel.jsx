import { Bell, Lightbulb, History, Sparkles, Zap, Bot, Headphones, Scale, Clock, GitMerge, Plug, GraduationCap } from 'lucide-react';
import { NOTIFICATIONS, RECOMMENDATIONS, SUGGESTIONS, QUICK_ACTIONS, LIVE_FEED } from './workforceData';

const recIcon = { support: Headphones, balance: Scale, memory: Bot, schedule: Clock };
const sugIcon = { team: Bot, plug: Plug, train: GraduationCap };

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-300"><Icon className="h-3.5 w-3.5 text-violet-300" />{title}</h3>
      {children}
    </div>
  );
}

export default function WorkforceRightPanel() {
  return (
    <div className="space-y-4">
      <Section icon={Bell} title="Notifications">
        <div className="space-y-2">
          {NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.kind === 'error' ? 'bg-rose-400' : n.kind === 'warn' ? 'bg-amber-400' : n.kind === 'ok' ? 'bg-emerald-400' : 'bg-violet-400'}`} />
              <p className="text-zinc-300">{n.text}</p>
              <span className="ml-auto shrink-0 text-[10px] text-zinc-600">{n.time}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Lightbulb} title="Recommendations">
        <div className="space-y-2">
          {RECOMMENDATIONS.map((r, i) => {
            const Icon = recIcon[r.icon] || Zap;
            return <div key={i} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs"><Icon className="h-3.5 w-3.5 shrink-0 text-violet-300" /><p className="text-zinc-300">{r.text}</p></div>;
          })}
        </div>
      </Section>

      <Section icon={History} title="Recent activity">
        <div className="space-y-2">
          {LIVE_FEED.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs"><span className={`h-1.5 w-1.5 rounded-full ${f.color.replace('text', 'bg')} shrink-0`} /><p className="text-zinc-400"><span className={f.color}>{f.agent}</span> {f.text}</p></div>
          ))}
        </div>
      </Section>

      <Section icon={Sparkles} title="Suggested improvements">
        <div className="space-y-2">
          {SUGGESTIONS.map((s, i) => {
            const Icon = sugIcon[s.icon] || GitMerge;
            return <div key={i} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs"><Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300" /><p className="text-zinc-300">{s.text}</p></div>;
          })}
        </div>
      </Section>

      <Section icon={Zap} title="Quick actions">
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(a => <button key={a} className="rounded-lg border border-white/10 bg-white/[.02] px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">{a}</button>)}
        </div>
      </Section>
    </div>
  );
}