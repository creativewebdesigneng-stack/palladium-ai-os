import { Users, Activity, AtSign, MessageSquare, UserPlus, ThumbsUp, Bot, ChevronRight } from 'lucide-react';
import { COLLABORATION } from './teamData';
import { SectionHead, Avatar, Panel } from './shared';

const PANELS = [
  { icon: Activity, title: 'Recent Activity', grad: 'from-sky-500 to-blue-500', items: COLLABORATION.activity, field: 'action' },
  { icon: AtSign, title: 'Mentions', grad: 'from-cyan-500 to-sky-500', items: COLLABORATION.mentions, field: 'text' },
  { icon: MessageSquare, title: 'Comments', grad: 'from-fuchsia-500 to-pink-500', items: COLLABORATION.comments, field: 'text' },
  { icon: UserPlus, title: 'Assignments', grad: 'from-emerald-500 to-teal-500', items: COLLABORATION.assignments, field: 'text' },
  { icon: ThumbsUp, title: 'Approvals', grad: 'from-amber-500 to-orange-500', items: COLLABORATION.approvals, field: 'text' },
];

export default function CollaborationPanel() {
  return (
    <div>
      <SectionHead icon={Users} title="Collaboration" grad="from-emerald-500 to-teal-500" />
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Online members */}
        <Panel icon={Users} title="Online Members" grad="from-emerald-500 to-teal-500">
          <div className="space-y-2">
            {COLLABORATION.online.map(o => (
              <div key={o.name} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <div className="relative">
                  <Avatar initials={o.initials} grad={o.grad} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0c12]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{o.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">{o.dept}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Activity feed */}
        <div className="space-y-4 lg:col-span-2">
          {PANELS.map(p => (
            <Panel key={p.title} icon={p.icon} title={p.title} grad={p.grad}>
              <div className="space-y-2">
                {p.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2.5">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${it.grad}`}><it.icon className="h-3 w-3 text-white" /></span>
                    <p className="text-[11px] leading-snug text-zinc-300">
                      <span className="font-medium text-white">{it.who}</span> {it[p.field]}{it.target && <span className="text-violet-300"> {it.target}</span>}
                    </p>
                    <span className="ml-auto shrink-0 text-[9px] text-zinc-600">{it.time}m</span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}