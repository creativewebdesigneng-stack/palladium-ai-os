import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckCircle2, TrendingUp, Wrench, Plug, Brain, BookOpen, ShieldCheck, Activity, FolderKanban, Bot } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { MiniAvatar } from './wfShared';
import { STATUS_STYLE, PROFILE_TABS, TASK_STATUS_STYLE, PRIORITY_STYLE, TOOL_ICON } from './wfData';

export default function AgentProfileDrawer({ agent, onClose }) {
  const [tab, setTab] = useState('overview');
  if (!agent) return null;
  const st = STATUS_STYLE[agent.status];

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0b0c12]"
      >
        {/* header */}
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <MiniAvatar letter={agent.letter} grad={agent.grad} size="h-12 w-12" text="text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">{agent.name}</h2>
              <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{agent.status}</span>
            </div>
            <p className="text-xs text-zinc-400">{agent.role} · {agent.department}</p>
            <p className="mt-0.5 text-[10px] text-zinc-600">{agent.model} · Team {agent.team}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {/* tab rail */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROFILE_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${tab === t.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'overview' && <Overview agent={agent} />}
              {tab === 'tasks' && <Tasks agent={agent} />}
              {tab === 'projects' && <Projects agent={agent} />}
              {tab === 'memory' && <Memory agent={agent} />}
              {tab === 'knowledge' && <Knowledge agent={agent} />}
              {tab === 'tools' && <Tools agent={agent} />}
              {tab === 'integrations' && <Integrations agent={agent} />}
              {tab === 'performance' && <Performance agent={agent} />}
              {tab === 'activity' && <ActivityTab agent={agent} />}
              {tab === 'permissions' && <Permissions agent={agent} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600"><Icon className="h-3 w-3" />{label}</div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Overview({ agent }) {
  const o = agent.overview;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">{o.description}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Type" value={o.type} icon={Bot} />
        <Stat label="Created" value={o.created} icon={Clock} />
        <Stat label="Success rate" value={`${o.successRate}%`} icon={CheckCircle2} />
        <Stat label="Avg duration" value={o.avgDuration} icon={Clock} />
        <Stat label="Tasks done" value={String(o.tasksDone)} icon={Activity} />
        <Stat label="Cost / run" value={o.cost} icon={TrendingUp} />
      </div>
    </div>
  );
}

function Tasks({ agent }) {
  return (
    <div className="space-y-2">
      {agent.tasks.map((t, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <FolderKanban className="h-4 w-4 shrink-0 text-zinc-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-200">{t.title}</p>
            <p className="text-[10px] text-zinc-600">Due {t.due}</p>
          </div>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${TASK_STATUS_STYLE[t.status]}`}>{t.status}</span>
        </div>
      ))}
    </div>
  );
}

function Projects({ agent }) {
  return (
    <div className="space-y-2">
      {agent.projects.map((p, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white">{p}</p>
            <span className="text-[10px] text-zinc-500">{agent.department}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${60 + i * 12}%` }} /></div>
            <span className="text-[10px] text-zinc-400">{60 + i * 12}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Memory({ agent }) {
  return (
    <div className="space-y-2">
      {agent.memory.map((m, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <Brain className="h-4 w-4 shrink-0 text-violet-400" />
          <div className="min-w-0 flex-1"><p className="text-xs text-zinc-200">{m.type} memory</p><p className="text-[10px] text-zinc-600">{m.size} · updated {m.updated}</p></div>
        </div>
      ))}
    </div>
  );
}

function Knowledge({ agent }) {
  return (
    <div className="space-y-2">
      {agent.knowledge.map((k, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <BookOpen className="h-4 w-4 shrink-0 text-cyan-400" />
          <div className="min-w-0 flex-1"><p className="truncate text-xs text-zinc-200">{k.name}</p><p className="text-[10px] text-zinc-600">{k.type} · {k.chunks} chunks</p></div>
        </div>
      ))}
    </div>
  );
}

function Tools({ agent }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {agent.tools.map((t) => {
        const I = TOOL_ICON[t] || Wrench;
        return (
          <div key={t} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15"><I className="h-4 w-4 text-violet-300" /></span>
            <div><p className="text-xs text-zinc-200">{t}</p><p className="text-[10px] text-zinc-600">enabled</p></div>
          </div>
        );
      })}
    </div>
  );
}

function Integrations({ agent }) {
  return (
    <div className="space-y-2">
      {agent.integrations.map((it, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <Plug className="h-4 w-4 shrink-0 text-zinc-400" />
          <p className="flex-1 text-xs text-zinc-200">{it.name}</p>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${it.status === 'Connected' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>{it.status}</span>
        </div>
      ))}
    </div>
  );
}

function Performance({ agent }) {
  const data = agent.perfSeries.map((v, i) => ({ d: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Success" value={`${agent.performance}%`} icon={CheckCircle2} />
        <Stat label="Tasks" value={String(agent.overview.tasksDone)} icon={Activity} />
        <Stat label="Avg time" value={agent.overview.avgDuration} icon={Clock} />
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">7-day trend</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="d" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#101119', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ agent }) {
  return (
    <div className="space-y-3">
      {agent.activity.map((a, i) => (
        <div key={i} className="flex gap-3">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400 ring-4 ring-violet-400/10" />
          <div><p className="text-xs text-zinc-300">{a.text}</p><p className="text-[10px] text-zinc-600">{a.time}</p></div>
        </div>
      ))}
    </div>
  );
}

function Permissions({ agent }) {
  return (
    <div className="space-y-2">
      {agent.permissions.map((p, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <ShieldCheck className={`h-4 w-4 shrink-0 ${p.granted ? 'text-emerald-400' : 'text-zinc-600'}`} />
          <p className="flex-1 text-xs text-zinc-200">{p.name}</p>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${p.granted ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>{p.granted ? 'Granted' : 'Denied'}</span>
        </div>
      ))}
    </div>
  );
}