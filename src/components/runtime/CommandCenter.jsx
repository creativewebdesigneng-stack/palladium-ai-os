import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, Square, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useUpgrade } from '@/lib/upgradeContext';
import TaskStatusBadge from './TaskStatusBadge';
import { streamAgentRun } from '@/lib/runtime/run-client';
import { cancelAgentTask } from '@/lib/runtime/runtime.functions';

// The agent command centre: enter a task, run the agent against the real
// runtime and watch the answer stream in token by token, with live tool calls,
// cancellation and error surfacing.
export default function CommandCenter({ agent, onFinished }) {
  const { gate } = useUpgrade();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null); // pending | running | completed | failed
  const [text, setText] = useState('');
  const [toolTrace, setToolTrace] = useState([]);
  const [error, setError] = useState('');
  const [task, setTask] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const running = status === 'pending' || status === 'running';

  const run = async () => {
    if (!input.trim() || running) return;
    if (!gate('runTasks')) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('pending');
    setText('');
    setToolTrace([]);
    setError('');
    setTask(null);

    try {
      const finished = await streamAgentRun({
        agentId: agent.id,
        input,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'status') {
            setStatus('running');
            setTask((t) => t ?? { id: event.task_id });
          } else if (event.type === 'delta') {
            setText((prev) => prev + event.text);
          } else if (event.type === 'tool') {
            setToolTrace((prev) => [...prev, { name: event.name, ok: event.ok }]);
          } else if (event.type === 'error') {
            setStatus('failed');
            setError(event.message);
          } else if (event.type === 'complete') {
            setStatus('completed');
            setTask(event.task);
            if (event.task?.output_text) setText(event.task.output_text);
          }
        },
      });
      setInput('');
      if (finished) onFinished?.(finished);
    } catch (e) {
      if (controller.signal.aborted) return;
      setStatus('failed');
      setError(e?.message || 'Run failed.');
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = async () => {
    const id = task?.id;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('failed');
    setError('Run cancelled.');
    if (id) {
      try { await cancelAgentTask({ data: { task_id: id } }); } catch { /* already closed */ }
      onFinished?.({ id });
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
          disabled={running}
          placeholder="e.g. Summarise the latest market trends in AI infrastructure…"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-100 outline-none focus:border-violet-500 disabled:opacity-60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-600">
            {agent.model || 'default model'} · {agent.model_provider || 'lovable'} · temp {agent.temperature ?? 0.7}
            {agent.memory_enabled === false ? ' · memory off' : ' · memory on'}
          </p>
          <div className="flex items-center gap-2">
            {running && (
              <button onClick={cancel} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
                <Square className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
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
      </div>

      {status && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <TaskStatusBadge status={status} />
            <span className="text-[11px] text-zinc-500">
              {task?.duration_ms ? `${task.duration_ms}ms` : ''}
              {task ? ` · ${(task.tokens_in ?? 0) + (task.tokens_out ?? 0)} tokens` : ''}
            </span>
          </div>

          {toolTrace.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {toolTrace.map((t, i) => (
                <span key={`${t.name}-${i}`} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${t.ok ? 'bg-white/5 text-zinc-300' : 'bg-rose-500/10 text-rose-300'}`}>
                  <Wrench className="h-3 w-3" />{t.name}
                </span>
              ))}
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-rose-400">{error}</p>
          ) : (
            <div className="mt-3 text-sm leading-relaxed text-zinc-300">
              {text ? <ReactMarkdown>{text}</ReactMarkdown> : <p className="text-zinc-500">Thinking through the task, memory and enabled tools…</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
