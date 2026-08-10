// Mock data for the Tasks & Jobs page. Placeholder only — backend ready.
import {
  ListChecks, Activity, CheckCircle2, AlertTriangle, Clock, Bot, FileText,
  Globe, Wrench, Mail, Calendar, Database, Terminal, Github, Send, MessageSquare,
  Play, Pause, Brain, Cpu, UserCheck,
} from 'lucide-react';

export const STATUSES = ['Backlog', 'Queued', 'Running', 'Waiting', 'Review', 'Completed', 'Failed', 'Cancelled'];

export const STATUS_STYLE = {
  Backlog: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5', icon: ListChecks },
  Queued: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-400/10', icon: Clock },
  Running: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Play },
  Waiting: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10', icon: Pause },
  Review: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-400/10', icon: UserCheck },
  Completed: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: CheckCircle2 },
  Failed: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10', icon: AlertTriangle },
  Cancelled: { dot: 'bg-zinc-600', text: 'text-zinc-500', bg: 'bg-white/5', icon: AlertTriangle },
};

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PRIORITY_STYLE = {
  Low: 'bg-white/5 text-zinc-400',
  Medium: 'bg-sky-400/10 text-sky-400',
  High: 'bg-amber-400/10 text-amber-400',
  Urgent: 'bg-rose-400/10 text-rose-400',
};

export const TOOL_ICON = {
  'Web Search': Globe, 'Code Execution': Wrench, Terminal: Terminal, Files: FileText,
  Database: Database, 'HTTP Requests': Send, Email: Mail, Calendar: Calendar, GitHub: Github, Slack: MessageSquare,
};

export const VIEWS = [
  { id: 'list', label: 'List', icon: ListChecks },
  { id: 'kanban', label: 'Kanban', icon: Activity },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

export const DETAIL_TABS = [
  { id: 'instructions', label: 'Instructions' },
  { id: 'agent', label: 'Agent' },
  { id: 'tools', label: 'Tools Used' },
  { id: 'files', label: 'Files' },
  { id: 'activity', label: 'Activity' },
  { id: 'logs', label: 'Logs' },
  { id: 'results', label: 'Results' },
  { id: 'comments', label: 'Comments' },
  { id: 'approvals', label: 'Approvals' },
];

const LIVE_STEPS = ['Task Started', 'Agent Thinking', 'Tool Called', 'Tool Result', 'Agent Continuing', 'Task Completed'];

function liveFor(status) {
  // Map a task status to live-execution step states.
  if (status === 'Completed') return LIVE_STEPS.map((s) => ({ label: s, state: 'done' }));
  if (status === 'Failed') return LIVE_STEPS.map((s, i) => ({ label: s, state: i < 2 ? 'done' : i === 2 ? 'error' : 'pending' }));
  if (status === 'Cancelled') return LIVE_STEPS.map((s) => ({ label: s, state: 'pending' }));
  if (status === 'Running') return LIVE_STEPS.map((s, i) => ({ label: s, state: i < 2 ? 'done' : i === 2 ? 'active' : 'pending' }));
  if (status === 'Waiting') return LIVE_STEPS.map((s, i) => ({ label: s, state: i < 3 ? 'done' : 'pending' }));
  if (status === 'Review') return LIVE_STEPS.map((s, i) => ({ label: s, state: i < 5 ? 'done' : 'pending' }));
  return LIVE_STEPS.map((s) => ({ label: s, state: 'pending' }));
}

export const TASKS = [
  {
    id: 't-101', title: 'Compile Q3 market intelligence report', description: 'Aggregate competitor pricing, feature gaps and sentiment across 12 vendors into a decision-ready briefing.',
    project: 'Research Project', agent: 'Aria', agentRole: 'Research Analyst', owner: 'Maya R.', priority: 'Urgent', status: 'Running',
    dueDate: '2026-08-09', created: '2026-08-03', updated: '2m ago', progress: 62,
    model: 'Claude Sonnet 4.6',
    instructions: '1. Pull vendor data via Web Search\n2. Cross-reference CRM notes\n3. Score each vendor 0–100\n4. Draft executive summary with citations',
    tools: ['Web Search', 'Files', 'Slack'],
    files: [{ name: 'vendor_matrix.xlsx', size: '42 KB' }, { name: 'sentiment_raw.csv', size: '1.2 MB' }],
    activity: [{ t: '2m ago', text: 'Gathered 38 sources' }, { t: '1h ago', text: 'Draft outline saved' }, { t: '4h ago', text: 'Task started' }],
    logs: 'INFO fetch vendor=ok\nINFO sentiment score=0.72\nWARN 2 sources timed out, retried',
    results: [{ name: 'Q3 Briefing (draft).docx', size: '210 KB' }],
    comments: [{ who: 'Maya R.', text: 'Add a SWOT section please', at: '2h ago' }, { who: 'Aria', text: 'On it — adding now', at: '1h ago' }],
    approvals: [{ who: 'Maya R.', status: 'Approved', at: '2026-08-03 10:12' }],
    live: liveFor('Running'),
  },
  {
    id: 't-102', title: 'Launch Autumn release campaign', description: 'Coordinate email, social and landing page assets for the Autumn release across 4 segments.',
    project: 'Marketing Campaign', agent: 'Mia', agentRole: 'Growth Writer', owner: 'Devon K.', priority: 'High', status: 'Queued',
    dueDate: '2026-08-20', created: '2026-08-06', updated: '20m ago', progress: 0,
    model: 'GPT-5',
    instructions: 'Align copy with brand kit. Schedule 3 email waves. Sync social calendar.',
    tools: ['Email', 'Files', 'Web Search'],
    files: [{ name: 'brand_kit.pdf', size: '8.4 MB' }],
    activity: [{ t: '20m ago', text: 'Queued behind approval' }, { t: '1d ago', text: 'Task created' }],
    logs: 'INFO waiting on approval',
    results: [],
    comments: [{ who: 'Devon K.', text: 'Approve before scheduling', at: '1h ago' }],
    approvals: [{ who: 'Devon K.', status: 'Pending', at: '2026-08-06 14:00' }],
    live: liveFor('Queued'),
  },
  {
    id: 't-103', title: 'Generate campaign landing page copy', description: 'Write hero, feature and CTA copy variants for A/B testing on the release landing page.',
    project: 'Marketing Campaign', agent: 'Mia', agentRole: 'Growth Writer', owner: 'Priya S.', priority: 'High', status: 'Running',
    dueDate: '2026-08-08', created: '2026-08-05', updated: '8m ago', progress: 45,
    model: 'GPT-5',
    instructions: '3 hero variants, 2 CTA variants. Keep reading level grade 8.',
    tools: ['Files'],
    files: [],
    activity: [{ t: '8m ago', text: 'Generated 3 hero variants' }, { t: '3h ago', text: 'Drafting started' }],
    logs: 'INFO draft v3 saved',
    results: [],
    comments: [{ who: 'Priya S.', text: 'Variant B is strongest', at: '3h ago' }],
    approvals: [],
    live: liveFor('Running'),
  },
  {
    id: 't-104', title: 'Reconcile monthly invoicing anomalies', description: 'Detect and explain billing discrepancies across 3 payment gateways for July.',
    project: 'Finance Reporting', agent: 'Finn', agentRole: 'Finance Analyst', owner: 'Sam L.', priority: 'Urgent', status: 'Review',
    dueDate: '2026-08-06', created: '2026-08-01', updated: '30m ago', progress: 88,
    model: 'GPT-5',
    instructions: 'Flag >5% variance. Generate correction batches for finance lead.',
    tools: ['Database', 'Files'],
    files: [{ name: 'july_ledger.csv', size: '3.1 MB' }],
    activity: [{ t: '30m ago', text: '14 anomalies flagged' }, { t: '2h ago', text: 'Sent for review' }],
    logs: 'INFO processed 4,210 rows\nWARN 14 anomalies',
    results: [{ name: 'anomaly_report.xlsx', size: '88 KB' }],
    comments: [],
    approvals: [{ who: 'Sam L.', status: 'Pending', at: '2026-08-06 15:40' }],
    live: liveFor('Review'),
  },
  {
    id: 't-105', title: 'Deploy auth service v2.4 to staging', description: 'Ship the refreshed authentication service to staging with zero-downtime rollout and smoke tests.',
    project: 'Software Deployment', agent: 'Devon', agentRole: 'Code Reviewer', owner: 'Devon K.', priority: 'High', status: 'Running',
    dueDate: '2026-08-07', created: '2026-08-06', updated: '2m ago', progress: 71,
    model: 'DeepSeek Coder',
    instructions: 'Run CI. Canary 10%. Validate tokens. Promote on green.',
    tools: ['GitHub', 'Terminal'],
    files: [{ name: 'deploy.yaml', size: '6 KB' }],
    activity: [{ t: '2m ago', text: 'Canary healthy, promoting to 50%' }, { t: '40m ago', text: 'Canary 10%' }],
    logs: 'INFO canary ok\nINFO promoting 50%',
    results: [],
    comments: [],
    approvals: [],
    live: liveFor('Running'),
  },
  {
    id: 't-106', title: 'Run auth regression suite', description: 'Execute the full auth regression pack and report failures with repro steps.',
    project: 'Software Deployment', agent: 'Leo', agentRole: 'Data Engineer', owner: 'Devon K.', priority: 'Medium', status: 'Completed',
    dueDate: '2026-08-06', created: '2026-08-05', updated: '5h ago', progress: 100,
    model: 'DeepSeek Coder',
    instructions: '1,240 tests. Capture video on fail.',
    tools: ['GitHub', 'Terminal'],
    files: [{ name: 'report.html', size: '420 KB' }],
    activity: [{ t: '5h ago', text: 'All tests green' }, { t: '8h ago', text: 'Suite started' }],
    logs: 'PASS 1240/1240',
    results: [{ name: 'regression_report.html', size: '420 KB' }],
    comments: [{ who: 'Devon K.', text: 'Nice work, promoting', at: '5h ago' }],
    approvals: [],
    live: liveFor('Completed'),
  },
  {
    id: 't-107', title: 'Answer tier-1 support tickets (overnight)', description: 'Resolve routine tickets, escalate edge cases to human agents with context.',
    project: 'Customer Support', agent: 'Cody', agentRole: 'Support Specialist', owner: 'Leo M.', priority: 'Medium', status: 'Running',
    dueDate: '2026-08-07', created: '2026-08-06', updated: '6m ago', progress: 54,
    model: 'Claude Sonnet 4.6',
    instructions: 'Keep CSAT >4.5. Escalate billing and security.',
    tools: ['Email', 'Files', 'Slack'],
    files: [],
    activity: [{ t: '6m ago', text: 'Resolved 31 tickets' }, { t: '6h ago', text: 'Batch started' }],
    logs: 'INFO resolved=31 escalated=4',
    results: [],
    comments: [{ who: 'Leo M.', text: 'Great response times', at: '1h ago' }],
    approvals: [],
    live: liveFor('Running'),
  },
  {
    id: 't-108', title: 'Enrich 500 inbound leads with firmographics', description: 'Append company size, industry and intent score to new leads from the August webinar.',
    project: 'Lead Generation', agent: 'Aria', agentRole: 'Research Analyst', owner: 'Sam L.', priority: 'High', status: 'Queued',
    dueDate: '2026-08-09', created: '2026-08-06', updated: '1h ago', progress: 0,
    model: 'Claude Sonnet 4.6',
    instructions: 'Dedupe by domain. Score 0-100. Route >70 to sales.',
    tools: ['Web Search', 'Database'],
    files: [{ name: 'webinar_leads.csv', size: '220 KB' }],
    activity: [{ t: '1h ago', text: 'Awaiting free agent' }, { t: '1d ago', text: 'Task created' }],
    logs: 'INFO queued',
    results: [],
    comments: [],
    approvals: [],
    live: liveFor('Queued'),
  },
  {
    id: 't-109', title: 'Refactor billing service to event-driven model', description: 'Migrate the monolithic billing job to an event-driven architecture with idempotent consumers.',
    project: 'Software Deployment', agent: 'Leo', agentRole: 'Data Engineer', owner: 'Devon K.', priority: 'Urgent', status: 'Failed',
    dueDate: '2026-08-06', created: '2026-08-04', updated: '2h ago', progress: 38,
    model: 'DeepSeek Coder',
    instructions: 'Split handlers. Add outbox. Backfill 30 days.',
    tools: ['GitHub', 'Terminal', 'Database'],
    files: [],
    activity: [{ t: '2h ago', text: 'Backfill OOM at row 84,210' }, { t: '1d ago', text: 'Started' }],
    logs: 'ERROR backfill OOM at row 84210',
    results: [],
    comments: [{ who: 'Devon K.', text: 'Backfill crashed at row 84k', at: '2h ago' }],
    approvals: [],
    live: liveFor('Failed'),
  },
  {
    id: 't-110', title: 'Draft blog: "Designing autonomous agent teams"', description: 'Long-form thought leadership piece on team topology for agent swarms.',
    project: 'Content Creation', agent: 'Mia', agentRole: 'Growth Writer', owner: 'Priya S.', priority: 'Low', status: 'Backlog',
    dueDate: '2026-08-12', created: '2026-08-07', updated: '1h ago', progress: 0,
    model: 'GPT-5',
    instructions: '2,000 words. Include 2 diagrams. SEO target: agent orchestration.',
    tools: ['Files', 'Web Search'],
    files: [],
    activity: [{ t: '1h ago', text: 'Added to backlog' }],
    logs: '',
    results: [],
    comments: [],
    approvals: [],
    live: liveFor('Backlog'),
  },
  {
    id: 't-111', title: 'Triage nightly anomaly alerts', description: 'Review model drift and data-quality alerts, file tickets for anything above threshold.',
    project: 'Research Project', agent: 'Aria', agentRole: 'Research Analyst', owner: 'Maya R.', priority: 'Medium', status: 'Waiting',
    dueDate: '2026-08-07', created: '2026-08-06', updated: '40m ago', progress: 33,
    model: 'Claude Sonnet 4.6',
    instructions: 'Group by service. Attach dashboards.',
    tools: ['Database', 'Terminal'],
    files: [],
    activity: [{ t: '40m ago', text: 'Waiting on approval' }, { t: '6h ago', text: 'Triage started' }],
    logs: 'INFO paused',
    results: [],
    comments: [],
    approvals: [{ who: 'Maya R.', status: 'Pending', at: '2026-08-06 12:00' }],
    live: liveFor('Waiting'),
  },
  {
    id: 't-112', title: 'Onboard new vendor: Acme Analytics', description: 'Provision API keys, configure webhook routes and run smoke integration.',
    project: 'Software Deployment', agent: 'Devon', agentRole: 'Code Reviewer', owner: 'Devon K.', priority: 'Medium', status: 'Cancelled',
    dueDate: '2026-08-05', created: '2026-08-01', updated: '1d ago', progress: 12,
    model: 'DeepSeek Coder',
    instructions: 'Rotate keys after test.',
    tools: ['Terminal', 'GitHub'],
    files: [],
    activity: [{ t: '1d ago', text: 'Cancelled by vendor' }, { t: '4d ago', text: 'Created' }],
    logs: 'INFO cancelled',
    results: [],
    comments: [{ who: 'Devon K.', text: 'Vendor paused contract', at: '1d ago' }],
    approvals: [],
    live: liveFor('Cancelled'),
  },
];

export { LIVE_STEPS };