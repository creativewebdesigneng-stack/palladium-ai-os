import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerFn } from '@tanstack/react-start';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, X, Mic, Volume2, VolumeX, Settings2, Power, Bell,
} from 'lucide-react';
import { assistantChat } from '@/lib/ai/assistant.functions';
import {
  DEFAULT_VOICE_ASSISTANT_PREFERENCES,
  getVoiceAssistantPreferences,
  getVoiceWorkspaceBrief,
  saveVoiceAssistantPreferences,
  transcribeVoiceAssistantAudio,
} from '@/lib/voice/voice-assistant.functions';
import {
  isDuplicateVoiceTranscript,
  normalizeVoiceTranscript,
  resolveVoiceNavigationIntent,
} from '@/lib/voice/voice-navigation';
import { VOICE_NOTIFICATION_EVENT } from '@/hooks/useRealtimeNotifications';
import AssistantLifecycleBridge from './AssistantLifecycleBridge';

const STATUS_PATTERN = /what('?s| is) (running|happening|going on)|workspace status|status update|my notifications|anything failed|brief me|give me a brief|what are my agents doing/i;
const SUGGESTIONS = ['Brief me', 'What is running?', 'Open projects', 'Open agents'];
const CLOUD_CHUNK_MS = 3200;
const BROWSER_FRESH_MS = 4200;
const LOCATION_QUERY_PATTERN = /\b(weather|forecast|temperature|rain|snow|wind|near me|nearby|my city|my town|my area|where i am|where i'm at|around me)\b/i;

function browserLocationFor(content) {
  if (typeof navigator === 'undefined' || !navigator.geolocation || !LOCATION_QUERY_PATTERN.test(content)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

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

function blobToBase64(blob) {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const block = 0x8000;
    for (let i = 0; i < bytes.length; i += block) {
      binary += String.fromCharCode(...bytes.subarray(i, i + block));
    }
    return window.btoa(binary);
  });
}

function recorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const choices = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
  return choices.find((value) => MediaRecorder.isTypeSupported?.(value)) ?? '';
}

function serverMimeType(value) {
  const base = String(value || '').split(';')[0];
  return ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3'].includes(base)
    ? base
    : 'audio/webm';
}

export default function GlobalAIAssistant({ open, onOpenChange }) {
  const navigate = useNavigate();
  const prefsFn = useServerFn(getVoiceAssistantPreferences);
  const savePrefsFn = useServerFn(saveVoiceAssistantPreferences);
  const briefFn = useServerFn(getVoiceWorkspaceBrief);
  const transcribeFn = useServerFn(transcribeVoiceAssistantAudio);
  const setOpen = (v) => onOpenChange?.(v);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your PalladiumAI voice assistant. I'm hands-free: allow microphone access once, then just speak naturally and I'll answer or navigate for you." },
  ]);
  const [pending, setPending] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_VOICE_ASSISTANT_PREFERENCES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [voices, setVoices] = useState([]);
  const [listening, setListening] = useState(false);
  const [listeningMode, setListeningMode] = useState('reconnecting');
  const [voiceSettings, setVoiceSettings] = useState(false);
  const [micError, setMicError] = useState('');
  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionRunningRef = useRef(false);
  const restartTimerRef = useRef(null);
  const shouldListenRef = useRef(false);
  const speechActiveRef = useRef(false);
  const micStreamRef = useRef(null);
  const micRetryTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaRecorderTimerRef = useRef(null);
  const cloudRestartRef = useRef(null);
  const discardRecorderChunkRef = useRef(false);
  const lastBrowserTranscriptAtRef = useRef(0);
  const lastVoiceTranscriptRef = useRef(null);
  const cloudTranscriptionPendingRef = useRef(false);
  const liveLocationRef = useRef(null);
  const prefsRef = useRef(prefs);
  const sendRef = useRef(null);

  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  useEffect(() => {
    let alive = true;
    prefsFn({ data: {} })
      .then((value) => {
        if (!alive) return;
        const next = { ...value, wake_word_enabled: false };
        prefsRef.current = next;
        setPrefs(next);
        if (value.wake_word_enabled) {
          savePrefsFn({ data: next }).catch((e) => console.error('[voice-assistant] disable wake-word preference', e));
        }
      })
      .catch((e) => console.error('[voice-assistant] preferences', e))
      .finally(() => { if (alive) setPrefsLoaded(true); });
    return () => { alive = false; };
  }, [prefsFn, savePrefsFn]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.name === prefs.voice_name) ?? voices.find((v) => /^en-GB/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? voices[0] ?? null,
    [voices, prefs.voice_name],
  );

  const resumeRecognition = useCallback((delay = 120) => {
    if (typeof window === 'undefined') return;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      const recognition = recognitionRef.current;
      if (!recognition || recognitionRunningRef.current || speechActiveRef.current || !shouldListenRef.current || !prefsRef.current.enabled) return;
      try { recognition.start(); } catch {}
    }, delay);
  }, []);

  const speak = useCallback((text) => {
    const p = prefsRef.current;
    if (!p.enabled || p.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    speechActiveRef.current = true;
    discardRecorderChunkRef.current = true;
    if (recognitionRunningRef.current) {
      try { recognitionRef.current?.stop(); } catch {}
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, '').slice(0, 1600));
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === p.voice_name) ?? selectedVoice;
    if (voice) utterance.voice = voice;
    utterance.rate = p.rate;
    utterance.pitch = p.pitch;
    const finish = () => {
      speechActiveRef.current = false;
      discardRecorderChunkRef.current = false;
      if (shouldListenRef.current && prefsRef.current.enabled) {
        resumeRecognition(140);
        cloudRestartRef.current?.(220);
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }, [resumeRecognition, selectedVoice]);

  const persistPrefs = useCallback(async (patch) => {
    const next = { ...prefsRef.current, ...patch, wake_word_enabled: false };
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

    const intent = resolveVoiceNavigationIntent(content);
    if (intent) {
      setMessages((m) => [...m, { role: 'assistant', text: intent.reply, action: intent.to }]);
      navigate(intent.to);
      speak(intent.reply);
      if (!fromVoice) setOpen(false);
      return;
    }

    setPending(true);
    try {
      let location = liveLocationRef.current;
      if (!location && LOCATION_QUERY_PATTERN.test(content)) {
        location = await browserLocationFor(content);
        if (location) liveLocationRef.current = location;
      }
      const res = await assistantChat({ data: {
        message: content,
        history,
        ...(location ? { location } : {}),
      } });
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

  const acceptVoiceTranscript = useCallback((raw, source) => {
    const normalized = normalizeVoiceTranscript(raw);
    if (!normalized) return false;
    const now = Date.now();
    if (isDuplicateVoiceTranscript(normalized, lastVoiceTranscriptRef.current, now)) return false;
    lastVoiceTranscriptRef.current = { text: normalized, at: now };
    if (source === 'browser') {
      lastBrowserTranscriptAtRef.current = now;
      setListeningMode('browser');
    } else {
      setListeningMode('cloud');
    }
    setMicError('');
    sendRef.current?.(String(raw).trim(), { fromVoice: true });
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setListeningMode('cloud');
      return undefined;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    recognition.onstart = () => {
      recognitionRunningRef.current = true;
      setListening(true);
      setListeningMode('browser');
    };
    recognition.onerror = (event) => {
      recognitionRunningRef.current = false;
      if (event.error === 'audio-capture') {
        setListening(false);
        setListeningMode('reconnecting');
        setMicError('Browser speech recognition lost the microphone. Cloud voice fallback will continue while PalladiumAI reconnects.');
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setListeningMode('cloud');
        setMicError('Browser speech recognition is unavailable, so PalladiumAI is using the automatic cloud speech fallback.');
      }
      if (shouldListenRef.current && prefsRef.current.enabled && !speechActiveRef.current) resumeRecognition(650);
    };
    recognition.onend = () => {
      recognitionRunningRef.current = false;
      if (speechActiveRef.current) return;
      if (shouldListenRef.current && prefsRef.current.enabled) resumeRecognition(350);
      else setListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) acceptVoiceTranscript(transcript, 'browser');
    };
    recognitionRef.current = recognition;

    return () => {
      recognitionRunningRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [acceptVoiceTranscript, resumeRecognition]);

  const stopCloudRecorder = useCallback(() => {
    if (mediaRecorderTimerRef.current) window.clearTimeout(mediaRecorderTimerRef.current);
    mediaRecorderTimerRef.current = null;
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder?.state === 'recording') {
      discardRecorderChunkRef.current = true;
      try { recorder.stop(); } catch {}
    }
  }, []);

  const releaseMicStream = useCallback(() => {
    if (micRetryTimerRef.current) window.clearTimeout(micRetryTimerRef.current);
    micRetryTimerRef.current = null;
    stopCloudRecorder();
    const stream = micStreamRef.current;
    micStreamRef.current = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }, [stopCloudRecorder]);

  useEffect(() => {
    if (!prefsLoaded || typeof window === 'undefined') return undefined;
    if (!prefs.enabled) {
      shouldListenRef.current = false;
      releaseMicStream();
      setListening(false);
      setListeningMode('reconnecting');
      if (recognitionRunningRef.current) {
        try { recognitionRef.current?.stop(); } catch {}
      }
      return undefined;
    }

    shouldListenRef.current = true;
    let cancelled = false;

    const transcribeChunk = async (blob, mimeType) => {
      if (cancelled || blob.size < 1400 || speechActiveRef.current || cloudTranscriptionPendingRef.current) return;
      if (Date.now() - lastBrowserTranscriptAtRef.current < BROWSER_FRESH_MS) return;
      cloudTranscriptionPendingRef.current = true;
      try {
        const audioBase64 = await blobToBase64(blob);
        if (cancelled || speechActiveRef.current) return;
        const result = await transcribeFn({ data: {
          audioBase64,
          filename: mimeType.includes('ogg') ? 'assistant.ogg' : 'assistant.webm',
          mimeType: serverMimeType(mimeType),
          language: 'en',
        } });
        if (result?.text) acceptVoiceTranscript(result.text, 'cloud');
      } catch (error) {
        console.error('[voice-assistant] cloud transcription', error);
        const message = error?.message || 'Cloud speech transcription failed.';
        setListeningMode(recognitionRunningRef.current ? 'browser' : 'reconnecting');
        setMicError(message.includes('not configured')
          ? 'Cloud voice fallback is not configured on this deployment. Add the OpenAI API key for speech transcription.'
          : 'Cloud voice fallback could not transcribe this audio. PalladiumAI will keep retrying automatically.');
      } finally {
        cloudTranscriptionPendingRef.current = false;
      }
    };

    const scheduleCloudRecorder = (delay = 0) => {
      if (mediaRecorderTimerRef.current) window.clearTimeout(mediaRecorderTimerRef.current);
      mediaRecorderTimerRef.current = window.setTimeout(() => {
        mediaRecorderTimerRef.current = null;
        if (cancelled || !shouldListenRef.current || !prefsRef.current.enabled || speechActiveRef.current) return;
        const stream = micStreamRef.current;
        if (!stream?.active || typeof MediaRecorder === 'undefined' || mediaRecorderRef.current?.state === 'recording') return;
        const mimeType = recorderMimeType();
        try {
          const chunks = [];
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          discardRecorderChunkRef.current = false;
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
          recorder.onerror = () => {
            setMicError('The automatic cloud voice recorder hit a browser error. PalladiumAI will retry.');
          };
          recorder.onstop = () => {
            if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
            const discard = discardRecorderChunkRef.current || speechActiveRef.current || cancelled;
            discardRecorderChunkRef.current = false;
            if (!discard && chunks.length) {
              const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
              void transcribeChunk(blob, recorder.mimeType || mimeType || 'audio/webm');
            }
            if (!cancelled && shouldListenRef.current && prefsRef.current.enabled && !speechActiveRef.current) scheduleCloudRecorder(180);
          };
          recorder.start();
          mediaRecorderTimerRef.current = window.setTimeout(() => {
            mediaRecorderTimerRef.current = null;
            if (recorder.state === 'recording') {
              try { recorder.stop(); } catch {}
            }
          }, CLOUD_CHUNK_MS);
          if (!recognitionRunningRef.current) {
            setListening(true);
            setListeningMode('cloud');
          }
        } catch (error) {
          console.error('[voice-assistant] MediaRecorder', error);
          setMicError('This browser could not start the automatic cloud voice recorder. Retrying.');
          scheduleCloudRecorder(1500);
        }
      }, delay);
    };
    cloudRestartRef.current = scheduleCloudRecorder;

    const begin = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setListening(false);
        setListeningMode('reconnecting');
        setMicError('This browser does not expose microphone capture to PalladiumAI.');
        return;
      }
      if (!micStreamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          if (cancelled || !shouldListenRef.current || !prefsRef.current.enabled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          const track = stream.getAudioTracks()[0];
          if (!track) throw new Error('No audio input track was returned by the browser.');
          track.onended = () => {
            micStreamRef.current = null;
            recognitionRunningRef.current = false;
            stopCloudRecorder();
            setListening(false);
            setListeningMode('reconnecting');
            if (!shouldListenRef.current || !prefsRef.current.enabled) return;
            setMicError('The microphone input ended. PalladiumAI is reconnecting automatically.');
            if (micRetryTimerRef.current) window.clearTimeout(micRetryTimerRef.current);
            micRetryTimerRef.current = window.setTimeout(() => {
              micRetryTimerRef.current = null;
              void begin();
            }, 1200);
          };
          micStreamRef.current = stream;
          setListening(true);
          setMicError('');
        } catch (error) {
          if (cancelled) return;
          const name = error?.name;
          setListening(false);
          setListeningMode('reconnecting');
          if (name === 'NotAllowedError' || name === 'SecurityError') {
            shouldListenRef.current = false;
            setMicError('Microphone access is blocked. Allow microphone access for PalladiumAI in browser site permissions, then refresh.');
            return;
          }
          setMicError('The microphone is temporarily unavailable. PalladiumAI is retrying automatically.');
          if (micRetryTimerRef.current) window.clearTimeout(micRetryTimerRef.current);
          micRetryTimerRef.current = window.setTimeout(() => {
            micRetryTimerRef.current = null;
            if (!cancelled && shouldListenRef.current && prefsRef.current.enabled && !micStreamRef.current) void begin();
          }, 2500);
          return;
        }
      }

      const recognition = recognitionRef.current;
      if (recognition && !recognitionRunningRef.current && !speechActiveRef.current) {
        try { recognition.start(); } catch { resumeRecognition(250); }
      } else if (!recognition) {
        setListeningMode('cloud');
      }
      scheduleCloudRecorder(250);
    };

    void begin();
    return () => {
      cancelled = true;
      cloudRestartRef.current = null;
      if (mediaRecorderTimerRef.current) window.clearTimeout(mediaRecorderTimerRef.current);
      mediaRecorderTimerRef.current = null;
    };
  }, [acceptVoiceTranscript, prefs.enabled, prefsLoaded, releaseMicStream, resumeRecognition, stopCloudRecorder, transcribeFn]);

  useEffect(() => () => {
    shouldListenRef.current = false;
    releaseMicStream();
  }, [releaseMicStream]);

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

  const voiceStatus = !prefs.enabled
    ? 'Voice assistant off'
    : !listening
      ? 'Reconnecting microphone…'
      : listeningMode === 'cloud'
        ? 'Always listening · cloud speech fallback'
        : listeningMode === 'browser'
          ? 'Always listening · browser + cloud fallback'
          : 'Always listening · just speak';

  return (
    <>
      <AssistantLifecycleBridge
        enabled={prefs.enabled}
        listening={listening}
        pending={pending}
        listeningMode={listeningMode}
        micError={micError}
      />
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
                  <p className={`flex items-center gap-1.5 text-[11px] ${prefs.enabled ? (listening ? 'text-emerald-400' : 'text-amber-300') : 'text-zinc-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${prefs.enabled ? (listening ? 'bg-emerald-400' : 'bg-amber-300') : 'bg-zinc-600'}`} />
                    {voiceStatus}
                  </p>
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
                  <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={prefs.announce_notifications} onChange={(e) => persistPrefs({ announce_notifications: e.target.checked })} /> Speak new notifications</label>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Hands-free mode uses browser speech recognition first and an automatic server-side transcription fallback if the browser misses you. Location-aware live questions such as weather can use browser location with permission. Audio, transcripts and location are not persisted by the assistant.</p>
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
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Just speak, or type here…" aria-label="Ask the AI assistant" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none" />
                <button onClick={() => send()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition hover:opacity-90"><Send className="h-4 w-4" /></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
