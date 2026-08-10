import { useState } from 'react';
import { Image, Paperclip, Mic, Send, Sparkles } from 'lucide-react';
import { BUILD_ACTIONS } from './aiBuilderData';

export default function BuilderInput({ onAction, busy }) {
  const [val, setVal] = useState('');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <div className="relative">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="What would you like to build?"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
        />
        <div className="absolute bottom-2 left-2 flex gap-1">
          <Chip icon={Image} />
          <Chip icon={Paperclip} />
          <Chip icon={Mic} />
        </div>
        <button onClick={() => onAction('generate', val)} disabled={busy} className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {BUILD_ACTIONS.map((a) => { const I = a.icon; return (
          <button key={a.id} onClick={() => onAction(a.id, val)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${a.primary ? `bg-gradient-to-r ${a.grad} text-white` : `border border-white/10 text-zinc-300 hover:bg-white/5`}`}>
            <I className="h-3.5 w-3.5" />{a.label}
          </button>
        ); })}
      </div>
    </div>
  );
}

function Chip({ icon: Icon }) {
  return <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"><Icon className="h-3.5 w-3.5" /></button>;
}