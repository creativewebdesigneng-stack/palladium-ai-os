import { Settings, Cpu, Brain, Mail, HardDrive, ShieldCheck, CreditCard, Plug, Bell, Wrench } from 'lucide-react';

const ICONS = { Settings, Cpu, Brain, Mail, HardDrive, ShieldCheck, CreditCard, Plug, Bell, Wrench };

export default function SettingsTabs({ sections, active, setActive }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1.5">
      {sections.map(s => {
        const Icon = ICONS[s.icon] || Settings;
        return (
          <button key={s.key} onClick={() => setActive(s.key)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium ${active === s.key ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-3.5 w-3.5" />{s.label}
          </button>
        );
      })}
    </div>
  );
}