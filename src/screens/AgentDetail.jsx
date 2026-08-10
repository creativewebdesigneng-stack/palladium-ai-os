import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import CommandCenter from '@/components/runtime/CommandCenter';
import TaskHistory from '@/components/runtime/TaskHistory';
import AgentConfigPanel from '@/components/runtime/AgentConfigPanel';
import { getAgentRuntime, reapStuckRuns } from '@/lib/runtime/runtime.functions';
import { supabase } from '@/integrations/supabase/client';

// Agent command centre — the runtime UX. Loads the real backend agent, lets the
// operator run tasks with live streaming output, and lists the full run history.
export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data?.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getAgentRuntime({ data: { agent_id: id } });
      setAgent(res.agent);
      setTasks(res.tasks);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load that agent.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (authed !== true) {
      if (authed === false) setLoading(false);
      return;
    }
    // Close out anything the runtime left hanging, then load fresh state.
    reapStuckRuns().catch(() => {});
    load();
  }, [authed, load]);

  // Live run updates from the database (streaming updates come from the run itself).
  useEffect(() => {
    if (!id || authed !== true) return;
    const channel = supabase
      .channel(`agent-tasks-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks', filter: `agent_id=eq.${id}` }, (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === row.id);
          if (idx === -1) return [row, ...prev];
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...row };
          return copy;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, authed]);

  if (authed === false) return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-sm text-zinc-400">
      Sign in to run this agent. <Link to="/login" className="text-violet-400">Go to sign in</Link>
    </div>
  );
  if (loading) return <div className="text-sm text-zinc-500">Loading agent…</div>;
  if (!agent) return (
    <div className="text-sm text-zinc-500">{error || 'Agent not found.'} <Link to="/agents" className="text-violet-400">Back to agents</Link></div>
  );

  return (
    <>
      <div className="mb-4">
        <Link to="/agents" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />Back to agents
        </Link>
      </div>
      <PageHeader eyebrow="AI" title={agent.name} description={agent.description || agent.purpose || agent.category} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <CommandCenter agent={agent} onFinished={load} />
          <TaskHistory tasks={tasks} />
        </div>
        <AgentConfigPanel agent={agent} />
      </div>
    </>
  );
}
