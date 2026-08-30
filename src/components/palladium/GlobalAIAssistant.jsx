import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerFn } from '@tanstack/react-start';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, X, Plus, Bot, FolderKanban, ListChecks, Workflow,
  Mic, MicOff, Volume2, VolumeX, Settings2, Power, Bell,
} from 'lucide-react';
import { assistantChat } from '@/lib/ai/assistant.functions';
import {
  DEFAULT_VOICE_ASSISTANT_PREFERENCES,
  getVoiceAssistantPreferences,
  getVoiceWorkspaceBrief,
  saveVoiceAssistantPreferences,
} from '@/lib/voice/voice-assistant.functions';
import { VOICE_NOTIFICATION_EVENT } from '@/hooks/useRealtimeNotifications';

const INTENTS = [
  { test: /project/i, reply: 'Opening Projects…', to: '/projects', icon: FolderKanban },
  { test: /running agent/i, reply: 'Opening Agents. Use the status controls there to view running agents.', to: '/agents', icon: Bot },
  { test: /agent/i, reply: 'Opening Agents…', to: '/agents', icon: Bot },
  { test: /failed workflow/i, reply: 'Opening Workflows. Use the run/status controls there to inspect failures.', to: '/workflows', icon: Workflow },
  { test: /workflow/i, reply: 'Opening Workflows…', to: '/workflows', icon: Workflow },
  { test: /task/i, reply: 'Opening Tasks…', to: '/tasks', icon: ListChecks },
  { test: /create.*project|new project/i, reply: 'Opening Projects so you can create one…', to: '/projects', icon: Plus },
  { test: /create.*agent|new agent/i, reply: 'Opening the Agent Builder…', to: '/agent-builder', icon: Plus },
  { test: /file/i, reply: 'Opening Files…', to: '/files', icon: FolderKanban },
  { test: /setting/i, reply: 'Opening Settings…', to: '/settings', icon: Sparkles },
];

const STATUS_PATTERN = /what('?s| is) (running|happening|going on)|workspace status|status update|my notifications|anything failed|brief me|give me a brief|what are my agents doing/i;
const WAKE_PATTERN = /\b(palladium|jarvis|assistant)\b[,:]?\s*/i;
const SUGGESTIONS = ['Brief me', 'What is running?', 'Open agents', 'Create a project'];

function buildBrief(data) {
  const active = data.activeAgents?.length ?? 0;
  const running = data.runningTasks?.length ?? 0;
  const workflows = data.runningWorkflows ?? 0;
  const queued = data.queuedTasks ?? 0;
  const failed = data.failedTasks?.length ?? 0;
  const unread = data.unreadNotifications?.length ?? 0;
  const agentNames = (data.activeAgents ?? []).slice(0, 3).map((a) => a.name).join(', ');
  const taskNames = (data.runningTasks ?? []).slice(0, 3).map((t) => t.title).join(', ');
  const parts = [
    `You have ${active} active agent${active === 1 ? '' : 's'}, ${running} running task${running === 1 ? '' : 's'}, and ${workflows} active workflow${workflows === 1 ? '' : 's'}.`,
    queued ? `${queued} task${queued === 1 ? ' is' : 's are'} queued.` : '',
    failed ? `${failed} recent task${failed === 1 ? ' has' : 's have'} failed and may need attention.` : 'No recent task failures need attention.',
    unread ? `You also have ${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You are caught up on recent notifications.',
    agentNames ? `Active agents include ${agentNames}.` : '',
    taskNames ? `Running work includes ${taskNames}.` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

export default function GlobalAIAssistant({ open, onOpenChange }) {
  const navigate = useNavigate();
  const prefsFn = useServerFn(getVoiceAssistantPreferences);
  const savePrefsFn = useServerFn(saveVoiceAssistantPreferences);
  const briefFn = useServerFn(getVoiceWorkspaceBrief);
  const setOpen = (v) => onOpenChange?.(v);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your PalladiumAI voice assistant. Ask me anything, say “Palladium” or “Jarvis” before a command, or ask me to brief you on what is running." },
  ]);
  const [pending, setPending] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_VOICE_ASSISTANT_PREFERENCES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [voices, setVoices] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(false);
  const [micError, setMicError] = useState('');
  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionRunningRef = useRef(false);
  const restartTimerRef = useRef(null);
  const shouldListenRef = useRef(false);
  const prefsRef = useRef(prefs);
  const sendRef = useRef(null);

  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  useEffect(() => {
    let alive = true;
    prefsFn({ data: {} })
      .then((value) => { if (alive) setPrefs(value); })
      .catch((e) => console.error('[voice-assistant] preferences', e))
      .finally(() => { if (alive) setPrefsLoaded(true); });
    return () => { alive = false; };
  }, [prefsFn]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);

  const selectedVoice = useMemo(() => voices.find((v) => v.name === prefs.voice_name) ?? voices.find((v) => /^en-GB/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? voices[0] ?? null, [voices, prefs.voice_name]);

  const speak = useCallback((text) => {
    const p = prefsRef.current;
    if (!p.enabled || p.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, '').slice(0, 1600));
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === p.voice_name) ?? selectedVoice;
    if (voice) utterance.voice = voice;
    utterance.rate = p.rate;
    utterance.pitch = p.pitch;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  const persistPrefs = useCallback(async (patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    try { await savePrefsFn({ data: next }); }
    catch (e) { console.error('[voice-assistant] save preferences', e); }
  }, [savePrefsFn]);

  const send = useCallback(async (text, { fromVoice = false } = {}) => {
    const content = String(text ?? input).trim();
    if (!content || pending) return;
    const history = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.action && !m.error))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: content, voice: fromVoice }]);
    setInput('');

    if (STATUS_PATTERN.test(content)) {
      setPending(true);
      try {
        const data = await briefFn({ data: {} });
        const reply = buildBrief(data);
        setMessages((m) => [...m, { role: 'assistant', text: reply }]);
        speak(reply);
      } catch (e) {
        setMessages((m) => [...m, { role: 'assistant', error: true, text: e?.message || 'I could not load the live workspace status.' }]);
      } finally { setPending(false); }
      return;
    }

    const intent = INTENTS.find((i) => i.test.test(content));
    if (intent) {
      setMessages((m) => [...m, { role: 'assistant', text: intent.reply, action: intent.to }]);
      speak(intent.reply);
      navigate(intent.to);
      if (!fromVoice) setOpen(false);
      return;
    }

    setPending(true);
    try {
      const res = await assistantChat({ data: { message: content, history } });
      setMessages((m) => [...m, { role: 'assistant', text: res.text }]);
      speak(res.text);
    } catch (e) {
      console.error('[assistant]', e);
      const reply = e?.message || 'AI service temporarily unavailable.';
      setMessages((m) => [...m, { role: 'assistant', error: true, text: reply }]);
      speak(reply);
    } finally { setPending(false); }
  }, [briefFn, input, messages, navigate, pending, setOpen, speak]);

  useEffect(() => { sendRef.current = send; }, [send]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    const scheduleRestart = () => {
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      if (!shouldListenRef.current || !prefsRef.current.enabled) {
        setListening(false);
        return;
      }
      // Keep the user-facing state stable while Chromium rotates Web Speech
      // recognition sessions under the hood. This prevents the floating icon
      // from flashing between microphone and chat states every few seconds.
      setListening(true);
      restartTimerRef.current = window.setTimeout(() => {
        if (!shouldListenRef.current || !prefsRef.current.enabled || recognitionRunningRef.current) return;
        try { recognition.start(); } catch {}
      }, 500);
    };

    recognition.onstart = () => {
      recognitionRunningRef.current = true;
      setListening(true);
      setMicError('');
    };
    recognition.onerror = (event) => {
      recognitionRunningRef.current = false;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        setListening(false);
        setMicError('Microphone permission is needed once before PalladiumAI can stay always listening.');
        return;
      }
      // Transient errors such as no-speech/network are handled by onend and
      // the restart loop. Do not visually drop out of listening mode.
      if (shouldListenRef.current && prefsRef.current.enabled) setListening(true);
    };
    recognition.onend = () => {
      recognitionRunningRef.current = false;
      scheduleRestart();
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).slice(event.resultIndex).map((r) => r[0]?.transcript ?? '').join(' ').trim();
      if (!transcript) return;
      const p = prefsRef.current;
      if (p.wake_word_enabled && !WAKE_PATTERN.test(transcript)) return;
      const command = transcript.replace(WAKE_PATTERN, '').trim();
      if (command) sendRef.current?.(command, { fromVoice: true });
    };
    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognitionRunningRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    const recognition = recognitionRef.current;
    if (!recognition) {
      if (prefs.enabled) setMicError('Voice recognition is not supported by this browser. You can still type and hear spoken replies.');
      return;
    }
    if (!prefs.enabled) {
      shouldListenRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      setListening(false);
      if (recognitionRunningRef.current) {
        try { recognition.stop(); } catch {}
      }
      return;
    }
    shouldListenRef.current = true;
    setListening(true);
    if (!recognitionRunningRef.current) {
      try { recognition.start(); }
      catch {
        // A browser may require a one-time user gesture before microphone capture.
        // The permission/resume button below can satisfy that browser boundary.
      }
    }
  }, [prefs.enabled, prefsLoaded]);

  const ensureListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError('Voice recognition is not supported by this browser. You can still type and hear spoken replies.');
      return;
    }
    shouldListenRef.current = true;
    setListening(true);
    if (!recognitionRunningRef.current) {
      try { recognition.start(); } catch {}
    }
  };

  useEffect(() => {
    const handleNotification = (event) => {
      if (!prefsRef.current.enabled || !prefsRef.current.announce_notifications) return;
      const title = event.detail?.title || 'You have a new notification.';
      setMessages((m) => [...m, { role: 'assistant', text: `Notification: ${title}`, notification: true }]);
      speak(`Notification. ${title}`);
    };
    window.addEventListener(VOICE_NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(VOICE_NOTIFICATION_EVENT, handleNotification);
  }, [speak]);

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={() => setOpen(true)} aria-label="Open Palladium voice assistant"
        className="fixed bottom-6 right-6 z-[70] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-2xl shadow-violet-500/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
      >
        {prefs.enabled ? <Mic className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-[#090a0f] ${prefs.enabled ? (listening ? 'animate-pulse bg-cyan-300' : 'bg-amber-300') : 'bg-zinc-600'}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm md:hidden" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }} className="fixed bottom-24 right-6 z-[85] flex h-[70vh] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101119] shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 bg-white/[.03] px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400"><Sparkles className="h-4 w-4 text-white" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Palladium Voice Assistant</p>
                  <p className={`flex items-center gap-1.5 text-[11px] ${prefs.enabled ? (listening ? 'text-emerald-400' : 'text-amber-300') : 'text-zinc-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${prefs.enabled ? (listening ? 'bg-emerald-400' : 'bg-amber-300') : 'bg-zinc-600'}`} />{prefs.enabled ? (listening ? 'Always listening · say “Palladium” or “Jarvis”' : 'Waiting for microphone permission') : 'Voice assistant off'}</p>
                </div>
                <button onClick={() => persistPrefs({ enabled: !prefs.enabled })} title={prefs.enabled ? 'Turn assistant off' : 'Turn assistant on'} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><Power className="h-4 w-4" /></button>
                <button onClick={() => persistPrefs({ muted: !prefs.muted })} title={prefs.muted ? 'Unmute voice' : 'Mute voice'} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">{prefs.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
                <button onClick={() => setVoiceSettings((v) => !v)} title="Voice settings" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><Settings2 className="h-4 w-4" /></button>
                <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              {voiceSettings && (
                <div className="border-b border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-300">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Voice</label>
                  <select value={prefs.voice_name ?? selectedVoice?.name ?? ''} onChange={(e) => persistPrefs({ voice_name: e.target.value || null })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#151620] px-2 py-2 text-xs text-white">
                    {voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}
                  </select>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label>Speed <input type="range" min="0.7" max="1.4" step="0.1" value={prefs.rate} onChange={(e) => persistPrefs({ rate: Number(e.target.value) })} className="w-full" /></label>
                    <label>Pitch <input type="range" min="0.7" max="1.3" step="0.1" value={prefs.pitch} onChange={(e) => persistPrefs({ pitch: Number(e.target.value) })} className="w-full" /></label>
                  </div>
                  <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={prefs.wake_word_enabled} onChange={(e) => persistPrefs({ wake_word_enabled: e.target.checked })} /> Require “Palladium” / “Jarvis” wake word</label>
                  <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={prefs.announce_notifications} onChange={(e) => persistPrefs({ announce_notifications: e.target.checked })} /> Speak new notifications</label>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">PalladiumAI keeps the voice listener active while the assistant is enabled. Chromium may internally rotate speech-recognition sessions, but the assistant now maintains one stable listener state instead of flashing between voice and chat modes.</p>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {micError && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200">{micError}</div>}
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-violet-500/20 text-white' : m.error ? 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/20' : 'bg-white/[.04] text-zinc-200'}`}>
                        {m.notification && <Bell className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />}{m.text}
                        {m.action && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-violet-300"><Sparkles className="h-3 w-3" /> Navigating…</p>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pending && <div className="flex justify-start"><div className="flex gap-1 rounded-2xl bg-white/[.04] px-4 py-3">{[0, 1, 2].map((d) => <motion.span key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }} className="h-1.5 w-1.5 rounded-full bg-zinc-500" />)}</div></div>}
                <div ref={endRef} />
              </div>

              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 transition hover:border-white/20 hover:text-white">{s}</button>)}
              </div>

              <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
                <button onClick={ensureListening} disabled={!prefs.enabled || listening} aria-label={listening ? 'Always listening' : 'Enable microphone listening'} title={listening ? 'Always listening' : 'Grant microphone permission / resume listening'} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${listening ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[.03] text-zinc-300'} disabled:opacity-70`}>{listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask anything or request a live workspace brief…" aria-label="Ask the AI assistant" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none" />
                <button onClick={() => send()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition hover:opacity-90"><Send className="h-4 w-4" /></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
