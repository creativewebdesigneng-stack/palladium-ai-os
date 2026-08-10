import { MODES } from './chatData';

export default function ChatModes({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-black/10 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODES.map(m => {
        const Icon = m.icon;
        const active = m.id === mode;
        return (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${active ? 'bg-gradient-to-r from-violet-600/80 to-indigo-600/80 text-white shadow' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
            <Icon className="h-3.5 w-3.5" />{m.label}
          </button>
        );
      })}
    </div>
  );
}