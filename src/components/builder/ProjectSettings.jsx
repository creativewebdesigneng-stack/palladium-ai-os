import { Settings } from 'lucide-react';
import { PROJECT_SETTINGS } from './builderData';

export default function ProjectSettings() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Project Settings</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROJECT_SETTINGS.map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-1.5 text-zinc-500"><s.icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">{s.label}</span></div>
            <p className="mt-1.5 text-sm font-medium text-white">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}