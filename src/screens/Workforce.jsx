import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, ClipboardPlus, Filter, Bot, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { SectionHead } from '@/components/workforce/wfShared';
import AgentCard from '@/components/workforce/AgentCard';
import AgentProfileDrawer from '@/components/workforce/AgentProfileDrawer';
import WorkforceCommandCentre from '@/components/workforce/WorkforceCommandCentre';
import WorkforceOrchestrator from '@/components/workforce/WorkforceOrchestrator';
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
      <button onClick={() => { setEditTeam(null); setDeptOpen(true); }} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"><UserPlus className="h-4 w-4" />New department</button>
      <Link to="/mission-control" onClick={(event) => { if (!gate('runTasks')) event.preventDefault(); }} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"><ClipboardPlus className="h-4 w-4" />Assign Task</Link>
      <Link to="/agents/new" onClick={(event) => { if (!gate('createAgents')) event.preventDefault(); }} className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-4 w-4" />Create Agent</Link>
    </div>
  );

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-40"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="AI" title="AI Workforce" description="Manage your digital workforce." action={headerActions} />

      <WorkforceCommandCentre overview={overview} loading={loading} />

      {/* Agent grid */}
      <section className="mb-8">
        <SectionHead icon={Bot} title="Agent grid" desc={`${filtered.length} of ${wfAgents.length} agents`} action={
          <div className="flex items-center gap-1 text-[11px] text-zinc-500"><Filter className="h-3 w-3" />filter</div>
        } />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {['All', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1.5 text-xs transition ${statusFilter === s ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{s}</button>
          ))}
        </div>
        {wfAgents.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
            <Bot className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-white">No agents yet</p>
            <p className="mt-1 text-xs text-zinc-500">Create your first AI employee to populate the workforce.</p>
            <Link to="/agents/new" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" />Create Agent</Link>
          </div>
        )}
      </section>

      <WorkforceOrchestrator />

      {activeOrgId ? (
        <DepartmentGrid teams={teams} agents={agents} onCreate={() => { setEditTeam(null); setDeptOpen(true); }} onEdit={(t) => { setEditTeam(t); setDeptOpen(true); }} />
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-white">Departments need an organisation</p>
          <p className="mt-1 text-xs text-zinc-500">Set one up to group your agents into departments with shared goals and permissions.</p>
          <Link to="/team" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white">Set up your organisation</Link>
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
