import { useState, useRef } from 'react';
import { Paperclip, Mic, Image as ImageIcon, Send, Square, X, Slash, Sparkles, Library } from 'lucide-react';
import { SLASH_COMMANDS } from './chatData';

export default function ChatPromptBox({ onSend, streaming, onStop, onOpenPrompts, onOpenTools }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const MAX = 8000;

  const autoGrow = () => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  const addFiles = files => setAttachments(a => [...a, ...Array.from(files).map(f => f.name)]);
  const submit = () => { if (!text.trim() || streaming) return; onSend(text); setText(''); setTimeout(autoGrow, 0); };

  const showSlash = text.startsWith('/') && !text.includes(' ');
  const slashMatches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(text));

  return (
    <div className="border-t border-white/10 bg-white/[.02] px-3 py-3 sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        {showSlash && slashMatches.length > 0 && (
          <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0c0d13] shadow-2xl">
            <p className="border-b border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-500">Slash commands</p>
            {slashMatches.map(c => (
              <button key={c.cmd} onClick={() => { setText(c.cmd + ' '); taRef.current?.focus(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
                <Slash className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm text-white">{c.cmd}</span>
                <span className="ml-2 truncate text-xs text-zinc-500">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
                <Paperclip className="h-3 w-3" />{f}
                <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}><X className="h-3 w-3 text-zinc-500" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-[#15161f] p-2 shadow-2xl transition focus-within:border-violet-500/50">
          <label className="cursor-pointer rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Attach files">
            <Paperclip className="h-5 w-5" /><input ref={fileRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </label>
          <label className="cursor-pointer rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Upload image">
            <ImageIcon className="h-5 w-5" /><input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => addFiles(e.target.files)} />
          </label>
          <button onClick={onOpenTools} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Tools"><Sparkles className="h-5 w-5" /></button>
          <button onClick={onOpenPrompts} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Prompt library"><Library className="h-5 w-5" /></button>

          <textarea
            ref={taRef}
            value={text}
            onChange={e => { setText(e.target.value.slice(0, MAX)); autoGrow(); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Message PalladiumAI…  type / for commands"
            rows={1}
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />

          <button onClick={() => setRecording(r => !r)} className={`rounded-xl p-2 hover:bg-white/5 ${recording ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Voice input"><Mic className="h-5 w-5" /></button>
          {streaming ? (
            <button onClick={onStop} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" title="Stop"><Square className="h-5 w-5" /></button>
          ) : (
            <button onClick={submit} disabled={!text.trim()} className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2 text-white shadow-lg transition hover:opacity-90 disabled:opacity-40" title="Send"><Send className="h-5 w-5" /></button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-zinc-600">
          <span>Shift + Enter for newline · PalladiumAI can make mistakes</span>
          <span className={text.length > MAX * 0.9 ? 'text-amber-400' : ''}>{text.length} / {MAX}</span>
        </div>
      </div>
    </div>
  );
}