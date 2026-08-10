import { Bot, FolderKanban, Users, Plug } from 'lucide-react';
import { USAGE_BREAKDOWN } from './billingData';
import { MiniBar, Panel } from './shared';

const SECTIONS = [
  { key: 'byAgent', title: 'Usage By Agent', icon: Bot, grad: 'from-violet-500 to-indigo-500' },
  { key: 'byProject', title: 'Usage By Project', icon: FolderKanban, grad: 'from-sky-500 to-cyan-500' },
  { key: 'byTeam', title: 'Usage By Team', icon: Users, grad: 'from-emerald-500 to-teal-500' },
  { key: 'byIntegration', title: 'Usage By Integration', icon: Plug, grad: 'from-amber-500 to-orange-500' },
];

export default function UsageBreakdown() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SECTIONS.map((s) => (
        <Panel key={s.key} icon={s.icon} title={s.title} grad={s.grad}>
          <MiniBar items={USAGE_BREAKDOWN[s.key]} />
        </Panel>
      ))}
    </div>
  );
}