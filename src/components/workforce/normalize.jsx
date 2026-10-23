import { agentIdentityFromPreferences } from '@/lib/agents/agent-identity';
// Maps a backend Agent entity (plus its Tasks) to the rich shape used by the
// existing AgentCard / AgentProfileDrawer so the polished drawer keeps working
// against real data. Pure helpers, no React.

const GRADS = [
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-fuchsia-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-lime-500 to-emerald-600',
  'from-rose-500 to-red-600',
  'from-sky-500 to-indigo-600',
];

export function gradFor(seed = '') {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function relTime(iso) {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function workforceSuccessRate(completed, failed) {
  return completed + failed ? Math.round((completed / (completed + failed)) * 100) : null;
}

export function formatWorkforcePercentage(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '—';
}

const STATUS_MAP = { draft: 'Idle', active: 'Online', paused: 'Paused', archived: 'Offline' };
const TASK_STATUS_MAP = { pending: 'Queued', queued: 'Queued', running: 'Running', waiting_for_tool: 'Waiting for tool', waiting_for_approval: 'Awaiting approval', cancelled: 'Cancelled', succeeded: 'Completed', completed: 'Completed', failed: 'Failed' };

export function mapAgentToWf(a, tasks = []) {
  const myTasks = tasks.filter((t) => t.agent_id === a.id);
  const running = myTasks.find((t) => ['running', 'waiting_for_tool'].includes(t.status));
  const approval = myTasks.find((t) => t.status === 'waiting_for_approval');
  const queued = myTasks.find((t) => ['queued', 'pending'].includes(t.status));
  const current = running ?? approval ?? queued;
  const completed = myTasks.filter((t) => ['completed', 'succeeded'].includes(t.status)).length;
  const failed = myTasks.filter((t) => t.status === 'failed').length;
  const perf = workforceSuccessRate(completed, failed);
  const status = running ? 'Working' : approval ? 'Awaiting approval' : queued && !['paused', 'archived'].includes(a.status) ? 'Queued' : STATUS_MAP[a.status] || 'Idle';
  const identity = agentIdentityFromPreferences(a.preferences);

  return {
    id: a.id,
    name: a.name,
    role: a.role || 'Agent',
    letter: (a.name || '?').charAt(0).toUpperCase(),
    grad: gradFor(a.id),
    identity,
    preferences: a.preferences ?? {},
    status,
    currentTask: current ? current.title : a.status === 'active' ? 'Available' : '—',
    model: a.model || '—',
    tools: Array.isArray(a.allowed_tools) ? a.allowed_tools : Array.isArray(a.tools) ? a.tools : [],
    projects: [],
    performance: perf,
    lastActive: relTime(a.updated_at || a.updated_date || a.created_at || a.created_date),
    department: '',
    team: '',
    workflows: 0,
    overview: {
      type: a.role || 'Agent',
      created: (a.created_at || a.created_date) ? new Date(a.created_at || a.created_date).toLocaleDateString() : '—',
      description: a.description || 'No description set.',
      successRate: perf,
      avgDuration: '—',
      tasksDone: completed,
      cost: '—',
    },
    tasks: myTasks.slice(0, 8).map((t) => ({
      title: t.title,
      status: TASK_STATUS_MAP[t.status] || cap(t.status),
      priority: cap(t.priority || 'medium'),
      due: t.due_date ? new Date(t.due_date).toLocaleDateString() : '—',
    })),
    memory: [],
    knowledge: [],
    integrations: [],
    // Daily history is unavailable; never fabricate points from an aggregate.
    perfSeries: [],
    activity: [],
    permissions: [],
    _backend: true,
  };
}

export function agentByIdName(agents) {
  const map = {};
  for (const a of agents) map[a.id] = a.name;
  return map;
}
export function buildWorkforceOverview(agents, tasks, usage) {
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const running = count('running') + count('waiting_for_tool');
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
    performance: workforceSuccessRate(completed, failed),
    usage: usage || {},
  };
}
