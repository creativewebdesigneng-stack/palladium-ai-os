// Mock data for the PalladiumAI Workforce experience. Placeholder only.
import { Megaphone, TrendingUp, Headphones, Users, Wallet, Scale, FlaskConical, Code2, Cog, Palette, PenTool, Building2, Activity, CheckCircle2, Clock, Gauge, PiggyBank, Workflow } from 'lucide-react';

export const OVERVIEW = [
  { label: 'Total AI Employees', value: '48', sub: '+6 this month', icon: Users, color: 'from-violet-500 to-indigo-600' },
  { label: 'Departments', value: '11', sub: 'all staffed', icon: Building2, color: 'from-cyan-500 to-blue-600' },
  { label: 'Running Tasks', value: '23', sub: 'across 7 teams', icon: Activity, color: 'from-emerald-500 to-teal-600' },
  { label: 'Completed Tasks', value: '1,204', sub: '+184 this week', icon: CheckCircle2, color: 'from-amber-500 to-orange-600' },
  { label: 'Avg Response Time', value: '1.8s', sub: '-0.4s vs last week', icon: Clock, color: 'from-fuchsia-500 to-pink-600' },
  { label: 'Productivity Score', value: '92%', sub: '+5% vs last week', icon: Gauge, color: 'from-blue-500 to-cyan-600' },
  { label: 'Automation Savings', value: '£84k', sub: 'this quarter', icon: PiggyBank, color: 'from-lime-500 to-emerald-600' },
  { label: 'Active Workflows', value: '17', sub: '4 scheduled', icon: Workflow, color: 'from-rose-500 to-red-600' },
];

export const DEPARTMENTS = [
  { name: 'Marketing', icon: Megaphone, manager: 'Growth Lead', agents: 6, workload: 74, score: 91, status: 'Active', grad: 'from-violet-500 to-fuchsia-600' },
  { name: 'Sales', icon: TrendingUp, manager: 'Pipeline Manager', agents: 5, workload: 88, score: 89, status: 'Busy', grad: 'from-cyan-500 to-blue-600' },
  { name: 'Customer Support', icon: Headphones, manager: 'Support Lead', agents: 7, workload: 62, score: 96, status: 'Active', grad: 'from-emerald-500 to-teal-600' },
  { name: 'Human Resources', icon: Users, manager: 'People Ops', agents: 3, workload: 34, score: 84, status: 'Steady', grad: 'from-amber-500 to-orange-600' },
  { name: 'Finance', icon: Wallet, manager: 'Finance Controller', agents: 4, workload: 71, score: 93, status: 'Active', grad: 'from-blue-500 to-indigo-600' },
  { name: 'Legal', icon: Scale, manager: 'Compliance Agent', agents: 2, workload: 28, score: 88, status: 'Steady', grad: 'from-rose-500 to-pink-600' },
  { name: 'Research', icon: FlaskConical, manager: 'Research Lead', agents: 5, workload: 80, score: 94, status: 'Busy', grad: 'from-violet-500 to-indigo-600' },
  { name: 'Development', icon: Code2, manager: 'Eng Manager', agents: 6, workload: 76, score: 92, status: 'Active', grad: 'from-emerald-500 to-cyan-600' },
  { name: 'Operations', icon: Cog, manager: 'Ops Coordinator', agents: 4, workload: 58, score: 87, status: 'Active', grad: 'from-zinc-500 to-slate-600' },
  { name: 'Design', icon: Palette, manager: 'Design Lead', agents: 3, workload: 45, score: 90, status: 'Steady', grad: 'from-fuchsia-500 to-purple-600' },
  { name: 'Content', icon: PenTool, manager: 'Content Lead', agents: 3, workload: 66, score: 89, status: 'Active', grad: 'from-orange-500 to-amber-600' },
];

export const EMPLOYEES = [
  { id: 'e1', name: 'Aria', title: 'Research Analyst', dept: 'Research', model: 'GPT-5', modelGrad: 'from-emerald-400 to-teal-500', status: 'Running', task: 'Market sizing report', memory: true, tools: 5, rating: 5, level: 'Senior', completed: 312, grad: 'from-violet-500 to-indigo-600', letter: 'A' },
  { id: 'e2', name: 'Cody', title: 'Support Specialist', dept: 'Customer Support', model: 'Claude', modelGrad: 'from-orange-400 to-amber-500', status: 'Running', task: 'Ticket #4812', memory: true, tools: 3, rating: 5, level: 'Mid', completed: 184, grad: 'from-cyan-500 to-blue-600', letter: 'C' },
  { id: 'e3', name: 'Devon', title: 'Code Reviewer', dept: 'Development', model: 'DeepSeek', modelGrad: 'from-cyan-400 to-blue-500', status: 'Idle', task: 'Awaiting PR', memory: true, tools: 4, rating: 4, level: 'Senior', completed: 96, grad: 'from-emerald-500 to-teal-600', letter: 'D' },
  { id: 'e4', name: 'Mia', title: 'Growth Writer', dept: 'Marketing', model: 'Gemini', modelGrad: 'from-blue-400 to-indigo-500', status: 'Running', task: 'Launch blog v2', memory: false, tools: 2, rating: 4, level: 'Junior', completed: 64, grad: 'from-fuchsia-500 to-pink-600', letter: 'M' },
  { id: 'e5', name: 'Finn', title: 'Finance Analyst', dept: 'Finance', model: 'GPT-5', modelGrad: 'from-emerald-400 to-teal-500', status: 'Running', task: 'Q3 forecast', memory: true, tools: 3, rating: 5, level: 'Lead', completed: 142, grad: 'from-amber-500 to-orange-600', letter: 'F' },
  { id: 'e6', name: 'Iris', title: 'Designer', dept: 'Design', model: 'Claude', modelGrad: 'from-orange-400 to-amber-500', status: 'Paused', task: 'Brand refresh', memory: false, tools: 2, rating: 4, level: 'Mid', completed: 38, grad: 'from-rose-500 to-red-600', letter: 'I' },
  { id: 'e7', name: 'Leo', title: 'Data Engineer', dept: 'Development', model: 'DeepSeek', modelGrad: 'from-cyan-400 to-blue-500', status: 'Running', task: 'Pipeline backfill', memory: true, tools: 4, rating: 5, level: 'Senior', completed: 210, grad: 'from-lime-500 to-emerald-600', letter: 'L' },
  { id: 'e8', name: 'Nora', title: 'Social Manager', dept: 'Marketing', model: 'Gemini', modelGrad: 'from-blue-400 to-indigo-500', status: 'Idle', task: 'Scheduling posts', memory: true, tools: 3, rating: 4, level: 'Mid', completed: 88, grad: 'from-violet-500 to-fuchsia-600', letter: 'N' },
];

export const STATUS_STYLE = {
  Running: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Idle: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5' },
  Paused: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' },
  Stopped: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
};

export const ORG = {
  name: 'Atlas', role: 'CEO Agent', grad: 'from-violet-600 to-indigo-600', letter: 'A',
  children: [
    { name: 'Growth Lead', role: 'Department Manager · Marketing', grad: 'from-violet-500 to-fuchsia-600', letter: 'G', children: [
      { name: 'Mia', role: 'Senior Agent · Growth Writer', grad: 'from-fuchsia-500 to-pink-600', letter: 'M', children: [
        { name: 'Nora', role: 'Specialist · Social', grad: 'from-violet-500 to-fuchsia-600', letter: 'N', children: [
          { name: 'Post Bot', role: 'Worker · Scheduler', grad: 'from-pink-500 to-rose-600', letter: 'P' }
        ] }
      ] }
    ] },
    { name: 'Pipeline Manager', role: 'Department Manager · Sales', grad: 'from-cyan-500 to-blue-600', letter: 'P', children: [
      { name: 'Quota', role: 'Senior Agent · SDR', grad: 'from-blue-500 to-indigo-600', letter: 'Q', children: [
        { name: 'Lead Bot', role: 'Specialist · Enrichment', grad: 'from-cyan-500 to-sky-600', letter: 'L' }
      ] }
    ] },
    { name: 'Support Lead', role: 'Department Manager · Support', grad: 'from-emerald-500 to-teal-600', letter: 'S', children: [
      { name: 'Cody', role: 'Senior Agent · Support', grad: 'from-cyan-500 to-blue-600', letter: 'C', children: [
        { name: 'Tier-1 Bot', role: 'Worker · Triage', grad: 'from-emerald-500 to-cyan-600', letter: 'T' }
      ] }
    ] },
    { name: 'Eng Manager', role: 'Department Manager · Dev', grad: 'from-emerald-500 to-cyan-600', letter: 'E', children: [
      { name: 'Devon', role: 'Senior Agent · Reviewer', grad: 'from-emerald-500 to-teal-600', letter: 'D', children: [
        { name: 'Leo', role: 'Specialist · Data', grad: 'from-lime-500 to-emerald-600', letter: 'L' }
      ] }
    ] },
  ],
};

export const LIVE_FEED = [
  { agent: 'Research Agent', text: 'finished report on AI analytics market', time: '12:38', color: 'text-violet-400' },
  { agent: 'Marketing Agent', text: 'created Q3 campaign brief', time: '12:36', color: 'text-fuchsia-400' },
  { agent: 'Support Agent', text: 'answered ticket #4812', time: '12:35', color: 'text-emerald-400' },
  { agent: 'Developer Agent', text: 'deployed v2.4 to production', time: '12:31', color: 'text-cyan-400' },
  { agent: 'Finance Agent', text: 'processed invoice INV-2093', time: '12:28', color: 'text-amber-400' },
  { agent: 'Content Agent', text: 'drafted 3 blog outlines', time: '12:24', color: 'text-orange-400' },
];

export const WORKLOAD_SERIES = [
  { d: 'Mon', current: 62, completed: 40, upcoming: 18 },
  { d: 'Tue', current: 78, completed: 55, upcoming: 22 },
  { d: 'Wed', current: 71, completed: 48, upcoming: 26 },
  { d: 'Thu', current: 88, completed: 64, upcoming: 30 },
  { d: 'Fri', current: 84, completed: 70, upcoming: 28 },
  { d: 'Sat', current: 46, completed: 38, upcoming: 14 },
  { d: 'Sun', current: 38, completed: 30, upcoming: 10 },
];

export const DEPT_UTILISATION = [
  { name: 'Sales', value: 88 }, { name: 'Research', value: 80 }, { name: 'Dev', value: 76 },
  { name: 'Mktg', value: 74 }, { name: 'Finance', value: 71 }, { name: 'Support', value: 62 },
  { name: 'Content', value: 66 }, { name: 'Design', value: 45 }, { name: 'HR', value: 34 }, { name: 'Legal', value: 28 },
];

export const WORKLOAD_STATS = [
  { label: 'Completed work', value: '1,204', sub: 'this month', color: 'text-emerald-400' },
  { label: 'Upcoming work', value: '148', sub: 'next 7 days', color: 'text-cyan-400' },
  { label: 'Avg completion', value: '2.4h', sub: 'per task', color: 'text-violet-400' },
  { label: 'Peak utilisation', value: '88%', sub: 'Sales dept', color: 'text-amber-400' },
];

export const TASKS = [
  { id: 't1', title: 'Draft Q3 launch campaign', priority: 'High', agent: 'Mia', eta: '45m', deps: ['Brand brief'], status: 'Running', grad: 'from-fuchsia-500 to-pink-600' },
  { id: 't2', title: 'Market sizing analysis', priority: 'High', agent: 'Aria', eta: '1h 20m', deps: ['Sources loaded'], status: 'Running', grad: 'from-violet-500 to-indigo-600' },
  { id: 't3', title: 'Answer ticket #4813', priority: 'Medium', agent: 'Cody', eta: '8m', deps: [], status: 'Queued', grad: 'from-cyan-500 to-blue-600' },
  { id: 't4', title: 'Reconcile invoices', priority: 'Medium', agent: 'Finn', eta: '30m', deps: ['CSV export'], status: 'Waiting', grad: 'from-amber-500 to-orange-600' },
  { id: 't5', title: 'Review PR #285', priority: 'Low', agent: 'Devon', eta: '20m', deps: ['CI green'], status: 'Queued', grad: 'from-emerald-500 to-teal-600' },
  { id: 't6', title: 'Build brand guidelines doc', priority: 'Low', agent: 'Iris', eta: '2h', deps: [], status: 'Completed', grad: 'from-rose-500 to-red-600' },
  { id: 't7', title: 'Deploy hotfix v2.4.1', priority: 'High', agent: 'Leo', eta: '15m', deps: ['Approval'], status: 'Failed', grad: 'from-lime-500 to-emerald-600' },
  { id: 't8', title: 'Weekly social report', priority: 'Low', agent: 'Nora', eta: '1h', deps: [], status: 'Cancelled', grad: 'from-violet-500 to-fuchsia-600' },
];

export const TASK_STATUS_STYLE = {
  Queued: 'bg-white/5 text-zinc-400', Running: 'bg-emerald-400/10 text-emerald-400',
  Waiting: 'bg-amber-400/10 text-amber-400', Completed: 'bg-violet-400/10 text-violet-300',
  Failed: 'bg-rose-400/10 text-rose-400', Cancelled: 'bg-white/5 text-zinc-500',
};
export const PRIORITY_STYLE = {
  High: 'bg-rose-400/10 text-rose-400', Medium: 'bg-amber-400/10 text-amber-400', Low: 'bg-white/5 text-zinc-400',
};

export const TEAMS = [
  { name: 'Website Team', members: ['Devon', 'Iris', 'Leo'], goal: 'Ship marketing site v3', progress: 72, status: 'Active', grad: 'from-violet-500 to-indigo-600' },
  { name: 'Marketing Team', members: ['Mia', 'Nora', 'Aria'], goal: 'Q3 launch campaign', progress: 58, status: 'Active', grad: 'from-fuchsia-500 to-pink-600' },
  { name: 'Research Team', members: ['Aria', 'Finn'], goal: 'AI market sizing', progress: 84, status: 'Busy', grad: 'from-cyan-500 to-blue-600' },
  { name: 'Sales Team', members: ['Quota', 'Lead Bot'], goal: 'Enrich 200 leads', progress: 41, status: 'Active', grad: 'from-blue-500 to-indigo-600' },
  { name: 'Software Team', members: ['Devon', 'Leo'], goal: 'Release v2.4.1', progress: 90, status: 'Review', grad: 'from-emerald-500 to-cyan-600' },
  { name: 'Customer Support Team', members: ['Cody', 'Tier-1 Bot'], goal: '<2h first response', progress: 96, status: 'On track', grad: 'from-emerald-500 to-teal-600' },
  { name: 'Finance Team', members: ['Finn', 'Aria'], goal: 'Q3 close books', progress: 33, status: 'Planning', grad: 'from-amber-500 to-orange-600' },
];

export const PERF_ANALYTICS = [
  { label: 'Time Saved', value: '412h', sub: 'this quarter', icon: Clock, color: 'from-cyan-500 to-blue-600' },
  { label: 'Money Saved', value: '£84k', sub: 'this quarter', icon: PiggyBank, color: 'from-emerald-500 to-teal-600' },
  { label: 'Most Active Dept', value: 'Sales', sub: '88% utilisation', icon: TrendingUp, color: 'from-violet-500 to-fuchsia-600' },
  { label: 'Top Performing Agent', value: 'Cody', sub: '96% success', icon: CheckCircle2, color: 'from-amber-500 to-orange-600' },
  { label: 'Lowest Response Time', value: '1.2s', sub: 'Support Lead', icon: Activity, color: 'from-rose-500 to-red-600' },
  { label: 'Task Success Rate', value: '94%', sub: '+3% vs last week', icon: Gauge, color: 'from-blue-500 to-indigo-600' },
];

export const PERF_SERIES = [
  { d: 'Mon', productivity: 78, success: 90 }, { d: 'Tue', productivity: 84, success: 92 },
  { d: 'Wed', productivity: 80, success: 88 }, { d: 'Thu', productivity: 90, success: 94 },
  { d: 'Fri', productivity: 92, success: 96 }, { d: 'Sat', productivity: 74, success: 91 },
  { d: 'Sun', productivity: 70, success: 89 },
];

export const NOTIFICATIONS = [
  { text: 'Sales department workload at 88%', time: '5m', kind: 'warn' },
  { text: 'Leo completed pipeline backfill', time: '12m', kind: 'ok' },
  { text: 'Hotfix v2.4.1 failed — approval needed', time: '18m', kind: 'error' },
  { text: '3 new tasks assigned to Research', time: '1h', kind: 'info' },
];

export const RECOMMENDATIONS = [
  { text: 'Add a second Support agent to cover peak hours', icon: 'support' },
  { text: 'Reassign 4 queued tasks from Sales to Marketing', icon: 'balance' },
  { text: 'Enable long-term memory on Growth Writer', icon: 'memory' },
  { text: 'Schedule Finance Agent for nightly reconciliation', icon: 'schedule' },
];

export const SUGGESTIONS = [
  { text: 'Create a dedicated Onboarding Team', icon: 'team' },
  { text: 'Connect Notion to Research Department', icon: 'plug' },
  { text: 'Train a QA Reviewer on brand guidelines', icon: 'train' },
];

export const QUICK_ACTIONS = [
  'Create Agent', 'Create Department', 'Assign Task', 'Start Workforce', 'Pause Workforce', 'Import Agents', 'Export Workforce',
];