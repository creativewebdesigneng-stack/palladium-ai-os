import { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

export default function ChatPromptBox({ onSend, pending }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const MAX = 4000;

  const autoGrow = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const submit = () => {
    const message = text.trim();
    if (!message || pending) return;
    onSend(message);
    setText('');
    setTimeout(autoGrow, 0);
  };

  return (
    <div className="border-t border-white/10 bg-white/[.02] px-3 py-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-[#15161f] p-2 shadow-2xl transition focus-within:border-violet-500/50">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => { setText(event.target.value.slice(0, MAX)); autoGrow(); }}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
            placeholder="Message PalladiumAI…"
            rows={1}
            disabled={pending}
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || pending}
            className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2 text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
            title={pending ? 'Waiting for the live AI provider' : 'Send'}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-zinc-600">
          <span>Shift + Enter for newline · responses come from the configured live provider</span>
          <span className={text.length > MAX * 0.9 ? 'text-amber-400' : ''}>{text.length} / {MAX}</span>
        </div>
      </div>
    </div>
  );
}
