import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, ClipboardPlus, Filter, Bot, Building2, Activity, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { SectionHead } from '@/components/workforce/wfShared';
import AgentCard from '@/components/workforce/AgentCard';
import AgentProfileDrawer from '@/components/workforce/AgentProfileDrawer';
import WorkforceCommandCentre from '@/components/workforce/WorkforceCommandCentre';
import WorkforceOrchestrator from '@/components/workforce/WorkforceOrchestrator';
import WorkforceOSPanel from '@/components/workforce/WorkforceOSPanel';
import DepartmentGrid from '@/components/workforce/DepartmentGrid';
import CreateDepartmentModal from '@/components/workforce/CreateDepartmentModal';
import AgentCommsFeed from '@/components/workforce/AgentCommsFeed';
import { STATUSES } from '@/components/workforce/wfData';
import { mapAgentToWf } from '@/components/workforce/normalize';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';
import { useUpgrade } from '@/lib/upgradeContext';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAgents } from '@/lib/agents/agents.functions';
import { describeError } from '@/lib/agents/agent-create-submit';
import { getUsageSummary } from '@/lib/platform/platform.functions';
import {
  listDepartments,
  saveDepartment,
  listAgentMessages,
} from '@/lib/workforce/departments.functions';

// Derives the command-centre metrics from the caller's own agents and task
// ledger. Nothing is mocked: every number comes from RLS-scoped rows.
function buildOverview(agents, tasks, usage) {
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const running = count('running');
  const pending = count('pending') + count('queued');
  const completed = count('succeeded') + count('completed');
  const failed = count('failed');
  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === 'active').length,
    runningTasks: running,
    pendingTasks: pending,
    completedTasks: completed,
    failedTasks: failed,
    totalTasks: tasks.length,
    performance: completed + failed ? Math.round((completed / (completed + failed)) * 100) : 0,
    usage: usage || {},
  };
}

export default function Workforce() {
  const { gate } = useUpgrade();
  const { toast } = useToast();
  const { session, activeOrgId } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState(null);

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ag, dept, msg] = await Promise.all([
        listAgents({ data: { limit: 200, withTasks: true } }),
        listDepartments({ data: { orgId: activeOrgId ?? null } }),
        listAgentMessages({ data: { limit: 100 } }),
      ]);
      setAgents(ag.agents || []);
      setTasks(ag.tasks || []);
      setTeams(dept.departments || []);
      setMessages(msg.messages || []);
    } catch (e) {
      toast({ title: 'Could not load your workforce', description: describeError(e, 'Please try again.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    try {
      const summary = await getUsageSummary({ data: { orgId: activeOrgId ?? null } });
      setUsage(summary?.usage ?? summary ?? null);
    } catch {
      setUsage(null);
    }
  }, [activeOrgId, toast]);

  useEffect(() => {
    if (session !== 'yes') return;
    loadAll();
  }, [session, loadAll]);

  const overview = useMemo(() => buildOverview(agents, tasks, usage), [agents, tasks, usage]);
  const wfAgents = useMemo(() => agents.map((a) => mapAgentToWf(a, tasks)), [agents, tasks]);
  const filtered = statusFilter === 'All' ? wfAgents : wfAgents.filter((a) => a.status === statusFilter);

  const handleSaveDepartment = async (form) => {
    if (!gate('createAgents')) return;
    if (!activeOrgId) {
      toast({ title: 'Create an organisation first', description: 'Departments are scoped to an organisation.', variant: 'destructive' });
      return;
    }
    try {
      await saveDepartment({ data: { ...form, orgId: activeOrgId, id: editTeam ? editTeam.id : undefined } });
      toast({ title: editTeam ? 'Department updated' : 'Department created', description: form.name });
      setDeptOpen(false);
      setEditTeam(null);
      await loadAll();
    } catch (e) {
      toast({ title: 'Could not save department', description: e.message, variant: 'destructive' });
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => { setEditTeam(null); setDeptOpen(true); }} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-sm text-zinc-200 transition hover:border-violet-300/20 hover:bg-white/[.07]"><UserPlus className="h-4 w-4" />New department</button>
      <Link to="/mission-control" onClick={(event) => { if (!gate('runTasks')) event.preventDefault(); }} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-sm text-zinc-200 transition hover:border-violet-300/20 hover:bg-white/[.07]"><ClipboardPlus className="h-4 w-4" />Assign task</Link>
      <Link to="/agents/new" onClick={(event) => { if (!gate('createAgents')) event.preventDefault(); }} className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl border border-violet-300/25 bg-violet-400/[.12] px-3 py-2 text-sm font-medium text-violet-100 shadow-[0_0_30px_rgba(139,92,246,.12)] transition hover:bg-violet-400/[.18]"><Plus className="h-4 w-4" />Deploy agent</Link>
    </div>
  );

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-45"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Blackstar Workforce OS" title="Autonomous Workforce" description="Deploy, organise, govern and supervise your AI workforce as one coordinated intelligence network." action={headerActions} />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[.07] bg-black/25 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300/70"><Network className="h-3.5 w-3.5" />Network</div>
          <p className="mt-2 text-sm text-zinc-300">{overview.activeAgents} active intelligence nodes across {teams.length} department{teams.length === 1 ? '' : 's'}.</p>
        </div>
        <div className="rounded-2xl border border-white/[.07] bg-black/25 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-300/70"><Activity className="h-3.5 w-3.5" />Execution</div>
          <p className="mt-2 text-sm text-zinc-300">{overview.runningTasks} task{overview.runningTasks === 1 ? '' : 's'} executing now with {overview.pendingTasks} queued.</p>
        </div>
        <div className="rounded-2xl border border-white/[.07] bg-black/25 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-300/70"><Bot className="h-3.5 w-3.5" />Reliability</div>
          <p className="mt-2 text-sm text-zinc-300">{overview.performance}% successful completion across the current task ledger.</p>
        </div>
      </div>

      <WorkforceOSPanel />
      <WorkforceCommandCentre overview={overview} loading={loading} />

      <section className="mb-8 rounded-2xl border border-white/[.065] bg-black/20 p-4 backdrop-blur-xl sm:p-5">
        <SectionHead icon={Bot} title="Agent network" desc={`${filtered.length} of ${wfAgents.length} intelligence nodes`} action={
          <div className="flex items-center gap-1 text-[11px] text-zinc-500"><Filter className="h-3 w-3" />status filter</div>
        } />
        <div className="mb-4 flex flex-wrap gap-1.5">
          {['All', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full border px-3 py-1.5 text-xs transition ${statusFilter === s ? 'border-violet-300/25 bg-violet-400/[.13] text-violet-100' : 'border-white/[.08] bg-black/15 text-zinc-500 hover:border-white/15 hover:text-zinc-300'}`}>{s}</button>
          ))}
        </div>
        {wfAgents.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-violet-300/15 bg-violet-400/[.025] px-6 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.08]"><Bot className="h-6 w-6 text-violet-300" /></div>
            <p className="mt-4 text-sm font-medium text-white">No intelligence nodes deployed</p>
            <p className="mt-1 text-xs text-zinc-500">Deploy your first agent to bring the Blackstar workforce network online.</p>
            <Link to="/agents/new" className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-violet-300/25 bg-violet-400/[.12] px-3.5 py-2 text-sm font-medium text-violet-100"><Plus className="h-4 w-4" />Deploy agent</Link>
          </div>
        )}
      </section>

      <WorkforceOrchestrator />

      {activeOrgId ? (
        <DepartmentGrid teams={teams} agents={agents} onCreate={() => { setEditTeam(null); setDeptOpen(true); }} onEdit={(t) => { setEditTeam(t); setDeptOpen(true); }} />
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-white/[.08] bg-black/20 px-6 py-12 text-center backdrop-blur-xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.035]"><Building2 className="h-6 w-6 text-zinc-500" /></div>
          <p className="mt-4 text-sm font-medium text-white">Departments need an organisation</p>
          <p className="mt-1 text-xs text-zinc-500">Create an organisation to coordinate agents into governed departments with shared goals and permissions.</p>
          <Link to="/team" className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-violet-300/25 bg-violet-400/[.12] px-3.5 py-2 text-sm font-medium text-violet-100">Set up organisation</Link>
        </div>
      )}

      <AgentCommsFeed messages={messages} agents={agents} />

      <AnimatePresence>
        {active && <AgentProfileDrawer agent={active} onClose={() => setActive(null)} />}
      </AnimatePresence>

      <CreateDepartmentModal open={deptOpen} onClose={() => { setDeptOpen(false); setEditTeam(null); }} onSubmit={handleSaveDepartment} agents={agents} team={editTeam} />
    </>
  );
}
