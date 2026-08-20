import { ScrollText, PenLine, Languages, Microscope, Loader2 } from 'lucide-react';
import { TRANSFORMS } from './documentsConfig';

const ICONS = { ScrollText, PenLine, Languages, Microscope };

export default function AIDocumentsPanel({ onRun, running, disabled }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">AI Document Actions</h3>
        <p className="text-[11px] text-zinc-500">Run a real AI transform against the selected saved document.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {TRANSFORMS.map((t) => {
          const I = ICONS[t.icon] || ScrollText;
          const busy = running === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onRun(t.id)}
              disabled={disabled || Boolean(running)}
              className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-violet-400/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${t.tone}`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <I className="h-4 w-4 text-white" />}
              </span>
              <p className="text-[12px] font-medium text-white">{t.label}</p>
              <p className="text-[10px] text-zinc-500">{t.desc}</p>
            </button>
          );
        })}
      </div>
      {disabled && <p className="mt-3 text-[10px] text-zinc-500">Select a saved document to enable these actions.</p>}
    </div>
  );
}