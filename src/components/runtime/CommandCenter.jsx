import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useUpgrade } from '@/lib/upgradeContext';
import TaskStatusBadge from './TaskStatusBadge';

// The agent command centre: enter a task, run the agent, watch progress
// (pending → running → completed) and read the result. `onRun` invokes the
// runAgentTask backend function and returns { task, output }.
export default function CommandCenter({ agent, onRun }) {
  const { gate } = useUpgrade();
  const [input, setInput] = useState('');
  const [active, setActive] = useState(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!input.trim() || running) return;
    if (!gate('runTasks')) return;
    setActive({ status: 'pending', input, title: input.slice(0, 80) });
    setRunning(true);
    try {
      const res = await onRun(input);
      setActive(res.task);
      setInput('');
    } catch (e) {
      setActive({ status: 'failed', input, error: e.message || 'Run failed' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <p className="text-sm font-medium text-white">Command centre</p>
      <p className="mt-1 text-xs text-zinc-500">Enter a task for {agent.name} to process.</p>

      <div className="mt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="e.g. Summarise the latest market trends in AI infrastructure…"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            {agent.model || 'GPT-5'} · {agent.provider || 'openai'} · temp {agent.temperature ?? 0.7}
          </p>
          <button
            onClick={run}
            disabled={!input.trim() || running}
            className="pbtn pbtn-primary flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Running…' : 'Run agent'}
          </button>
        </div>
      </div>

      {active && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <TaskStatusBadge status={active.status} />
            <span className="text-[11px] text-zinc-500">
              {active.execution_ms ? `${active.execution_ms}ms` : ''}
              {active.tokens_used ? ` · ${active.tokens_used} tokens` : ''}
            </span>
          </div>
          {active.error ? (
            <p className="mt-3 text-sm text-rose-400">{active.error}</p>
          ) : (
            <div className="mt-3 text-sm leading-relaxed text-zinc-300">
              <ReactMarkdown>{active.output || (running ? 'Processing through the model and enabled tools…' : '')}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}