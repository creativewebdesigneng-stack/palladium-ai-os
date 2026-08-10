// Mock data for the Agent Workforce experience. Placeholder only — backend ready.
import {
  Bot, Moon, Activity, CheckCircle2, AlertTriangle, Globe, Wrench, Mail, Calendar,
  Github, MessageSquare, Database, FileText, Brain, BookOpen, ShieldCheck, Plug,
  TrendingUp, FolderKanban, Send, Server,
} from 'lucide-react';

export const OVERVIEW = [
  { label: 'Active Agents', value: '18', sub: '+3 this week', icon: Bot, color: 'from-violet-500 to-indigo-600' },
  { label: 'Idle Agents', value: '6', sub: 'awaiting tasks', icon: Moon, color: 'from-zinc-500 to-slate-600' },
  { label: 'Running Jobs', value: '23', sub: 'across 7 teams', icon: Activity, color: 'from-emerald-500 to-teal-600' },
  { label: 'Completed Jobs', value: '1,204', sub: '+184 this week', icon: CheckCircle2, color: 'from-amber-500 to-orange-600' },
  { label: 'Failed Jobs', value: '12', sub: 'needs attention', icon: AlertTriangle, color: 'from-rose-500 to-red-600' },
];

export const STATUSES = ['Online', 'Working', 'Idle', 'Paused', 'Offline', 'Error'];

export const STATUS_STYLE = {
  Online: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Working: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-400/10' },
  Idle: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5' },
  Paused: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' },
  Offline: { dot: 'bg-zinc-600', text: 'text-zinc-500', bg: 'bg-white/5' },
  Error: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
};

export const TOOL_ICON = {
  'Web Search': Globe, Browser: Globe, 'Code Execution': Wrench, Terminal: Server, Files: FileText,
  Database: Database, 'HTTP Requests': Send, Email: Mail, Calendar: Calendar, GitHub: Github, Slack: MessageSquare,
};

export const AGENTS = [
  {
    id: 'a1', name: 'Aria', role: 'Research Analyst', letter: 'A', grad: 'from-violet-500 to-indigo-600',
    status: 'Working', currentTask: 'Market sizing report — Q3', model: 'Claude Sonnet 4.6',
    tools: ['Web Search', 'Files', 'Slack'], projects: ['Q3 Market Brief', 'Competitor Watch'],
    performance: 94, lastActive: '2m ago', department: 'Research', team: 'Insights', workflows: 4,
    overview: { type: 'Research agent', created: '12 Jan 2026', description: 'Synthesises market briefs from web and internal data, citing sources and flagging low-confidence claims.', successRate: 94, avgDuration: '1.4h', tasksDone: 312, cost: '£0.42 / run' },
    tasks: [
      { title: 'Market sizing analysis', status: 'Running', priority: 'High', due: 'Today' },
      { title: 'Competitor feature scan', status: 'Queued', priority: 'Medium', due: 'Tomorrow' },
      { title: 'Weekly trend digest', status: 'Completed', priority: 'Low', due: 'Done' },
    ],
    memory: [
      { type: 'Long-term', size: '128 MB', updated: '1h ago' },
      { type: 'Project', size: '42 MB', updated: '3h ago' },
      { type: 'Short-term', size: '1.2 MB', updated: '2m ago' },
    ],
    knowledge: [
      { name: 'Industry Reports 2025', type: 'Collection', chunks: 1280 },
      { name: 'competitor-db.csv', type: 'File', chunks: 340 },
      { name: 'marketintel.io', type: 'Website', chunks: 920 },
    ],
    integrations: [
      { name: 'Slack', status: 'Connected' }, { name: 'Notion', status: 'Connected' },
      { name: 'Google Drive', status: 'Connected' }, { name: 'Web Search API', status: 'Connected' },
    ],
    perfSeries: [62, 70, 68, 78, 84, 88, 94],
    activity: [
      { time: '11:58', text: 'Started market sizing analysis' },
      { time: '11:40', text: 'Pulled 14 sources from web search' },
      { time: '11:22', text: 'Saved findings to Q3 Market Brief' },
      { time: '10:55', text: 'Handoff from Growth Lead' },
    ],
    permissions: [
      { name: 'Read files', granted: true }, { name: 'Write files', granted: true },
      { name: 'Execute code', granted: false }, { name: 'Send emails', granted: false },
      { name: 'Publish externally', granted: false },
    ],
  },
  {
    id: 'a2', name: 'Devon', role: 'Code Reviewer', letter: 'D', grad: 'from-emerald-500 to-teal-600',
    status: 'Idle', currentTask: 'Awaiting PR #285', model: 'DeepSeek Coder',
    tools: ['Code Execution', 'GitHub', 'Terminal'], projects: ['Release v2.4.1', 'Platform Refactor'],
    performance: 91, lastActive: '14m ago', department: 'Development', team: 'Backend', workflows: 6,
    overview: { type: 'Engineering agent', created: '03 Feb 2026', description: 'Reviews pull requests, runs static analysis, and proposes fixes with passing CI as a gate.', successRate: 91, avgDuration: '0.8h', tasksDone: 96, cost: '£0.31 / run' },
    tasks: [
      { title: 'Review PR #285', status: 'Queued', priority: 'Medium', due: 'Today' },
      { title: 'Refactor auth module', status: 'Running', priority: 'High', due: 'Fri' },
    ],
    memory: [{ type: 'Project', size: '64 MB', updated: '14m ago' }, { type: 'Short-term', size: '0.8 MB', updated: '14m ago' }],
    knowledge: [{ name: 'codebase-index', type: 'Collection', chunks: 2100 }, { name: 'style-guide.md', type: 'File', chunks: 88 }],
    integrations: [{ name: 'GitHub', status: 'Connected' }, { name: 'Linear', status: 'Connected' }, { name: 'Sentry', status: 'Disconnected' }],
    perfSeries: [70, 74, 80, 78, 85, 88, 91],
    activity: [{ time: '11:44', text: 'Finished refactoring auth module' }, { time: '11:10', text: 'CI green on PR #284' }],
    permissions: [{ name: 'Read files', granted: true }, { name: 'Write files', granted: true }, { name: 'Execute code', granted: true }, { name: 'Deploy', granted: false }],
  },
  {
    id: 'a3', name: 'Mia', role: 'Growth Writer', letter: 'M', grad: 'from-fuchsia-500 to-pink-600',
    status: 'Working', currentTask: 'Landing page copy v2', model: 'GPT-5',
    tools: ['Files', 'Web Search'], projects: ['Q3 Launch Campaign', 'Brand Refresh'],
    performance: 88, lastActive: 'just now', department: 'Marketing', team: 'Content', workflows: 3,
    overview: { type: 'Marketing agent', created: '20 Jan 2026', description: 'Drafts on-brand copy for landing pages, ads and emails, tuned to campaign goals.', successRate: 88, avgDuration: '0.5h', tasksDone: 64, cost: '£0.18 / run' },
    tasks: [{ title: 'Landing page copy v2', status: 'Running', priority: 'High', due: 'Today' }, { title: 'Ad variants (×6)', status: 'Queued', priority: 'Medium', due: 'Tomorrow' }],
    memory: [{ type: 'Long-term', size: '96 MB', updated: '5h ago' }, { type: 'Short-term', size: '1.5 MB', updated: 'now' }],
    knowledge: [{ name: 'Brand Guidelines', type: 'Collection', chunks: 420 }, { name: 'past-campaigns.pdf', type: 'File', chunks: 260 }],
    integrations: [{ name: 'Google Docs', status: 'Connected' }, { name: 'Slack', status: 'Connected' }, { name: 'HubSpot', status: 'Disconnected' }],
    perfSeries: [60, 65, 72, 70, 80, 84, 88],
    activity: [{ time: '12:01', text: 'Drafted hero section' }, { time: '11:30', text: 'Pulled brand guidelines' }],
    permissions: [{ name: 'Read files', granted: true }, { name: 'Write files', granted: true }, { name: 'Publish externally', granted: false }],
  },
  {
    id: 'a4', name: 'Cody', role: 'Support Specialist', letter: 'C', grad: 'from-cyan-500 to-blue-600',
    status: 'Online', currentTask: 'Ticket #4812 — refund query', model: 'Claude Sonnet 4.6',
    tools: ['Files', 'Email', 'Slack'], projects: ['SupportOps', 'KB Maintenance'],
    performance: 96, lastActive: '1m ago', department: 'Customer Support', team: 'Tier-1', workflows: 5,
    overview: { type: 'Support agent', created: '08 Dec 2025', description: 'Triages and resolves customer tickets using the knowledge base, escalating only when needed.', successRate: 96, avgDuration: '0.2h', tasksDone: 184, cost: '£0.09 / run' },
    tasks: [{ title: 'Ticket #4812', status: 'Running', priority: 'High', due: 'Now' }, { title: 'KB article update', status: 'Queued', priority: 'Low', due: 'Fri' }],
    memory: [{ type: 'Long-term', size: '210 MB', updated: '1m ago' }, { type: 'Short-term', size: '2.1 MB', updated: '1m ago' }],
    knowledge: [{ name: 'Help Center', type: 'Collection', chunks: 3400 }, { name: 'refund-policy.md', type: 'File', chunks: 120 }],
    integrations: [{ name: 'Slack', status: 'Connected' }, { name: 'Gmail', status: 'Connected' }, { name: 'Zendesk', status: 'Connected' }],
    perfSeries: [88, 90, 92, 91, 93, 95, 96],
    activity: [{ time: '12:03', text: 'Resolved ticket #4811' }, { time: '11:50', text: 'Escalated ticket #4809 to human' }],
    permissions: [{ name: 'Read files', granted: true }, { name: 'Send emails', granted: true }, { name: 'Refund payments', granted: false }],
  },
  {
    id: 'a5', name: 'Leo', role: 'Data Engineer', letter: 'L', grad: 'from-lime-500 to-emerald-600',
    status: 'Error', currentTask: 'Pipeline backfill — failed', model: 'DeepSeek Coder',
    tools: ['Code Execution', 'Database', 'Terminal'], projects: ['Data Platform', 'Nightly ETL'],
    performance: 82, lastActive: '8m ago', department: 'Development', team: 'Data', workflows: 2,
    overview: { type: 'Engineering agent', created: '15 Feb 2026', description: 'Runs and monitors data pipelines, backfilling and repairing jobs on schedule.', successRate: 82, avgDuration: '1.1h', tasksDone: 210, cost: '£0.27 / run' },
    tasks: [{ title: 'Pipeline backfill', status: 'Failed', priority: 'High', due: 'Now' }, { title: 'Schema migration', status: 'Queued', priority: 'Medium', due: 'Mon' }],
    memory: [{ type: 'Project', size: '88 MB', updated: '8m ago' }],
    knowledge: [{ name: 'warehouse-schema', type: 'Collection', chunks: 1600 }],
    integrations: [{ name: 'Snowflake', status: 'Connected' }, { name: 'GitHub', status: 'Connected' }],
    perfSeries: [78, 80, 75, 70, 74, 80, 82],
    activity: [{ time: '11:52', text: 'Pipeline backfill failed — approval needed' }, { time: '11:20', text: 'Started backfill job' }],
    permissions: [{ name: 'Read files', granted: true }, { name: 'Execute code', granted: true }, { name: 'Deploy', granted: true }],
  },
  {
    id: 'a6', name: 'Finn', role: 'Finance Analyst', letter: 'F', grad: 'from-amber-500 to-orange-600',
    status: 'Paused', currentTask: 'Q3 forecast (paused)', model: 'GPT-5',
    tools: ['Files', 'Database'], projects: ['Q3 Close', 'Forecasting'],
    performance: 90, lastActive: '1h ago', department: 'Finance', team: 'Planning', workflows: 3,
    overview: { type: 'Finance agent', created: '02 Jan 2026', description: 'Reconciles invoices and produces forecasts from ledger and CRM data.', successRate: 90, avgDuration: '0.6h', tasksDone: 142, cost: '£0.22 / run' },
    tasks: [{ title: 'Q3 forecast', status: 'Paused', priority: 'Medium', due: 'Next week' }],
    memory: [{ type: 'Long-term', size: '76 MB', updated: '1h ago' }],
    knowledge: [{ name: 'ledger-2026', type: 'Database', chunks: 2400 }],
    integrations: [{ name: 'QuickBooks', status: 'Connected' }, { name: 'Google Sheets', status: 'Connected' }],
    perfSeries: [72, 76, 80, 84, 86, 88, 90],
    activity: [{ time: '10:48', text: 'Paused by Finance Lead' }, { time: '10:20', text: 'Generated forecast draft' }],
    permissions: [{ name: 'Read files', granted: true }, { name: 'Write files', granted: true }, { name: 'Execute payments', granted: false }],
  },
];

export const DEPARTMENTS = [
  { name: 'Research', grad: 'from-violet-500 to-indigo-600', agents: ['Aria'], lead: 'Aria' },
  { name: 'Development', grad: 'from-emerald-500 to-teal-600', agents: ['Devon', 'Leo'], lead: 'Devon' },
  { name: 'Marketing', grad: 'from-fuchsia-500 to-pink-600', agents: ['Mia'], lead: 'Mia' },
  { name: 'Customer Support', grad: 'from-cyan-500 to-blue-600', agents: ['Cody'], lead: 'Cody' },
  { name: 'Finance', grad: 'from-amber-500 to-orange-600', agents: ['Finn'], lead: 'Finn' },
];

export const TEAMS = [
  { name: 'Insights', dept: 'Research', agents: ['Aria'], goal: 'Weekly market briefs', progress: 84 },
  { name: 'Backend', dept: 'Development', agents: ['Devon', 'Leo'], goal: 'Release v2.4.1', progress: 90 },
  { name: 'Content', dept: 'Marketing', agents: ['Mia'], goal: 'Q3 launch copy', progress: 58 },
  { name: 'Tier-1', dept: 'Customer Support', agents: ['Cody'], goal: '<2h first response', progress: 96 },
  { name: 'Planning', dept: 'Finance', agents: ['Finn'], goal: 'Q3 close books', progress: 33 },
];

export const PROJECTS = [
  { name: 'Q3 Market Brief', dept: 'Research', agents: ['Aria'], status: 'Active', progress: 72 },
  { name: 'Release v2.4.1', dept: 'Development', agents: ['Devon', 'Leo'], status: 'Review', progress: 90 },
  { name: 'Q3 Launch Campaign', dept: 'Marketing', agents: ['Mia', 'Aria'], status: 'Active', progress: 58 },
  { name: 'SupportOps', dept: 'Customer Support', agents: ['Cody'], status: 'Active', progress: 96 },
  { name: 'Q3 Close', dept: 'Finance', agents: ['Finn'], status: 'Planning', progress: 33 },
];

export const WORKFLOWS = [
  { name: 'Daily Market Digest', dept: 'Research', agents: ['Aria'], trigger: '09:00 daily', runs: 42, status: 'Active' },
  { name: 'PR Auto-Review', dept: 'Development', agents: ['Devon'], trigger: 'On PR open', runs: 128, status: 'Active' },
  { name: 'Ticket Triage', dept: 'Customer Support', agents: ['Cody'], trigger: 'On ticket', runs: 1840, status: 'Active' },
  { name: 'Nightly Reconciliation', dept: 'Finance', agents: ['Finn'], trigger: '23:00 daily', runs: 30, status: 'Paused' },
];

export const AGENT_COMMS = [
  { from: 'Aria', fromGrad: 'from-violet-500 to-indigo-600', to: 'Devon', toGrad: 'from-emerald-500 to-teal-600', text: 'Research completed. Results available.', time: '12:02' },
  { from: 'Devon', fromGrad: 'from-emerald-500 to-teal-600', to: 'Mia', toGrad: 'from-fuchsia-500 to-pink-600', text: 'Landing page build completed.', time: '11:48' },
  { from: 'Mia', fromGrad: 'from-fuchsia-500 to-pink-600', to: 'Cody', toGrad: 'from-cyan-500 to-blue-600', text: 'New campaign FAQ ready for support.', time: '11:30' },
  { from: 'Cody', fromGrad: 'from-cyan-500 to-blue-600', to: 'Finn', toGrad: 'from-amber-500 to-orange-600', text: 'Refund ticket #4812 needs approval.', time: '11:12' },
  { from: 'Finn', fromGrad: 'from-amber-500 to-orange-600', to: 'Aria', toGrad: 'from-violet-500 to-indigo-600', text: 'Forecast inputs ready for analysis.', time: '10:55' },
  { from: 'Aria', fromGrad: 'from-violet-500 to-indigo-600', to: 'Mia', toGrad: 'from-fuchsia-500 to-pink-600', text: 'Competitor messaging insights shared.', time: '10:40' },
];

export const PROFILE_TABS = [
  { id: 'overview', label: 'Overview', icon: Bot },
  { id: 'tasks', label: 'Tasks', icon: FolderKanban },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
];

export const TASK_STATUS_STYLE = {
  Running: 'bg-emerald-400/10 text-emerald-400', Queued: 'bg-white/5 text-zinc-400',
  Paused: 'bg-amber-400/10 text-amber-400', Completed: 'bg-violet-400/10 text-violet-300',
  Failed: 'bg-rose-400/10 text-rose-400',
};
export const PRIORITY_STYLE = { High: 'bg-rose-400/10 text-rose-400', Medium: 'bg-amber-400/10 text-amber-400', Low: 'bg-white/5 text-zinc-400' };