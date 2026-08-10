import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { base44 } from '@/api/base44Client';
import CommandCenter from '@/components/runtime/CommandCenter';
import TaskHistory from '@/components/runtime/TaskHistory';
import AgentConfigPanel from '@/components/runtime/AgentConfigPanel';

// Agent command centre — the runtime UX. Loads a real backend agent, lets the
// user enter a task and run it, shows live progress (pending → running →
// completed) via the Task realtime subscription, and lists the full task
// history for this agent.
export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAgent = useCallback(async () => {
    try { setAgent(await base44.entities.Agent.get(id)); } catch {}
  }, [id]);

  const loadHistory = useCallback(async () => {
    try { setTasks(await base44.entities.Task.filter({ agent_id: id }, '-created_date', 20)); } catch {}
  }, [id]);

  useEffect(() => {
    (async () => {
      await loadAgent();
      await loadHistory();
      setLoading(false);
    })();
  }, [loadAgent, loadHistory]);

  // Live progress: the backend transitions the task pending → running →
  // completed (or failed); reflect each update here as it happens.
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (!event.data || event.data.agent_id !== id) return;
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === event.id);
        if (idx === -1) return [event.data, ...prev];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...event.data };
        return copy;
      });
    });
    return unsubscribe;
  }, [id]);

  const run = async (input) => {
    const res = await base44.functions.invoke('runAgentTask', { agent_id: id, input });
    const data = res.data ?? res;
    setTasks((prev) => [data.task, ...prev.filter((t) => t.id !== data.task.id)]);
    return data;
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading agent…</div>;
  if (!agent) return (
    <div className="text-sm text-zinc-500">Agent not found. <Link to="/agents" className="text-violet-400">Back to agents</Link></div>
  );

  return (
    <>
      <div className="mb-4">
        <Link to="/agents" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />Back to agents
        </Link>
      </div>
      <PageHeader eyebrow="AI" title={agent.name} description={agent.description || agent.role} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <CommandCenter agent={agent} onRun={run} />
          <TaskHistory tasks={tasks} />
        </div>
        <AgentConfigPanel agent={agent} />
      </div>
    </>
  );
}