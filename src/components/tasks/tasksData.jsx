import {
  Activity, AlertTriangle, Bot, Calendar, CheckCircle2, Clock, Copy,
  FileText, GitBranch, ListChecks, Mail, Pause, Play, Sparkles, ThumbsUp,
  Workflow, Zap,
} from 'lucide-react';

// ---------- Priorities ----------
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'Background'];
export const PRIORITY_STYLE = {
  Critical: { dot: 'bg-rose-500', text: 'text-rose-400', chip: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  High: { dot: 'bg-orange-500', text: 'text-orange-400', chip: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  Medium: { dot: 'bg-amber-500', text: 'text-amber-400', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  Low: { dot: 'bg-sky-500', text: 'text-sky-400', chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  Background: { dot: 'bg-zinc-500', text: 'text-zinc-400', chip: 'bg-white/5 text-zinc-400 border-white/10' },
};

// ---------- Statuses ----------
export const STATUSES = ['To Do', 'Queued', 'Running', 'Waiting', 'Review', 'Completed', 'Failed', 'Cancelled'];
export const STATUS_STYLE = {
  'To Do': { text: 'text-zinc-400', chip: 'bg-white/5 text-zinc-300 border-white/10', icon: ListChecks },
  'Queued': { text: 'text-zinc-400', chip: 'bg-white/5 text-zinc-300 border-white/10', icon: Clock },
  'Running': { text: 'text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', icon: Play },
  'Waiting': { text: 'text-amber-400', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Pause },
  'Review': { text: 'text-violet-400', chip: 'bg-violet-500/10 text-violet-300 border-violet-500/30', icon: ThumbsUp },
  'Completed': { text: 'text-cyan-400', chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30', icon: CheckCircle2 },
  'Failed': { text: 'text-rose-400', chip: 'bg-rose-500/10 text-rose-300 border-rose-500/30', icon: AlertTriangle },
  'Cancelled': { text: 'text-zinc-500', chip: 'bg-white/5 text-zinc-500 border-white/10', icon: AlertTriangle },
};
export const KANBAN_COLUMNS = ['To Do', 'Queued', 'Running', 'Waiting', 'Review', 'Completed', 'Failed', 'Cancelled'];

// ---------- Filters ----------
export const DEPARTMENTS = ['Engineering', 'Marketing', 'Research', 'Finance', 'Operations', 'Customer Success', 'Sales', 'Product'];
export const AGENTS = ['Research Analyst', 'Marketing Agent', 'Finance Agent', 'Developer Agent', 'Support Agent', 'Content Writer', 'Data Scientist', 'Lead Scout'];
export const TEAMS = ['Growth', 'Core Platform', 'Insights', 'Revenue Ops', 'Support Pod', 'Content Lab'];
export const PROJECTS = ['Website Build', 'Marketing Campaign', 'Research Project', 'Customer Support', 'Lead Generation', 'Content Creation', 'Finance Reporting', 'Software Deployment'];
export const MODELS = ['GPT-5', 'Claude Opus', 'Gemini Pro', 'Llama 3', 'Mixtral'];
export const CATEGORIES = ['Research', 'Content', 'Engineering', 'Analytics', 'Outreach', 'Reporting', 'QA', 'DevOps'];
export const TAGS = ['priority', 'automated', 'recurring', 'client', 'internal', 'beta', 'p0', 'experiment'];

// ---------- Overview metrics ----------
export const OVERVIEW_METRICS = [
  { key: 'total', label: 'Total Tasks', value: 248, sub: '+12 this week', grad: 'from-violet-500 to-indigo-500', icon: ListChecks, trend: [12, 18, 14, 22, 19, 26, 24] },
  { key: 'running', label: 'Running Tasks', value: 34, sub: '6 agents active', grad: 'from-emerald-500 to-teal-500', icon: Activity, trend: [4, 9, 7, 12, 10, 14, 34] },
  { key: 'completedToday', label: 'Completed Today', value: 47, sub: '+18% vs avg', grad: 'from-cyan-500 to-sky-500', icon: CheckCircle2, trend: [10, 14, 12, 20, 24, 30, 47] },
  { key: 'failed', label: 'Failed Tasks', value: 6, sub: '2 need review', grad: 'from-rose-500 to-orange-500', icon: AlertTriangle, trend: [3, 1, 4, 2, 5, 3, 6] },
  { key: 'scheduled', label: 'Scheduled Tasks', value: 28, sub: 'next 7 days', grad: 'from-amber-500 to-yellow-500', icon: Calendar, trend: [5, 8, 6, 10, 12, 9, 28] },
  { key: 'pendingApproval', label: 'Pending Approval', value: 9, sub: 'awaiting review', grad: 'from-fuchsia-500 to-pink-500', icon: ThumbsUp, trend: [2, 3, 5, 4, 6, 7, 9] },
  { key: 'successRate', label: 'Automation Success', value: '96.4%', sub: '+1.2% MoM', grad: 'from-teal-500 to-emerald-500', icon: Zap, trend: [92, 93, 91, 94, 95, 94, 96] },
  { key: 'avgTime', label: 'Avg Completion', value: '3.4h', sub: '-22m vs last wk', grad: 'from-indigo-500 to-violet-500', icon: Clock, trend: [5, 4.8, 4.5, 4.2, 4, 3.8, 3.4] },
];

// ---------- Tasks ----------
export const TASKS = [
  {
    id: 'task-001', name: 'Compile Q3 market intelligence report', description: 'Aggregate competitor pricing, feature gaps and sentiment across 12 vendors into a decision-ready briefing.',
    instructions: '1. Pull vendor data via Web tool\n2. Cross-reference CRM notes\n3. Score each vendor\n4. Draft executive summary',
    priority: 'Critical', agent: 'Research Analyst', team: 'Insights', department: 'Research', status: 'Running',
    progress: 62, startDate: '2026-08-03', dueDate: '2026-08-07', estCompletion: '2026-08-07 18:00', actualCompletion: null,
    category: 'Research', project: 'Research Project', model: 'Claude Opus', tools: ['Web', 'Docs', 'Sheets'], tags: ['priority', 'client'],
    dependencies: [], approvals: [{ who: 'Maya R.', status: 'Approved', at: '2026-08-03 10:12' }],
    files: [{ name: 'vendor_matrix.xlsx', size: '42 KB' }, { name: 'sentiment_raw.csv', size: '1.2 MB' }],
    comments: [{ who: 'Maya R.', text: 'Add a SWOT section please', at: '2h ago' }],
    timeline: [{ t: '2026-08-03 09:00', label: 'Task created' }, { t: '2026-08-03 10:12', label: 'Approved by Maya R.' }, { t: '2026-08-04 08:30', label: 'Research started' }],
    activity: [{ t: '4m ago', text: 'Research Analyst gathered 38 sources' }, { t: '1h ago', text: 'Draft outline saved' }],
    outputs: [{ name: 'Q3 Briefing (draft).docx', url: '#' }], logs: 'INFO fetch vendor=ok\nINFO sentiment score=0.72\nWARN 2 sources timed out, retried',
  },
  {
    id: 'task-002', name: 'Launch multi-channel campaign: Autumn release', description: 'Coordinate email, social and landing page assets for the Autumn product release across 4 segments.',
    instructions: 'Align copy with brand kit. Schedule 3 email waves. Sync social calendar.',
    priority: 'High', agent: 'Marketing Agent', team: 'Growth', department: 'Marketing', status: 'Queued',
    progress: 0, startDate: '2026-08-06', dueDate: '2026-08-20', estCompletion: '2026-08-19 17:00', actualCompletion: null,
    category: 'Outreach', project: 'Marketing Campaign', model: 'GPT-5', tools: ['Email', 'Web', 'Docs'], tags: ['automated', 'recurring'],
    dependencies: ['task-003'], approvals: [{ who: 'Devon K.', status: 'Pending', at: '2026-08-06 14:00' }],
    files: [{ name: 'brand_kit.pdf', size: '8.4 MB' }], comments: [],
    timeline: [{ t: '2026-08-06 09:00', label: 'Task created' }], activity: [{ t: '20m ago', text: 'Queued behind approval' }],
    outputs: [], logs: 'INFO waiting on approval',
  },
  {
    id: 'task-003', name: 'Generate campaign landing page copy', description: 'Write hero, feature and CTA copy variants for A/B testing on the release landing page.',
    instructions: '3 hero variants, 2 CTA variants. Keep reading level grade 8.',
    priority: 'High', agent: 'Content Writer', team: 'Growth', department: 'Marketing', status: 'Running',
    progress: 45, startDate: '2026-08-05', dueDate: '2026-08-08', estCompletion: '2026-08-08 12:00', actualCompletion: null,
    category: 'Content', project: 'Marketing Campaign', model: 'GPT-5', tools: ['Docs'], tags: ['beta'],
    dependencies: [], approvals: [], files: [], comments: [{ who: 'Priya S.', text: 'Variant B is strongest', at: '3h ago' }],
    timeline: [{ t: '2026-08-05 11:00', label: 'Task created' }, { t: '2026-08-05 11:10', label: 'Drafting started' }],
    activity: [{ t: '8m ago', text: 'Generated 3 hero variants' }], outputs: [], logs: 'INFO draft v3 saved',
  },
  {
    id: 'task-004', name: 'Reconcile monthly invoicing anomalies', description: 'Detect and explain billing discrepancies across 3 payment gateways for July.',
    instructions: 'Flag >5% variance. Generate correction batches for finance lead.',
    priority: 'Critical', agent: 'Finance Agent', team: 'Revenue Ops', department: 'Finance', status: 'Review',
    progress: 88, startDate: '2026-08-01', dueDate: '2026-08-06', estCompletion: '2026-08-06 16:00', actualCompletion: null,
    category: 'Reporting', project: 'Finance Reporting', model: 'Claude Opus', tools: ['Sheets', 'Docs'], tags: ['internal', 'priority'],
    dependencies: [], approvals: [{ who: 'Sam L.', status: 'Pending', at: '2026-08-06 15:40' }],
    files: [{ name: 'july_ledger.csv', size: '3.1 MB' }], comments: [],
    timeline: [{ t: '2026-08-01 09:00', label: 'Task created' }, { t: '2026-08-02 09:00', label: 'Reconciliation started' }, { t: '2026-08-06 15:40', label: 'Sent for review' }],
    activity: [{ t: '30m ago', text: '14 anomalies flagged' }], outputs: [{ name: 'anomaly_report.xlsx', url: '#' }], logs: 'INFO processed 4,210 rows\nWARN 14 anomalies',
  },
  {
    id: 'task-005', name: 'Deploy auth service v2.4 to staging', description: 'Ship the refreshed authentication service to staging with zero-downtime rollout and smoke tests.',
    instructions: 'Run CI. Canary 10%. Validate tokens. Promote on green.',
    priority: 'High', agent: 'Developer Agent', team: 'Core Platform', department: 'Engineering', status: 'Running',
    progress: 71, startDate: '2026-08-06', dueDate: '2026-08-07', estCompletion: '2026-08-07 09:00', actualCompletion: null,
    category: 'DevOps', project: 'Software Deployment', model: 'Llama 3', tools: ['GitHub', 'Terminal'], tags: ['p0'],
    dependencies: ['task-006'], approvals: [], files: [{ name: 'deploy.yaml', size: '6 KB' }], comments: [],
    timeline: [{ t: '2026-08-06 07:00', label: 'CI started' }, { t: '2026-08-06 07:40', label: 'Canary 10%' }],
    activity: [{ t: '2m ago', text: 'Canary healthy, promoting to 50%' }], outputs: [], logs: 'INFO canary ok\nINFO promoting 50%',
  },
  {
    id: 'task-006', name: 'Run auth regression suite', description: 'Execute the full auth regression pack and report failures with repro steps.',
    instructions: '1,240 tests. Capture video on fail.',
    priority: 'Medium', agent: 'Developer Agent', team: 'Core Platform', department: 'Engineering', status: 'Completed',
    progress: 100, startDate: '2026-08-05', dueDate: '2026-08-06', estCompletion: '2026-08-06 06:00', actualCompletion: '2026-08-06 05:48',
    category: 'QA', project: 'Software Deployment', model: 'Llama 3', tools: ['GitHub', 'Terminal'], tags: ['automated'],
    dependencies: [], approvals: [], files: [{ name: 'report.html', size: '420 KB' }], comments: [],
    timeline: [{ t: '2026-08-05 22:00', label: 'Suite started' }, { t: '2026-08-06 05:48', label: 'Suite passed (1,240/1,240)' }],
    activity: [{ t: '5h ago', text: 'All tests green' }], outputs: [{ name: 'regression_report.html', url: '#' }], logs: 'PASS 1240/1240',
  },
  {
    id: 'task-007', name: 'Answer tier-1 support tickets (overnight batch)', description: 'Resolve routine tickets, escalate edge cases to human agents with context.',
    instructions: 'Keep CSAT >4.5. Escalate billing and security.',
    priority: 'Medium', agent: 'Support Agent', team: 'Support Pod', department: 'Customer Success', status: 'Running',
    progress: 54, startDate: '2026-08-06', dueDate: '2026-08-07', estCompletion: '2026-08-07 08:00', actualCompletion: null,
    category: 'Support', project: 'Customer Support', model: 'Gemini Pro', tools: ['Email', 'Docs'], tags: ['recurring', 'automated'],
    dependencies: [], approvals: [], files: [], comments: [{ who: 'Leo M.', text: 'Great response times', at: '1h ago' }],
    timeline: [{ t: '2026-08-06 00:00', label: 'Batch started' }], activity: [{ t: '6m ago', text: 'Resolved 31 tickets' }],
    outputs: [], logs: 'INFO resolved=31 escalated=4',
  },
  {
    id: 'task-008', name: 'Enrich 500 inbound leads with firmographics', description: 'Append company size, industry and intent score to new leads from the August webinar.',
    instructions: 'Dedupe by domain. Score 0-100. Route >70 to sales.',
    priority: 'High', agent: 'Lead Scout', team: 'Revenue Ops', department: 'Sales', status: 'Queued',
    progress: 0, startDate: '2026-08-06', dueDate: '2026-08-09', estCompletion: '2026-08-08 18:00', actualCompletion: null,
    category: 'Outreach', project: 'Lead Generation', model: 'GPT-5', tools: ['Web', 'Sheets'], tags: ['client'],
    dependencies: [], approvals: [], files: [{ name: 'webinar_leads.csv', size: '220 KB' }], comments: [],
    timeline: [{ t: '2026-08-06 10:00', label: 'Task created' }], activity: [{ t: '1h ago', text: 'Awaiting free agent' }],
    outputs: [], logs: 'INFO queued',
  },
  {
    id: 'task-009', name: 'Draft blog: "Designing autonomous agent teams"', description: 'Long-form thought leadership piece on team topology for agent swarms.',
    instructions: '2,000 words. Include 2 diagrams. SEO target: agent orchestration.',
    priority: 'Low', agent: 'Content Writer', team: 'Content Lab', department: 'Marketing', status: 'To Do',
    progress: 0, startDate: '2026-08-07', dueDate: '2026-08-12', estCompletion: '2026-08-11 17:00', actualCompletion: null,
    category: 'Content', project: 'Content Creation', model: 'GPT-5', tools: ['Docs', 'Web'], tags: ['experiment'],
    dependencies: [], approvals: [], files: [], comments: [],
    timeline: [{ t: '2026-08-06 09:30', label: 'Task created' }], activity: [], outputs: [], logs: '',
  },
  {
    id: 'task-010', name: 'Triage nightly anomaly alerts', description: 'Review model drift and data-quality alerts, file tickets for anything above threshold.',
    instructions: 'Group by service. Attach dashboards.',
    priority: 'Medium', agent: 'Data Scientist', team: 'Insights', department: 'Operations', status: 'Waiting',
    progress: 33, startDate: '2026-08-06', dueDate: '2026-08-07', estCompletion: '2026-08-07 07:00', actualCompletion: null,
    category: 'Analytics', project: 'Research Project', model: 'Gemini Pro', tools: ['Sheets', 'Terminal'], tags: ['internal'],
    dependencies: [], approvals: [{ who: 'Maya R.', status: 'Pending', at: '2026-08-06 12:00' }], files: [], comments: [],
    timeline: [{ t: '2026-08-06 06:00', label: 'Triage started' }, { t: '2026-08-06 12:00', label: 'Paused for approval' }],
    activity: [{ t: '40m ago', text: 'Waiting on approval' }], outputs: [], logs: 'INFO paused',
  },
  {
    id: 'task-011', name: 'Generate monthly board KPI deck', description: 'Auto-assemble the board metrics deck from BI sources with narrative commentary.',
    instructions: '12 slides. Include MoM and YoY deltas.',
    priority: 'High', agent: 'Data Scientist', team: 'Insights', department: 'Finance', status: 'Completed',
    progress: 100, startDate: '2026-08-02', dueDate: '2026-08-05', estCompletion: '2026-08-05 16:00', actualCompletion: '2026-08-05 15:30',
    category: 'Reporting', project: 'Finance Reporting', model: 'Claude Opus', tools: ['Sheets', 'Docs'], tags: ['recurring', 'internal'],
    dependencies: [], approvals: [{ who: 'Sam L.', status: 'Approved', at: '2026-08-05 16:10' }], files: [{ name: 'board_deck.pdf', size: '5.6 MB' }],
    comments: [{ who: 'Sam L.', text: 'Approved, great work', at: '6h ago' }],
    timeline: [{ t: '2026-08-02 09:00', label: 'Created' }, { t: '2026-08-05 15:30', label: 'Draft complete' }, { t: '2026-08-05 16:10', label: 'Approved' }],
    activity: [{ t: '6h ago', text: 'Deck approved' }], outputs: [{ name: 'board_deck.pdf', url: '#' }], logs: 'INFO generated 12 slides',
  },
  {
    id: 'task-012', name: 'Refactor billing service to event-driven model', description: 'Migrate the monolithic billing job to an event-driven architecture with idempotent consumers.',
    instructions: 'Split handlers. Add outbox. Backfill 30 days.',
    priority: 'Critical', agent: 'Developer Agent', team: 'Core Platform', department: 'Engineering', status: 'Failed',
    progress: 38, startDate: '2026-08-04', dueDate: '2026-08-06', estCompletion: '2026-08-06 20:00', actualCompletion: null,
    category: 'Engineering', project: 'Software Deployment', model: 'Llama 3', tools: ['GitHub', 'Terminal'], tags: ['p0', 'internal'],
    dependencies: [], approvals: [], files: [], comments: [{ who: 'Devon K.', text: 'Backfill crashed at row 84k', at: '2h ago' }],
    timeline: [{ t: '2026-08-04 09:00', label: 'Started' }, { t: '2026-08-06 19:40', label: 'Backfill failed' }],
    activity: [{ t: '2h ago', text: 'Backfill OOM at row 84,210' }], outputs: [], logs: 'ERROR backfill OOM at row 84210',
  },
  {
    id: 'task-013', name: 'Schedule social calendar — September', description: 'Plan 4 weeks of organic social posts aligned to campaigns and launches.',
    instructions: '3 posts/day. Mix formats.',
    priority: 'Low', agent: 'Marketing Agent', team: 'Growth', department: 'Marketing', status: 'Scheduled',
    progress: 0, startDate: '2026-08-10', dueDate: '2026-08-30', estCompletion: '2026-08-12 17:00', actualCompletion: null,
    category: 'Content', project: 'Marketing Campaign', model: 'GPT-5', tools: ['Docs', 'Web'], tags: ['recurring'],
    dependencies: [], approvals: [], files: [], comments: [],
    timeline: [{ t: '2026-08-06 09:00', label: 'Scheduled for 2026-08-10' }], activity: [], outputs: [], logs: '',
  },
  {
    id: 'task-014', name: 'Audit agent permission scopes', description: 'Review all active agent tool scopes and flag over-privileged grants.',
    instructions: 'Least privilege. Document exceptions.',
    priority: 'Background', agent: 'Data Scientist', team: 'Insights', department: 'Operations', status: 'To Do',
    progress: 0, startDate: '2026-08-08', dueDate: '2026-08-14', estCompletion: '2026-08-13 17:00', actualCompletion: null,
    category: 'QA', project: 'Research Project', model: 'Gemini Pro', tools: ['Terminal', 'Docs'], tags: ['internal'],
    dependencies: [], approvals: [], files: [], comments: [],
    timeline: [{ t: '2026-08-06 08:00', label: 'Task created' }], activity: [], outputs: [], logs: '',
  },
  {
    id: 'task-015', name: 'Onboard new vendor: Acme Analytics', description: 'Provision API keys, configure webhook routes and run smoke integration.',
    instructions: 'Rotate keys after test.',
    priority: 'Medium', agent: 'Developer Agent', team: 'Core Platform', department: 'Engineering', status: 'Cancelled',
    progress: 12, startDate: '2026-08-01', dueDate: '2026-08-05', estCompletion: '2026-08-05 17:00', actualCompletion: null,
    category: 'DevOps', project: 'Software Deployment', model: 'Llama 3', tools: ['Terminal', 'GitHub'], tags: ['client'],
    dependencies: [], approvals: [], files: [], comments: [{ who: 'Devon K.', text: 'Vendor paused contract', at: '1d ago' }],
    timeline: [{ t: '2026-08-01 09:00', label: 'Created' }, { t: '2026-08-03 09:00', label: 'Cancelled by vendor' }],
    activity: [{ t: '1d ago', text: 'Cancelled' }], outputs: [], logs: 'INFO cancelled',
  },
];

// ---------- Tabs ----------
export const TASK_TABS = [
  { key: 'all', label: 'All Tasks' },
  { key: 'mine', label: 'My Tasks' },
  { key: 'Running', label: 'Running' },
  { key: 'Queued', label: 'Queued' },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Failed', label: 'Failed' },
  { key: 'Archived', label: 'Archived' },
];

// ---------- Workflows ----------
export const WORKFLOWS = [
  { name: 'Website Build', team: 'Core Platform', tasks: 18, progress: 64, due: '2026-08-22', grad: 'from-violet-500 to-indigo-500', icon: Workflow },
  { name: 'Marketing Campaign', team: 'Growth', tasks: 24, progress: 41, due: '2026-08-20', grad: 'from-fuchsia-500 to-pink-500', icon: Mail },
  { name: 'Research Project', team: 'Insights', tasks: 12, progress: 58, due: '2026-08-18', grad: 'from-cyan-500 to-sky-500', icon: GitBranch },
  { name: 'Customer Support', team: 'Support Pod', tasks: 40, progress: 86, due: 'ongoing', grad: 'from-emerald-500 to-teal-500', icon: Bot },
  { name: 'Lead Generation', team: 'Revenue Ops', tasks: 9, progress: 22, due: '2026-08-09', grad: 'from-amber-500 to-orange-500', icon: Zap },
  { name: 'Content Creation', team: 'Content Lab', tasks: 16, progress: 35, due: '2026-08-25', grad: 'from-rose-500 to-pink-500', icon: FileText },
  { name: 'Finance Reporting', team: 'Revenue Ops', tasks: 7, progress: 90, due: '2026-08-06', grad: 'from-teal-500 to-emerald-500', icon: ListChecks },
  { name: 'Software Deployment', team: 'Core Platform', tasks: 11, progress: 67, due: '2026-08-07', grad: 'from-indigo-500 to-violet-500', icon: GitBranch },
];

// ---------- Automations ----------
export const AUTOMATIONS = [
  { trigger: 'When task finishes', action: 'Assign next task', grad: 'from-emerald-500 to-teal-500', icon: CheckCircle2, active: true, runs: 1284 },
  { trigger: 'When task fails', action: 'Notify manager', grad: 'from-rose-500 to-orange-500', icon: AlertTriangle, active: true, runs: 46 },
  { trigger: 'When deadline missed', action: 'Escalate priority', grad: 'from-amber-500 to-yellow-500', icon: Clock, active: true, runs: 18 },
  { trigger: 'When approved', action: 'Continue workflow', grad: 'from-violet-500 to-indigo-500', icon: ThumbsUp, active: true, runs: 312 },
  { trigger: 'When duplicate detected', action: 'Merge tasks', grad: 'from-cyan-500 to-sky-500', icon: Copy, active: false, runs: 9 },
  { trigger: 'When queue idle', action: 'Auto-pull from backlog', grad: 'from-fuchsia-500 to-pink-500', icon: Sparkles, active: true, runs: 76 },
];

// ---------- Activity ----------
export const ACTIVITY = [
  { agent: 'Research Agent', text: 'completed "Compile Q3 market intelligence report"', color: 'text-cyan-400', at: '2m ago', icon: CheckCircle2 },
  { agent: 'Marketing Agent', text: 'started campaign "Autumn release"', color: 'text-fuchsia-400', at: '12m ago', icon: Play },
  { agent: 'Finance Agent', text: 'generated "Monthly board KPI deck"', color: 'text-emerald-400', at: '40m ago', icon: FileText },
  { agent: 'Developer Agent', text: 'deployed "auth service v2.4" to staging', color: 'text-violet-400', at: '1h ago', icon: GitBranch },
  { agent: 'Support Agent', text: 'answered 31 tier-1 tickets', color: 'text-sky-400', at: '2h ago', icon: Bot },
  { agent: 'Lead Scout', text: 'enriched 220 leads with firmographics', color: 'text-amber-400', at: '3h ago', icon: Zap },
];

// ---------- Notifications ----------
export const NOTIFICATIONS = [
  { kind: 'approval', title: '2 approvals required', body: 'Campaign launch & finance reconciliation awaiting review', color: 'text-fuchsia-400', icon: ThumbsUp },
  { kind: 'failure', title: 'Backfill failed', body: 'Billing refactor crashed at row 84k — needs attention', color: 'text-rose-400', icon: AlertTriangle },
  { kind: 'done', title: 'Regression suite passed', body: '1,240/1,240 tests green for auth v2.4', color: 'text-cyan-400', icon: CheckCircle2 },
  { kind: 'deadline', title: '3 deadlines this week', body: 'Research briefing, deploy cutover, board deck', color: 'text-amber-400', icon: Clock },
  { kind: 'rec', title: 'Recommendation', body: 'Reassign idle Developer Agent to backfill retry', color: 'text-violet-400', icon: Sparkles },
];

// ---------- AI Recommendations ----------
export const RECOMMENDATIONS = [
  { text: 'Merge 3 duplicate lead-enrichment tasks into a batched run.', icon: Copy, grad: 'from-violet-500 to-indigo-500' },
  { text: 'Assign 2 more agents to the Marketing Campaign to hit the Aug 20 deadline.', icon: Bot, grad: 'from-fuchsia-500 to-pink-500' },
  { text: 'Split the billing refactor into backfill + cutover sub-tasks.', icon: GitBranch, grad: 'from-cyan-500 to-sky-500' },
  { text: 'Optimise task order: run regression before canary promotion.', icon: Zap, grad: 'from-amber-500 to-orange-500' },
];

// ---------- Calendar ----------
export const CALENDAR_EVENTS = TASKS.filter(t => t.startDate).map(t => ({
  id: t.id, title: t.name, date: t.dueDate, start: t.startDate, priority: t.priority, status: t.status,
}));

// ---------- Empty state ----------
export const EMPTY_ILLUSTRATION = 'tasks';