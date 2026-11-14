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

function datedOutcomes(tasks) {
  const buckets = new Map();
  for (const task of tasks) {
    if (!['completed', 'succeeded', 'failed'].includes(task.status)) continue;
    const stamp = task.completed_at || task.created_at;
    const parsed = stamp ? new Date(stamp) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) continue;
    const key = parsed.toISOString().slice(0, 10);
    const row = buckets.get(key) ?? { day: key, succeeded: 0, failed: 0 };
    if (task.status === 'failed') row.failed += 1;
    else row.succeeded += 1;
    buckets.set(key, row);
  }
  return [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day)).map((row) => ({
    day: row.day,
    rate: row.succeeded + row.failed ? Math.round((row.succeeded / (row.succeeded + row.failed)) * 100) : 0,
  }));
}

function averageDuration(tasks) {
  const durations = tasks.map((task) => Number(task.duration_ms)).filter((value) => Number.isFinite(value) && value >= 0);
  if (!durations.length) return null;
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return average < 1000 ? `${Math.round(average)}ms` : `${(average / 1000).toFixed(1)}s`;
}

const STATUS_MAP = { draft: 'Idle', active: 'Online', paused: 'Paused', archived: 'Offline' };
const TASK_STATUS_MAP = { pending: 'Queued', running: 'Running', succeeded: 'Completed', completed: 'Completed', failed: 'Failed' };

export function mapAgentToWf(a, tasks = []) {
  const myTasks = tasks.filter((t) => t.agent_id === a.id);
  const running = myTasks.find((t) => t.status === 'running');
  const completed = myTasks.filter((t) => ['completed', 'succeeded'].includes(t.status)).length;
  const failed = myTasks.filter((t) => t.status === 'failed').length;
  const perf = completed + failed ? Math.round((completed / (completed + failed)) * 100) : 0;
  const status = running ? 'Working' : STATUS_MAP[a.status] || 'Idle';
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
    currentTask: running ? running.title : a.status === 'active' ? 'Available' : '—',
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
      successRate: completed + failed ? perf : null,
      avgDuration: averageDuration(myTasks),
      tasksDone: completed,
      cost: null,
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
    perfSeries: datedOutcomes(myTasks),
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