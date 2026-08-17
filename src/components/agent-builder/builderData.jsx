// Static option catalogues for the Agent Builder (labels, not user data).
// Agent test runs execute on the real runtime; no seeded transcripts exist here.

export const TOOLS = [
  { id: 'web_search', label: 'Web Search', icon: 'Globe', grad: 'from-sky-500 to-cyan-500', desc: 'Search the live web' },
  { id: 'browser', label: 'Browser', icon: 'AppWindow', grad: 'from-violet-500 to-indigo-500', desc: 'Navigate & extract pages' },
  { id: 'code', label: 'Code Execution', icon: 'Code2', grad: 'from-emerald-500 to-teal-500', desc: 'Run sandboxed code' },
  { id: 'terminal', label: 'Terminal', icon: 'SquareTerminal', grad: 'from-zinc-500 to-slate-600', desc: 'Execute shell commands' },
  { id: 'files', label: 'Files', icon: 'FileText', grad: 'from-amber-500 to-orange-500', desc: 'Read & write files' },
  { id: 'database', label: 'Database', icon: 'Database', grad: 'from-indigo-500 to-violet-500', desc: 'Query data stores' },
  { id: 'http', label: 'HTTP Requests', icon: 'Send', grad: 'from-rose-500 to-red-500', desc: 'Call any API' },
  { id: 'email', label: 'Email', icon: 'Mail', grad: 'from-cyan-500 to-blue-500', desc: 'Send & triage email' },
  { id: 'calendar', label: 'Calendar', icon: 'Calendar', grad: 'from-emerald-500 to-green-600', desc: 'Manage events' },
  { id: 'github', label: 'GitHub', icon: 'Github', grad: 'from-zinc-600 to-zinc-800', desc: 'Repos, PRs, issues' },
  { id: 'slack', label: 'Slack', icon: 'MessageSquare', grad: 'from-fuchsia-500 to-pink-500', desc: 'Send messages' },
  { id: 'discord', label: 'Discord', icon: 'MessagesSquare', grad: 'from-indigo-500 to-purple-500', desc: 'Post to channels' },
];

// These IDs and model values intentionally mirror src/lib/runtime/model-gateway.server.ts.
// Store canonical API model IDs, never display-only names, so saved agents execute unchanged.
export const PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-5-mini', 'gpt-5.1'],
  },
  {
    id: 'lovable',
    label: 'Lovable AI Gateway',
    models: ['google/gemini-3-flash-preview'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: ['claude-sonnet-4-5-20250929'],
  },
  {
    id: 'compatible',
    label: 'OpenAI-compatible / local',
    models: ['local-model'],
  },
];

export const CONTEXT_OPTIONS = ['8K', '32K', '128K', '1M tokens'];
export const REASONING_OPTIONS = ['Off', 'Low', 'Medium', 'High'];

export const MEMORY_TYPES = [
  { id: 'short', label: 'Short-Term Memory', desc: 'Holds context for the current task.', icon: 'Clock' },
  { id: 'long', label: 'Long-Term Memory', desc: 'Persists across sessions.', icon: 'Brain' },
  { id: 'project', label: 'Project Memory', desc: 'Shared project context.', icon: 'FolderKanban' },
  { id: 'shared', label: 'Shared Memory', desc: 'Team-wide knowledge base.', icon: 'Users' },
];

export const KNOWLEDGE_SOURCES = [
  { id: 'files', label: 'Files', icon: 'FileText', grad: 'from-amber-500 to-orange-500' },
  { id: 'folders', label: 'Folders', icon: 'Folder', grad: 'from-indigo-500 to-violet-500' },
  { id: 'collections', label: 'Collections', icon: 'Library', grad: 'from-emerald-500 to-teal-500' },
  { id: 'websites', label: 'Websites', icon: 'Globe', grad: 'from-sky-500 to-cyan-500' },
  { id: 'databases', label: 'Databases', icon: 'Database', grad: 'from-fuchsia-500 to-pink-500' },
];

// Attached knowledge is user/workspace data and must never be fabricated in production.
export const ATTACHED = [];

export const PERMISSIONS = [
  { id: 'read', label: 'Read', desc: 'View data & resources.', danger: false },
  { id: 'write', label: 'Write', desc: 'Create & update records.', danger: false },
  { id: 'execute', label: 'Execute', desc: 'Run tools & code.', danger: false },
  { id: 'delete', label: 'Delete', desc: 'Remove data & resources.', danger: true },
  { id: 'publish', label: 'Publish', desc: 'Push changes live.', danger: true },
  { id: 'send', label: 'Send', desc: 'Send messages & emails.', danger: true },
];

// Version history belongs to persisted agent revisions. Keep this empty until real
// version rows are wired into the builder rather than showing invented authors/dates.
export const VERSIONS = [];

export const DEPLOYMENT_STATES = ['Draft', 'Testing', 'Published', 'Paused'];
