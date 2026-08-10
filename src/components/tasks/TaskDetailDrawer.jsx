import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Wrench, FileText, Activity, Terminal, CheckCircle2, MessageSquare, UserCheck, FileText as InsIcon } from 'lucide-react';
import { STATUS_STYLE, PRIORITY_STYLE, TOOL_ICON, DETAIL_TABS } from './jobsData';
import LiveExecution from './LiveExecution';

const TAB_ICON = {
  instructions: InsIcon, agent: Cpu, tools: Wrench, files: FileText, activity: Activity,
  logs: Terminal, results: CheckCircle2, comments: MessageSquare, approvals: UserCheck,
};

export default function TaskDetailDrawer({ task, onClose }) {
  const [tab, setTab] = useState('instructions');
  if (!task) return null;
  const st = STATUS_STYLE[task.status];

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0b0c12]">
        {/* header */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">{task.title}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{task.description}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{task.status}</span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{task.project}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">Due {task.dueDate}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500 sm:grid-cols-4">
            <Meta label="Agent" value={task.agent} />
            <Meta label="Owner" value={task.owner} />
            <Meta label="Created" value={task.created} />
            <Meta label="Updated" value={task.updated} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${task.progress}%` }} /></div>
            <span className="text-[10px] text-zinc-400">{task.progress}%</span>
          </div>
        </div>

        {/* live execution */}
        <div className="p-4"><LiveExecution task={task} /></div>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DETAIL_TABS.map((t) => {
            const I = TAB_ICON[t.id];
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${tab === t.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <I className="h-3.5 w-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'instructions' && <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">{task.instructions}</pre>}
              {tab === 'agent' && <AgentTab task={task} />}
              {tab === 'tools' && <ToolsTab task={task} />}
              {tab === 'files' && <FilesTab task={task} />}
              {tab === 'activity' && <ActivityTab task={task} />}
              {tab === 'logs' && <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-emerald-300/80">{task.logs || 'No logs yet.'}</pre>}
              {tab === 'results' && <ResultsTab task={task} />}
              {tab === 'comments' && <CommentsTab task={task} />}
              {tab === 'approvals' && <ApprovalsTab task={task} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}

function Meta({ label, value }) {
  return <div><p className="uppercase tracking-wider text-zinc-600">{label}</p><p className="text-zinc-300">{value}</p></div>;
}

function AgentTab({ task }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-semibold text-white">{task.agent[0]}</span>
        <div><p className="text-sm font-medium text-white">{task.agent}</p><p className="text-xs text-zinc-400">{task.agentRole}</p></div>
      </div>
      <Row label="Model" value={task.model} />
      <Row label="Project" value={task.project} />
      <Row label="Owner" value={task.owner} />
      <Row label="Progress" value={`${task.progress}%`} />
    </div>
  );
}
function Row({ label, value }) {
  return <div className="flex justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"><span className="text-zinc-500">{label}</span><span className="text-zinc-200">{value}</span></div>;
}

function ToolsTab({ task }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {task.tools.map((t) => { const I = TOOL_ICON[t] || Wrench; return (
        <div key={t} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15"><I className="h-4 w-4 text-violet-300" /></span>
          <div><p className="text-xs text-zinc-200">{t}</p><p className="text-[10px] text-emerald-400">enabled</p></div>
        </div>
      ); })}
    </div>
  );
}

function FilesTab({ task }) {
  return (
    <div className="space-y-2">
      {task.files.length === 0 && <p className="text-xs text-zinc-600">No files attached.</p>}
      {task.files.map((f, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <FileText className="h-4 w-4 text-cyan-400" />
          <p className="flex-1 truncate text-xs text-zinc-200">{f.name}</p>
          <span className="text-[10px] text-zinc-600">{f.size}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ task }) {
  return (
    <div className="space-y-3">
      {task.activity.map((a, i) => (
        <div key={i} className="flex gap-3">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400 ring-4 ring-violet-400/10" />
          <div><p className="text-xs text-zinc-300">{a.text}</p><p className="text-[10px] text-zinc-600">{a.t}</p></div>
        </div>
      ))}
    </div>
  );
}

function ResultsTab({ task }) {
  return (
    <div className="space-y-2">
      {task.results.length === 0 && <p className="text-xs text-zinc-600">No results yet.</p>}
      {task.results.map((r, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="flex-1 truncate text-xs text-zinc-200">{r.name}</p>
          {r.size && <span className="text-[10px] text-zinc-600">{r.size}</span>}
        </div>
      ))}
    </div>
  );
}

function CommentsTab({ task }) {
  return (
    <div className="space-y-3">
      {task.comments.length === 0 && <p className="text-xs text-zinc-600">No comments yet.</p>}
      {task.comments.map((c, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between"><p className="text-xs font-medium text-white">{c.who}</p><span className="text-[10px] text-zinc-600">{c.at}</span></div>
          <p className="mt-1 text-xs text-zinc-300">{c.text}</p>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <input placeholder="Add a comment…" className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none" />
        <button className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] text-white">Send</button>
      </div>
    </div>
  );
}

function ApprovalsTab({ task }) {
  return (
    <div className="space-y-2">
      {task.approvals.length === 0 && <p className="text-xs text-zinc-600">No approvals required.</p>}
      {task.approvals.map((a, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <UserCheck className="h-4 w-4 text-violet-400" />
          <div className="flex-1"><p className="text-xs text-zinc-200">{a.who}</p><p className="text-[10px] text-zinc-600">{a.at}</p></div>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${a.status === 'Approved' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>{a.status}</span>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button className="flex-1 rounded-lg bg-emerald-500/15 py-2 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20 hover:bg-emerald-500/25">Approve</button>
        <button className="flex-1 rounded-lg bg-rose-500/15 py-2 text-xs font-medium text-rose-300 ring-1 ring-rose-400/20 hover:bg-rose-500/25">Reject</button>
      </div>
    </div>
  );
}