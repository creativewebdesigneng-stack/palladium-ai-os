import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Bot, CheckCircle2, Clock3, Cpu, Loader2,
  Network, Radio, Send, ShieldCheck, Sparkles, User, Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { EXAMPLE_REQUESTS } from '@/lib/mission/catalog';

function taskReply(task) {
  const result = task?.result && typeof task.result === 'object' ? task.result : {};
  if (task?.status === 'completed') return result.summary || 'Done — the task completed successfully.';
  if (task?.status === 'failed') return result.error || 'I could not complete that task. Please try again.';
  if (task?.status === 'awaiting_approval' || task?.status === 'waiting_for_approval') {
    return 'I’ve prepared the next step, but it needs your approval before anything sensitive happens. Open the Approval centre to review it.';
  }
  if (task?.status === 'queued' || task?.status === 'running') return 'I’m working on that now…';
  if (task?.status === 'scheduled') return task?.due_at ? `Scheduled for ${new Date(task.due_at).toLocaleString('en-GB')}.` : 'Scheduled.';
  return 'I’ve received that request and I’m routing it now.';
}

function statusMeta(status) {
  if (status === 'failed') return { label: 'Failed', tone: 'red' };
  if (status === 'awaiting_approval' || status === 'waiting_for_approval') return { label: 'Needs approval', tone: 'yellow' };
  if (status === 'queued' || status === 'running') return { label: 'Working', tone: 'blue' };
  if (status === 'scheduled') return { label: 'Scheduled', tone: 'violet' };
  return { label: 'Completed', tone: 'green' };
}

function toneClasses(tone) {
  if (tone === 'red') return 'border-rose-400/35 bg-rose-500/[.08] text-rose-100 shadow-[0_0_28px_rgba(244,63,94,.08)]';
  if (tone === 'yellow') return 'border-amber-300/35 bg-amber-400/[.07] text-amber-50 shadow-[0_0_28px_rgba(251,191,36,.08)]';
  if (tone === 'green') return 'border-emerald-400/30 bg-emerald-500/[.06] text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,.07)]';
  if (tone === 'violet') return 'border-violet-400/30 bg-violet-500/[.06] text-violet-50';
  return 'border-cyan-400/25 bg-cyan-500/[.05] text-cyan-50';
}

function AssistantText({ children }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children: linkChildren }) => <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">{linkChildren}</a>,
        ul: ({ children: listChildren }) => <ul className="my-2 list-disc space-y-1 pl-5">{listChildren}</ul>,
        ol: ({ children: listChildren }) => <ol className="my-2 list-decimal space-y-1 pl-5">{listChildren}</ol>,
        p: ({ children: paragraphChildren }) => <p className="my-1.5 first:mt-0 last:mb-0">{paragraphChildren}</p>,
        strong: ({ children: strongChildren }) => <strong className="font-semibold text-white">{strongChildren}</strong>,
        code: ({ children: codeChildren }) => <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-cyan-200">{codeChildren}</code>,
      }}
    >{children || ' '}</ReactMarkdown>
  );
}

function CyberneticBrain({ state = 'healthy', active = false }) {
  const accent = state === 'error' ? '#fb4064' : state === 'approval' ? '#ffd24a' : '#39f5a6';
  const nodes = [
    [194, 121], [248, 84], [312, 102], [372, 77], [439, 112], [488, 157], [515, 220], [504, 282],
    [463, 329], [403, 352], [344, 337], [284, 361], [226, 331], [186, 286], [164, 226], [173, 168],
    [243, 158], [299, 141], [355, 151], [414, 156], [457, 202], [452, 258], [410, 292], [355, 279],
    [307, 307], [260, 279], [226, 235], [274, 210], [328, 188], [383, 212], [340, 249], [296, 252],
  ];
  const edges = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,0],
    [0,16],[1,16],[2,17],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,16],
    [16,27],[17,28],[18,28],[18,29],[19,29],[20,29],[20,21],[21,30],[22,30],[23,30],[24,30],[24,31],[25,31],[26,27],[27,28],[28,29],[29,30],[30,31],[31,27],
    [0,27],[2,28],[4,19],[5,20],[7,21],[8,22],[9,23],[10,24],[11,25],[12,26],[14,26],[15,16],
  ];

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[720px] overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[#020915]/70 shadow-[inset_0_0_60px_rgba(0,174,255,.04),0_0_50px_rgba(0,119,255,.08)]">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(35,180,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(35,180,255,.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,145,255,.16),transparent_34%),radial-gradient(circle_at_50%_70%,rgba(0,237,255,.08),transparent_45%)]" />
      <div className="absolute left-4 top-4 z-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">System Neural Map</p>
        <p className="mt-1 text-[10px] text-cyan-100/40">Real-time AI activity</p>
      </div>
      <div className="absolute right-4 top-4 z-10 text-right font-mono">
        <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-300">Processing</p>
        <p className="text-xs text-cyan-100/70">12.8 TFLOPS</p>
      </div>

      <svg viewBox="0 0 680 500" className="absolute inset-0 h-full w-full" aria-label="Animated cybernetic neural brain">
        <defs>
          <filter id="brainGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="brainCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dff8ff" stopOpacity=".95" />
            <stop offset="40%" stopColor="#2dc7ff" stopOpacity=".55" />
            <stop offset="100%" stopColor="#0069ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="brain-rotate" style={{ transformOrigin: '340px 225px' }}>
          <ellipse cx="340" cy="224" rx="184" ry="151" fill="url(#brainCore)" opacity=".16" className="brain-pulse" />
          {edges.map(([a,b], i) => (
            <line key={`e-${i}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={i % 7 === 0 ? accent : '#1db7ff'} strokeWidth={i % 5 === 0 ? 1.8 : 1} opacity={i % 6 === 0 ? .92 : .42} filter="url(#brainGlow)" className={i % 4 === 0 ? 'brain-flow' : ''} />
          ))}
          {nodes.map(([x,y], i) => (
            <g key={`n-${i}`} filter="url(#brainGlow)">
              <circle cx={x} cy={y} r={i % 5 === 0 ? 5.5 : 3.2} fill={i % 6 === 0 ? accent : i % 3 === 0 ? '#dff8ff' : '#31bfff'} opacity=".95" className={i % 4 === 0 ? 'brain-node-pulse' : ''} />
              {i % 5 === 0 && <circle cx={x} cy={y} r="11" fill="none" stroke={accent} strokeWidth=".8" opacity=".35" className="brain-ring" />}
            </g>
          ))}
          <path d="M180 192 C156 116 227 62 314 75 C366 38 453 70 480 126 C545 144 553 232 513 278 C514 342 444 378 386 357 C337 397 273 369 243 335 C177 326 142 266 163 217 Z" fill="none" stroke="#34bfff" strokeWidth="2.2" opacity=".7" filter="url(#brainGlow)" />
          <path d="M181 191 C231 201 232 150 298 142 C339 137 350 174 397 157 C448 139 475 171 486 214 M163 234 C224 214 258 252 293 252 C337 252 351 213 395 212 C437 211 454 249 506 247 M193 291 C248 284 274 313 318 306 C360 300 386 274 432 288 C457 297 475 310 487 326" fill="none" stroke={accent} strokeWidth="1.4" opacity=".65" filter="url(#brainGlow)" className="brain-flow" />
        </g>

        <g opacity=".85">
          <ellipse cx="340" cy="408" rx="124" ry="24" fill="none" stroke="#24b9ff" strokeWidth="2" className="orbit orbit-a" />
          <ellipse cx="340" cy="408" rx="92" ry="16" fill="none" stroke={accent} strokeWidth="1.4" className="orbit orbit-b" />
          <ellipse cx="340" cy="408" rx="56" ry="9" fill="none" stroke="#dff8ff" strokeWidth="1" opacity=".65" />
          <line x1="340" y1="373" x2="340" y2="408" stroke="#60d8ff" strokeWidth="1" opacity=".65" />
          <circle cx="340" cy="408" r="4" fill="#dff8ff" filter="url(#brainGlow)" />
        </g>

        <g className="font-mono text-[8px]" fill="#42d9ff" opacity=".8">
          <text x="118" y="125">128.765</text><text x="87" y="196">93.522</text><text x="112" y="294">84.328</text>
          <text x="507" y="135">12.219</text><text x="530" y="228">45.893</text><text x="516" y="326">203.593</text>
        </g>
      </svg>

      <div className="absolute bottom-4 left-1/2 grid w-[88%] -translate-x-1/2 grid-cols-4 gap-2 rounded-xl border border-cyan-400/15 bg-[#020914]/80 px-4 py-3 font-mono backdrop-blur">
        {[['THOUGHTS / SEC','2.4M'],['CONNECTIONS','18.7B'],['DATA STREAMS','342'],['LEARNING RATE','98.7%']].map(([label,value]) => (
          <div key={label} className="min-w-0">
            <p className="truncate text-[7px] text-cyan-300/65 sm:text-[8px]">{label}</p>
            <p className="mt-0.5 text-sm text-cyan-100 sm:text-lg">{value}</p>
            <div className="mt-1 h-px bg-gradient-to-r from-cyan-400/70 via-blue-500/30 to-transparent" />
          </div>
        ))}
      </div>

      <div className={`absolute inset-0 pointer-events-none ${active ? 'opacity-100' : 'opacity-60'}`} style={{ boxShadow: `inset 0 0 80px ${accent}18` }} />
    </div>
  );
}

export default function BriefingConsole({ briefing, loading, agents = [], submitting, onSubmit }) {
  const [request, setRequest] = useState('');
  const [agentId, setAgentId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [optimistic, setOptimistic] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef(null);

  const loadTasks = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setTasks([]);
      setHistoryLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('personal_tasks')
      .select('id,request,status,result,due_at,created_at,updated_at,category,requires_approval')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24);
    if (!error) setTasks((data ?? []).reverse());
    setHistoryLoading(false);
  };

  useEffect(() => {
    let alive = true;
    loadTasks();
    const channel = supabase
      .channel('mission-conversation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_tasks' }, () => {
        if (alive) loadTasks();
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!optimistic) return;
    const matched = tasks.some((task) => task.request === optimistic.request && new Date(task.created_at).getTime() >= optimistic.startedAt - 5000);
    if (matched) setOptimistic(null);
  }, [tasks, optimistic]);

  const messages = useMemo(() => {
    const list = [];
    for (const task of tasks) {
      list.push({ id: `${task.id}-user`, role: 'user', text: task.request, task });
      list.push({ id: `${task.id}-assistant`, role: 'assistant', text: taskReply(task), task });
    }
    if (optimistic) {
      list.push({ id: `${optimistic.id}-user`, role: 'user', text: optimistic.request, optimistic: true });
      list.push({ id: `${optimistic.id}-assistant`, role: 'assistant', text: 'I’m working on that now…', optimistic: true });
    }
    return list;
  }, [tasks, optimistic]);

  const systemState = useMemo(() => {
    const recent = tasks.slice(-8);
    if (recent.some((task) => task.status === 'failed')) return 'error';
    if (recent.some((task) => task.status === 'awaiting_approval' || task.status === 'waiting_for_approval')) return 'approval';
    return 'healthy';
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const activeCount = tasks.filter((task) => task.status === 'running' || task.status === 'queued').length;
  const approvalCount = tasks.filter((task) => task.status === 'awaiting_approval' || task.status === 'waiting_for_approval').length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;
  const latestTasks = [...tasks].slice(-5).reverse();

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, submitting]);

  const send = (e) => {
    e?.preventDefault?.();
    const text = request.trim();
    if (!text || submitting) return;
    setOptimistic({ id: `local-${Date.now()}`, request: text, startedAt: Date.now() });
    onSubmit?.({ request: text, agentId: agentId || null });
    setRequest('');
  };

  const showWelcome = !historyLoading && messages.length === 0;
  const healthLabel = systemState === 'error' ? 'ATTENTION' : systemState === 'approval' ? 'APPROVAL' : 'OPTIMAL';
  const healthTone = systemState === 'error' ? 'text-rose-300' : systemState === 'approval' ? 'text-amber-300' : 'text-emerald-300';

  return (
    <section className="mission-hud relative mt-4 overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#020711]/95 shadow-[0_0_60px_rgba(0,137,255,.07)]">
      <style>{`
        @keyframes brainRotate { 0%{transform:perspective(900px) rotateY(-5deg) rotateX(1deg)} 50%{transform:perspective(900px) rotateY(6deg) rotateX(-1deg)} 100%{transform:perspective(900px) rotateY(-5deg) rotateX(1deg)} }
        @keyframes brainPulse { 0%,100%{opacity:.10;transform:scale(.96)} 50%{opacity:.24;transform:scale(1.035)} }
        @keyframes nodePulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes ringPulse { 0%{r:7px;opacity:.65} 100%{r:18px;opacity:0} }
        @keyframes flowDash { to{stroke-dashoffset:-32} }
        @keyframes orbitSpin { to{transform:rotate(360deg)} }
        .brain-rotate{animation:brainRotate 9s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
        .brain-pulse{animation:brainPulse 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
        .brain-node-pulse{animation:nodePulse 1.7s ease-in-out infinite}
        .brain-ring{animation:ringPulse 2.3s ease-out infinite}
        .brain-flow{stroke-dasharray:7 9;animation:flowDash 3s linear infinite}
        .orbit{transform-box:fill-box;transform-origin:center;stroke-dasharray:9 12}
        .orbit-a{animation:orbitSpin 15s linear infinite}
        .orbit-b{animation:orbitSpin 10s linear infinite reverse}
        .hud-scan{background:linear-gradient(180deg,transparent,rgba(41,190,255,.035),transparent);animation:hudScan 6s linear infinite}
        @keyframes hudScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(14,127,205,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(14,127,205,.04) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      <div className="hud-scan pointer-events-none absolute inset-x-0 top-0 h-1/2" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(0,153,255,.12),transparent_45%)]" />

      <div className="relative border-b border-cyan-400/15 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-400/[.08] text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,.15)]"><Cpu className="h-5 w-5" /></span>
            <div>
              <p className="font-mono text-lg font-semibold tracking-[0.08em] text-cyan-100">MISSION CONTROL</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400/60">AI Operating System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-400/15 bg-black/25 px-3 py-2 font-mono">
              <p className="text-[7px] uppercase tracking-[0.2em] text-cyan-400/55">System status</p>
              <p className={`mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold ${healthTone}`}><Activity className="h-3 w-3" />{healthLabel}</p>
            </div>
            <div className="hidden rounded-xl border border-cyan-400/15 bg-black/25 px-3 py-2 sm:block">
              <p className="text-[10px] font-semibold text-white">Palladium AI</p>
              <p className="text-[8px] text-cyan-100/40">Master Control</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid gap-3 p-3 lg:grid-cols-[220px_minmax(0,1fr)_340px] xl:grid-cols-[240px_minmax(0,1fr)_390px]">
        <aside className="order-2 space-y-3 lg:order-1">
          <div className="rounded-2xl border border-cyan-400/15 bg-[#03101b]/80 p-4 shadow-[inset_0_0_30px_rgba(0,128,255,.025)]">
            <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">System Overview</p><Radio className="h-3.5 w-3.5 text-cyan-500" /></div>
            <div className="rounded-xl border border-cyan-400/10 bg-black/20 p-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-100/45">Daily score</p>
              <div className="mt-1 flex items-end justify-between"><span className={`font-mono text-4xl font-semibold ${healthTone}`}>{Math.max(72, Math.min(99, 92 + completedCount - failedCount * 4))}</span><span className="mb-1 text-[9px] text-emerald-300">↑ live</span></div>
            </div>
            <div className="mt-3 space-y-2 font-mono text-[9px]">
              <div className="flex justify-between text-cyan-100/55"><span>AGENTS</span><span className="text-white">{agents.length}</span></div>
              <div className="flex justify-between text-cyan-100/55"><span>TASKS</span><span className="text-white">{tasks.length}</span></div>
              <div className="flex justify-between text-cyan-100/55"><span>ACTIVE</span><span className="text-cyan-300">{activeCount}</span></div>
              <div className="flex justify-between text-cyan-100/55"><span>UPTIME</span><span className="text-emerald-300">99.9%</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-[#03101b]/80 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">Active Agents</p>
            <div className="mt-3 space-y-2">
              {(agents.length ? agents.slice(0,5) : [{name:'Research Analyst'},{name:'Data Synthesizer'},{name:'Web Scout'},{name:'Ops Coordinator'}]).map((agent, index) => (
                <div key={agent.id || `${agent.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-cyan-400/10 bg-black/15 px-2.5 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-400/25 text-cyan-300"><Bot className="h-3 w-3" /></span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-cyan-50/80">{agent.name}</span>
                  <span className="font-mono text-[7px] text-emerald-300">ONLINE</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-[#03101b]/80 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">Mission Timeline</p>
            <div className="mt-3 space-y-3">
              {latestTasks.length ? latestTasks.map((task) => {
                const meta = statusMeta(task.status);
                const color = meta.tone === 'red' ? 'bg-rose-400' : meta.tone === 'yellow' ? 'bg-amber-300' : meta.tone === 'green' ? 'bg-emerald-400' : 'bg-cyan-400';
                return <div key={task.id} className="flex gap-2.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color} shadow-[0_0_8px_currentColor]`} /><div className="min-w-0"><p className="truncate text-[9px] text-cyan-50/80">{task.request}</p><p className="mt-0.5 font-mono text-[7px] text-cyan-100/35">{meta.label}</p></div></div>;
              }) : <p className="text-[9px] text-cyan-100/30">No missions yet.</p>}
            </div>
          </div>
        </aside>

        <main className="order-1 min-w-0 space-y-3 lg:order-2">
          <CyberneticBrain state={systemState} active={submitting || activeCount > 0} />

          <form onSubmit={send} className="rounded-2xl border border-cyan-400/25 bg-[#03101b]/90 p-2.5 shadow-[0_0_30px_rgba(0,145,255,.08)]">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                <input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="What should we accomplish?"
                  aria-label="Mission Control request"
                  className="w-full rounded-xl border border-cyan-400/15 bg-[#020915] py-3.5 pl-10 pr-4 font-mono text-xs text-cyan-50 placeholder:text-cyan-100/25 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Route to agent" className="rounded-xl border border-cyan-400/15 bg-[#020915] px-3 py-3 font-mono text-[9px] text-cyan-100/70 focus:border-cyan-300/50 focus:outline-none sm:max-w-[170px]">
                <option value="">Palladium Prime</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button type="submit" disabled={submitting || !request.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/[.10] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,.14)] transition hover:bg-cyan-400/[.16] disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}Execute
              </button>
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {EXAMPLE_REQUESTS.slice(0,4).map((ex) => <button key={ex} type="button" onClick={() => setRequest(ex)} className="shrink-0 rounded-full border border-cyan-400/10 bg-cyan-400/[.03] px-2.5 py-1 font-mono text-[7px] text-cyan-100/35 hover:border-cyan-300/30 hover:text-cyan-100/70">{ex}</button>)}
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [CheckCircle2,'COMPLETED',completedCount,'text-emerald-300'],
              [Activity,'ACTIVE',activeCount,'text-cyan-300'],
              [ShieldCheck,'APPROVALS',approvalCount,'text-amber-300'],
              [AlertTriangle,'ERRORS',failedCount,'text-rose-300'],
            ].map(([Icon,label,value,color]) => <div key={label} className="rounded-xl border border-cyan-400/10 bg-[#03101b]/70 px-3 py-2"><p className="flex items-center gap-1.5 font-mono text-[7px] text-cyan-100/35"><Icon className={`h-3 w-3 ${color}`} />{label}</p><p className={`mt-1 font-mono text-lg ${color}`}>{value}</p></div>)}
          </div>
        </main>

        <aside className="order-3 min-w-0 rounded-2xl border border-cyan-400/15 bg-[#03101b]/85 shadow-[inset_0_0_34px_rgba(0,128,255,.025)]">
          <div className="flex items-center justify-between border-b border-cyan-400/10 px-4 py-3">
            <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">Mission Conversation</p><p className="mt-0.5 text-[8px] text-cyan-100/30">Live task thread</p></div>
            <Network className="h-4 w-4 text-cyan-400" />
          </div>

          <div ref={scrollRef} className="h-[620px] max-h-[72vh] overflow-y-auto px-3 py-4">
            <div className="space-y-3">
              {(loading || historyLoading) && messages.length === 0 && <div className="flex items-center gap-2 text-[10px] text-cyan-100/35"><Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />Synchronising conversation…</div>}
              {showWelcome && (
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[.04] p-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-300">Palladium AI</p>
                  <p className="mt-2 text-xs leading-5 text-cyan-50/70">{briefing || 'What can I help you get done today?'}</p>
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === 'user';
                const meta = !isUser && message.task ? statusMeta(message.task.status) : null;
                return (
                  <div key={message.id} className={`rounded-xl border p-3 ${isUser ? 'ml-8 border-blue-400/35 bg-blue-500/[.08]' : `mr-3 ${toneClasses(meta?.tone || 'blue')}`}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className={`flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] ${isUser ? 'text-blue-300' : 'text-cyan-200'}`}>{isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}{isUser ? 'You' : 'Palladium AI'}</p>
                      {!isUser && (message.optimistic || meta) && <span className={`font-mono text-[7px] ${meta?.tone === 'red' ? 'text-rose-300' : meta?.tone === 'yellow' ? 'text-amber-300' : meta?.tone === 'green' ? 'text-emerald-300' : 'text-cyan-300'}`}>{message.optimistic ? 'PROCESSING' : meta.label.toUpperCase()}</span>}
                    </div>
                    <div className="text-[11px] leading-5 text-white/75">{isUser ? <div className="whitespace-pre-wrap">{message.text}</div> : <AssistantText>{message.text}</AssistantText>}</div>
                    {!isUser && message.optimistic && <div className="mt-2 flex items-center gap-1.5 font-mono text-[7px] text-cyan-300"><Loader2 className="h-3 w-3 animate-spin" />Searching neural pathways…</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-cyan-400/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[8px] text-cyan-100/35"><ShieldCheck className="h-3 w-3 text-emerald-400" />Sensitive actions still require approval.</p>
          </div>
        </aside>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-cyan-400/10 bg-black/20 px-4 py-2.5 font-mono text-[8px] text-cyan-100/35">
        <div className="flex items-center gap-4"><span>SYSTEM LOAD <b className="ml-1 text-cyan-300">68%</b></span><span>MEMORY <b className="ml-1 text-emerald-300">7.2 / 16 GB</b></span><span className="hidden sm:inline">NETWORK <b className="ml-1 text-cyan-300">1.2 GB/s</b></span></div>
        <span className="flex items-center gap-1.5 text-emerald-300"><ShieldCheck className="h-3 w-3" />SECURITY SECURE</span>
        <span className="hidden md:inline">LATENCY <b className="ml-1 text-emerald-300">12ms</b></span>
      </div>
    </section>
  );
}
