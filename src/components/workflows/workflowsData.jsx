// Mock data for the Workflows & Automations page. Placeholder only — backend ready.
import {
  Zap, Bot, GitBranch, Play, Plug, Database, Bell, CheckCircle2, Clock,
  Repeat, UserCheck, Mail, Calendar, Webhook, Upload, FileText, Send, Code2,
  ListChecks, MousePointer, Square, AlertTriangle, Pause, CircleDot,
} from 'lucide-react';

// ---------- Node types ----------
export const NODE_TYPES = {
  Trigger: { icon: Zap, grad: 'from-violet-500 to-indigo-500' },
  'AI Agent': { icon: Bot, grad: 'from-fuchsia-500 to-pink-500' },
  Condition: { icon: GitBranch, grad: 'from-amber-500 to-orange-500' },
  Action: { icon: Play, grad: 'from-emerald-500 to-teal-500' },
  API: { icon: Plug, grad: 'from-cyan-500 to-sky-500' },
  Database: { icon: Database, grad: 'from-indigo-500 to-violet-500' },
  Notification: { icon: Bell, grad: 'from-rose-500 to-pink-500' },
  Approval: { icon: CheckCircle2, grad: 'from-violet-500 to-purple-500' },
  Delay: { icon: Clock, grad: 'from-slate-500 to-zinc-500' },
  Loop: { icon: Repeat, grad: 'from-teal-500 to-emerald-500' },
  'Human Review': { icon: UserCheck, grad: 'from-orange-500 to-amber-500' },
};

// ---------- Triggers ----------
export const TRIGGERS = [
  { label: 'Schedule', icon: Calendar },
  { label: 'Webhook', icon: Webhook },
  { label: 'Email', icon: Mail },
  { label: 'File Upload', icon: Upload },
  { label: 'Database Event', icon: Database },
  { label: 'API Event', icon: Plug },
  { label: 'Manual', icon: MousePointer },
  { label: 'Agent Event', icon: Bot },
];

// ---------- Actions ----------
export const ACTIONS = [
  { label: 'Send Email', icon: Mail },
  { label: 'Create Task', icon: ListChecks },
  { label: 'Run Agent', icon: Bot },
  { label: 'Call API', icon: Plug },
  { label: 'Update Database', icon: Database },
  { label: 'Create File', icon: FileText },
  { label: 'Send Message', icon: Send },
  { label: 'Deploy Code', icon: Code2 },
];

// ---------- Statuses ----------
export const STATUSES = ['Draft', 'Active', 'Paused', 'Failed', 'Completed'];
export const STATUS_STYLE = {
  Draft: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5', icon: Square },
  Active: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Play },
  Paused: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10', icon: Pause },
  Failed: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10', icon: AlertTriangle },
  Completed: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: CheckCircle2 },
};

// ---------- Workflows ----------
export const WORKFLOWS = [
  {
    id: 'wf-001', name: 'Inbound email → research → report', description: 'When a new email arrives, research the sender, analyse intent, and post a summary to Slack.',
    status: 'Active', trigger: 'Email', owner: 'Maya R.', lastRun: '12m ago', runs: 1284, successRate: 96,
    nodes: [
      { type: 'Trigger', label: 'New Email', config: 'inbox: support@' },
      { type: 'AI Agent', label: 'Research Agent', config: 'model: Claude Sonnet' },
      { type: 'Action', label: 'Analyse', config: 'intent + sentiment' },
      { type: 'Condition', label: 'If high priority', config: 'priority >= High' },
      { type: 'Action', label: 'Create Report', config: 'format: docx' },
      { type: 'Notification', label: 'Send Slack Message', config: '#research' },
    ],
  },
  {
    id: 'wf-002', name: 'Daily competitor digest', description: 'Every morning, gather competitor updates and email a digest to the growth team.',
    status: 'Active', trigger: 'Schedule', owner: 'Devon K.', lastRun: '6h ago', runs: 92, successRate: 100,
    nodes: [
      { type: 'Trigger', label: 'Schedule · 09:00 daily', config: 'cron: 0 9 * * *' },
      { type: 'AI Agent', label: 'Research Agent', config: 'model: Claude Sonnet' },
      { type: 'Loop', label: 'For each competitor', config: '12 vendors' },
      { type: 'Action', label: 'Fetch updates', config: 'via Web Search' },
      { type: 'Action', label: 'Compile digest', config: 'merge to docx' },
      { type: 'Notification', label: 'Send Email', config: 'growth@team' },
    ],
  },
  {
    id: 'wf-003', name: 'Lead enrichment pipeline', description: 'When a new lead lands, enrich with firmographics, score, and route to sales.',
    status: 'Paused', trigger: 'Database Event', owner: 'Sam L.', lastRun: '2d ago', runs: 540, successRate: 91,
    nodes: [
      { type: 'Trigger', label: 'Database Event', config: 'leads.insert' },
      { type: 'AI Agent', label: 'Lead Scout', config: 'model: GPT-5' },
      { type: 'API', label: 'Enrichment API', config: 'Clearbit' },
      { type: 'Condition', label: 'If score > 70', config: 'intent >= 70' },
      { type: 'Action', label: 'Create Task', config: 'assign: sales' },
      { type: 'Notification', label: 'Send Message', config: '#sales' },
    ],
  },
  {
    id: 'wf-004', name: 'Auth deploy + smoke test', description: 'On PR merge, run regression, deploy canary, validate, and promote on green.',
    status: 'Failed', trigger: 'API Event', owner: 'Devon K.', lastRun: '1h ago', runs: 38, successRate: 84,
    nodes: [
      { type: 'Trigger', label: 'API Event · PR merge', config: 'github webhook' },
      { type: 'AI Agent', label: 'Code Reviewer', config: 'model: DeepSeek' },
      { type: 'Action', label: 'Run regression', config: '1,240 tests' },
      { type: 'Condition', label: 'If all green', config: 'tests == pass' },
      { type: 'Action', label: 'Deploy canary', config: '10% → 100%' },
      { type: 'Approval', label: 'Human Review', config: 'Devon K.' },
    ],
  },
  {
    id: 'wf-005', name: 'Support ticket auto-responder', description: 'Classify inbound tickets, answer routine ones, escalate the rest with context.',
    status: 'Active', trigger: 'Email', owner: 'Leo M.', lastRun: '4m ago', runs: 4210, successRate: 98,
    nodes: [
      { type: 'Trigger', label: 'New Email', config: 'inbox: help@' },
      { type: 'AI Agent', label: 'Support Specialist', config: 'model: Claude Sonnet' },
      { type: 'Condition', label: 'If routine', config: 'category in FAQ' },
      { type: 'Action', label: 'Send reply', config: 'template + citations' },
      { type: 'Delay', label: 'Wait 5 min', config: 'async' },
      { type: 'Notification', label: 'Send Slack Message', config: '#support' },
    ],
  },
  {
    id: 'wf-006', name: 'Weekly board KPI deck', description: 'Assemble the board metrics deck from BI sources with narrative commentary.',
    status: 'Completed', trigger: 'Schedule', owner: 'Sam L.', lastRun: '2d ago', runs: 8, successRate: 100,
    nodes: [
      { type: 'Trigger', label: 'Schedule · Mon 07:00', config: 'cron: 0 7 * * 1' },
      { type: 'AI Agent', label: 'Finance Analyst', config: 'model: GPT-5' },
      { type: 'Database', label: 'Pull BI metrics', config: '12 sources' },
      { type: 'Action', label: 'Generate deck', config: '12 slides' },
      { type: 'Approval', label: 'Human Review', config: 'Sam L.' },
      { type: 'Notification', label: 'Send Email', config: 'board@' },
    ],
  },
  {
    id: 'wf-007', name: 'Webhook → data sync', description: 'Sync incoming webhook payloads to the warehouse with validation.',
    status: 'Draft', trigger: 'Webhook', owner: 'Maya R.', lastRun: '—', runs: 0, successRate: 0,
    nodes: [
      { type: 'Trigger', label: 'Webhook', config: 'POST /sync' },
      { type: 'Condition', label: 'Validate payload', config: 'schema check' },
      { type: 'API', label: 'Transform', config: 'map fields' },
      { type: 'Database', label: 'Update Database', config: 'warehouse.upsert' },
    ],
  },
];

// ---------- Run history ----------
export const RUN_HISTORY = [
  { runId: 'run-9f3a', workflow: 'Inbound email → research → report', started: '11:10', completed: '11:11', duration: '47s', status: 'Active', agent: 'Research Agent', errors: '' },
  { runId: 'run-9f2c', workflow: 'Support ticket auto-responder', started: '11:06', completed: '11:07', duration: '31s', status: 'Completed', agent: 'Support Specialist', errors: '' },
  { runId: 'run-9f1b', workflow: 'Auth deploy + smoke test', started: '10:42', completed: '10:58', duration: '16m', status: 'Failed', agent: 'Code Reviewer', errors: 'Canary rollback: 5/5 errors' },
  { runId: 'run-9f0a', workflow: 'Daily competitor digest', started: '09:00', completed: '09:02', duration: '2m', status: 'Completed', agent: 'Research Agent', errors: '' },
  { runId: 'run-9e9a', workflow: 'Lead enrichment pipeline', started: '08:30', completed: '08:31', duration: '54s', status: 'Paused', agent: 'Lead Scout', errors: 'paused mid-run' },
  { runId: 'run-9e8a', workflow: 'Support ticket auto-responder', started: '08:12', completed: '08:13', duration: '28s', status: 'Completed', agent: 'Support Specialist', errors: '' },
  { runId: 'run-9e7a', workflow: 'Weekly board KPI deck', started: 'Mon 07:00', completed: 'Mon 07:04', duration: '4m', status: 'Completed', agent: 'Finance Analyst', errors: '' },
];

// ---------- Templates ----------
export const TEMPLATES = [
  { name: 'Email triage & reply', category: 'Support', trigger: 'Email', nodes: 6, description: 'Classify inbound email, draft a reply, escalate edge cases.' },
  { name: 'Daily digest', category: 'Reporting', trigger: 'Schedule', nodes: 5, description: 'Gather updates on a schedule and email a summary.' },
  { name: 'Lead enrichment', category: 'Sales', trigger: 'Database Event', nodes: 6, description: 'Enrich new leads, score, and route high-intent to sales.' },
  { name: 'CI → deploy', category: 'DevOps', trigger: 'API Event', nodes: 6, description: 'Run tests, deploy canary, promote on green with review.' },
  { name: 'Slack alerting', category: 'Ops', trigger: 'Webhook', nodes: 4, description: 'Transform a webhook payload and post a formatted alert.' },
  { name: 'Document approval', category: 'Workflow', trigger: 'File Upload', nodes: 5, description: 'Route a new document for AI review then human approval.' },
];