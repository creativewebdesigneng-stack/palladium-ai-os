import { CONVERSATION } from './aiBuilderData';
import { Sparkles } from 'lucide-react';

export default function AIConversation({ extra }) {
  const msgs = [...CONVERSATION, ...(extra ? [extra] : [])];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">AI Conversation</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${m.role === 'user' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'border border-white/10 bg-black/30 text-zinc-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}