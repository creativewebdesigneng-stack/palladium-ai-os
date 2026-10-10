import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Send } from 'lucide-react';

export default function ChatPromptBox({ onSend, pending }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const MAX = 4000;
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  const toggleDictation = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) { setVoiceError('Voice dictation is not supported by this browser. You can still type, or use Voice Studio for provider transcription.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
      if (transcript) setText((current) => [current.trim(), transcript].filter(Boolean).join(' ').slice(0, MAX));
    };
    recognition.onerror = (event) => { setVoiceError(`Dictation failed: ${event.error || 'unknown error'}.`); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceError('');
    try { recognition.start(); setListening(true); } catch { setVoiceError('Unable to start microphone dictation.'); setListening(false); }
  };

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
            placeholder="Message Blackstar…"
            rows={1}
            disabled={pending}
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60"
          />
          <button type="button" onClick={toggleDictation} disabled={pending} aria-label={listening ? 'Stop dictation' : 'Start voice dictation'} aria-pressed={listening} className={`rounded-xl border p-2 transition disabled:opacity-40 ${listening ? 'border-violet-400 text-violet-200' : 'border-white/15 text-zinc-400 hover:text-white'}`} title={listening ? 'Stop listening' : 'Dictate a message'}>{listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
          <button
            onClick={submit}
            disabled={!text.trim() || pending}
            className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2 text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
            title={pending ? 'Waiting for the live AI provider' : 'Send'}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {voiceError && <p role="alert" className="mt-2 text-xs text-amber-300">{voiceError}</p>}
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-zinc-600">
          <span>Shift + Enter for newline · responses come from the configured live provider</span>
          <span className={text.length > MAX * 0.9 ? 'text-amber-400' : ''}>{text.length} / {MAX}</span>
        </div>
      </div>
    </div>
  );
}
