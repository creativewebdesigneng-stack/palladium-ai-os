import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, ClipboardPlus, Filter, Bot, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { SectionHead } from '@/components/workforce/wfShared';
import AgentCard from '@/components/workforce/AgentCard';
import AgentProfileDrawer from '@/components/workforce/AgentProfileDrawer';
import WorkforceCommandCentre from '@/components/workforce/WorkforceCommandCentre';
import DepartmentGrid from '@/components/workforce/DepartmentGrid';
import CreateDepartmentModal from '@/components/workforce/CreateDepartmentModal';
import AgentCommsFeed from '@/components/workforce/AgentCommsFeed';
import { STATUSES } from '@/components/workforce/wfData';
import { mapAgentToWf } from '@/components/workforce/normalize';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';
import { useUpgrade } from '@/lib/upgradeContext';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

const EMPTY_COMMS = { from_agent_id: '', to_agent_id: '', message_type: 'handoff', content: '', create_task: true };

export default function Workforce() {
  const { gate } = useUpgrade();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState(null);

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [noOrg, setNoOrg] = useState(false);

  const [deptOpen, setDeptOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [sending, setSending] = useState(false);
  const [comms, setComms] = useState(EMPTY_COMMS);

  const loadAll = async () => {
    setLoading(true);
    try {
      setOverview(await base44.functions.invoke('getWorkforceOverview', {}));
    } catch {
      setOverview(null);
    }
    try {
      const [ag, tk, tm, msg] = await Promise.all([
        base44.entities.Agent.filter({}, '-created_date', 200),
        base44.entities.Task.filter({}, '-created_date', 500),
        base44.entities.AgentTeam.filter({}, '-created_date', 200),
        base44.entities.AgentMessage.filter({}, '-created_date', 100),
      ]);
      setAgents(ag || []);
      setTasks(tk || []);
      setTeams(tm || []);
      setMessages(msg || []);
      setNoOrg(false);
    } catch {
      setNoOrg(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Ensure a workforce record exists for the org; ignore "no organisation"
      // so the page still renders its empty state instead of erroring.
      try { await base44.functions.invoke('createWorkforce', {}); } catch { /* no org yet */ }
      await loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadOverview = async () => {
    try { setOverview(await base44.functions.invoke('getWorkforceOverview', {})); } catch { /* ignore */ }
  };

  const wfAgents = agents.map((a) => mapAgentToWf(a, tasks));
  const filtered = statusFilter === 'All' ? wfAgents : wfAgents.filter((a) => a.status === statusFilter);

  const handleSaveDepartment = async (form) => {
    if (!gate('createAgents')) return;
    try {
      await base44.functions.invoke('createAgentTeam', { ...form, team_id: editTeam ? editTeam.id : '' });
      toast({ title: editTeam ? 'Department updated' : 'Department created', description: form.name });
      setDeptOpen(false);
      setEditTeam(null);
      setTeams(await base44.entities.AgentTeam.filter({}, '-created_date', 200));
      await reloadOverview();
    } catch (e) {
      toast({ title: 'Could not save department', description: e.message, variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!gate('runTasks')) return;
    setSending(true);
    try {
      await base44.functions.invoke('sendAgentMessage', comms);
      toast({
        title: 'Message sent',
        description: comms.message_type === 'handoff' && comms.create_task !== false
          ? 'Recipient received a pending task.'
          : 'Delivered to the recipient.',
      });
      setComms(EMPTY_COMMS);
      setMessages(await base44.entities.AgentMessage.filter({}, '-created_date', 100));
      setTasks(await base44.entities.Task.filter({}, '-created_date', 500));
      await reloadOverview();
    } catch (e) {
      toast({ title: 'Could not send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => { setEditTeam(null); setDeptOpen(true); }} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"><UserPlus className="h-4 w-4" />New department</button>
      <button onClick={() => gate('runTasks')} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"><ClipboardPlus className="h-4 w-4" />Assign Task</button>
      <button onClick={() => gate('createAgents')} className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-4 w-4" />Create Agent</button>
    </div>
  );

  if (noOrg) {
    return (
      <>
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-40"><NeuralNetworkBackground intensity="low" /></div>
        <PageHeader eyebrow="AI" title="AI Workforce" description="Manage your digital workforce." />
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-16 text-center">
          <Building2 className="mx-auto h-9 w-9 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-white">Create an organisation to start building your workforce</p>
          <p className="mt-1 text-xs text-zinc-500">AI employees, departments and agent handoffs are all scoped to your organisation.</p>
          <Link to="/team" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white">Set up your organisation</Link>
        </div>
      </>
    );
  }

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

      <DepartmentGrid teams={teams} agents={agents} onCreate={() => { setEditTeam(null); setDeptOpen(true); }} onEdit={(t) => { setEditTeam(t); setDeptOpen(true); }} />

      <AgentCommsFeed messages={messages} agents={agents} onSend={handleSend} sending={sending} form={comms} setForm={setComms} />

      <AnimatePresence>
        {active && <AgentProfileDrawer agent={active} onClose={() => setActive(null)} />}
      </AnimatePresence>

      <CreateDepartmentModal open={deptOpen} onClose={() => { setDeptOpen(false); setEditTeam(null); }} onSubmit={handleSaveDepartment} agents={agents} team={editTeam} />
    </>
  );
}