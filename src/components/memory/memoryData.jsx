// Taxonomy + display metadata for the AI Memory page. Memory records are now
// loaded from the AgentMemory entity; these constants drive the UI.
import {
  Clock, History, BookOpen, Lock, Building2, User,
  Users, FolderKanban, Bot, FileText, ListChecks,
} from 'lucide-react';

// Top-level memory architecture tiers.
export const MEMORY_TYPES = [
  { id: 'short_term', label: 'Short-Term', icon: Clock, grad: 'from-sky-500 to-cyan-500', desc: 'Current conversations & active tasks' },
  { id: 'long_term', label: 'Long-Term', icon: History, grad: 'from-violet-500 to-indigo-500', desc: 'Preferences, previous work & important info' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, grad: 'from-emerald-500 to-teal-500', desc: 'Documents, company knowledge & agent info' },
  { id: 'organisation', label: 'Organisation', icon: Building2, grad: 'from-amber-500 to-orange-500', desc: 'Company-wide facts shared by every agent' },
];

// Agent-memory scoping.
export const MEMORY_SCOPES = [
  { id: 'private', label: 'Private', icon: Lock, grad: 'from-amber-500 to-orange-500', desc: 'This agent only' },
  { id: 'shared', label: 'Shared Org', icon: Building2, grad: 'from-indigo-500 to-violet-500', desc: 'All agents in the organisation' },
  { id: 'user', label: 'User', icon: User, grad: 'from-fuchsia-500 to-pink-500', desc: 'Tied to a specific user' },
  { id: 'agent', label: 'Agent', icon: Bot, grad: 'from-sky-500 to-cyan-500', desc: 'Working memory for one agent' },
  { id: 'organisation', label: 'Organisation', icon: Users, grad: 'from-emerald-500 to-teal-500', desc: 'Every member of the organisation' },
];

// Sub-categories available within each tier (used by the create / upload forms).
export const CATEGORIES = {
  short_term: [
    { id: 'conversation', label: 'Conversation' },
    { id: 'task', label: 'Current task' },
  ],
  long_term: [
    { id: 'preference', label: 'User preference' },
    { id: 'previous_work', label: 'Previous work' },
    { id: 'important_info', label: 'Important information' },
  ],
  knowledge: [
    { id: 'document', label: 'Uploaded document' },
    { id: 'company_knowledge', label: 'Company knowledge' },
    { id: 'agent_info', label: 'Agent information' },
  ],
  organisation: [
    { id: 'company_knowledge', label: 'Company knowledge' },
    { id: 'policy', label: 'Policy' },
    { id: 'procedure', label: 'Procedure' },
  ],
};

export const CATEGORY_LABELS = {
  conversation: 'Conversation',
  task: 'Current task',
  preference: 'Preference',
  previous_work: 'Previous work',
  important_info: 'Important info',
  document: 'Document',
  company_knowledge: 'Company knowledge',
  agent_info: 'Agent info',
  policy: 'Policy',
  procedure: 'Procedure',
  general: 'General',
};

export const IMPORTANCE_STYLE = {
  critical: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10', label: 'Critical' },
  high: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10', label: 'High' },
  medium: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-400/10', label: 'Medium' },
  low: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5', label: 'Low' },
};

export const VECTOR_STATUS_STYLE = {
  indexed: { cls: 'bg-emerald-400/10 text-emerald-400', label: 'Indexed' },
  pending: { cls: 'bg-amber-400/10 text-amber-400', label: 'Queued' },
  failed: { cls: 'bg-rose-400/10 text-rose-400', label: 'Failed' },
  disabled: { cls: 'bg-white/5 text-zinc-500', label: 'Not indexed' },
};

// ---------- Settings (kept as a preferences panel) ----------
export const MEMORY_SETTINGS = [
  { id: 'auto', label: 'Automatic Memory', desc: 'Let agents capture context from conversations and tasks automatically.', on: true },
  { id: 'retention', label: 'Memory Retention', desc: 'How long to keep memory entries before auto-expiry.', value: '90 days', options: ['30 days', '90 days', '1 year', 'Forever'], on: true },
  { id: 'approval', label: 'User Approval', desc: 'Require user approval before promoting short-term memory to long-term.', on: true },
  { id: 'shared', label: 'Shared Memory', desc: 'Allow memory entries to be shared across agents on the same project.', on: true },
  { id: 'sharing', label: 'Agent Sharing', desc: 'Let agents contribute to and read from shared organisation memory.', on: false },
];

// ---------- Memory graph (visual, mock) ----------
export const GRAPH_NODE_TYPES = {
  User: { color: '#f472b6', icon: Users },
  Project: { color: '#34d399', icon: FolderKanban },
  Agent: { color: '#fbbf24', icon: Bot },
  File: { color: '#38bdf8', icon: FileText },
  Task: { color: '#a78bfa', icon: ListChecks },
  Knowledge: { color: '#fb7185', icon: BookOpen },
};

export const GRAPH_NODES = [
  { id: 'u-maya', label: 'Maya R.', type: 'User', x: 110, y: 90 },
  { id: 'u-devon', label: 'Devon K.', type: 'User', x: 110, y: 300 },
  { id: 'u-sam', label: 'Sam L.', type: 'User', x: 480, y: 90 },
  { id: 'p-research', label: 'Research Project', type: 'Project', x: 300, y: 70 },
  { id: 'p-deploy', label: 'Software Deployment', type: 'Project', x: 300, y: 320 },
  { id: 'a-aria', label: 'Aria', type: 'Agent', x: 220, y: 180 },
  { id: 'a-devon', label: 'Devon', type: 'Agent', x: 400, y: 250 },
  { id: 'a-finn', label: 'Finn', type: 'Agent', x: 540, y: 190 },
  { id: 'f-matrix', label: 'vendor_matrix.xlsx', type: 'File', x: 200, y: 30 },
  { id: 'f-deck', label: 'board_deck.pdf', type: 'File', x: 560, y: 70 },
  { id: 't-report', label: 'Q3 report task', type: 'Task', x: 360, y: 130 },
  { id: 't-deploy', label: 'Deploy v2.4', type: 'Task', x: 380, y: 350 },
  { id: 'k-compet', label: 'Competitor set', type: 'Knowledge', x: 460, y: 150 },
  { id: 'k-brand', label: 'Brand voice', type: 'Knowledge', x: 150, y: 200 },
];

export const GRAPH_EDGES = [
  ['u-maya', 'p-research'], ['u-maya', 'a-aria'], ['u-maya', 't-report'],
  ['u-devon', 'p-deploy'], ['u-devon', 'a-devon'], ['u-devon', 't-deploy'],
  ['u-sam', 'a-finn'], ['u-sam', 'f-deck'],
  ['p-research', 'a-aria'], ['p-research', 't-report'], ['p-research', 'k-compet'], ['p-research', 'f-matrix'],
  ['p-deploy', 'a-devon'], ['p-deploy', 't-deploy'],
  ['a-aria', 'k-brand'], ['a-aria', 'k-compet'], ['a-aria', 'f-matrix'],
  ['a-finn', 'f-deck'], ['t-report', 'f-matrix'], ['t-deploy', 'k-compet'],
];