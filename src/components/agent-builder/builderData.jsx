// Static option catalogues for the Agent Builder (labels, not user data).
// Agent test runs execute on the real runtime; no seeded transcripts exist here.

// IMPORTANT: these IDs are the executable runtime slugs from tools.server.ts.
// Never store display-only aliases here, otherwise the runtime will correctly
// drop the unknown tool during server-side grant resolution.
export const TOOLS = [
  { id: 'web_search', label: 'Web Search', icon: 'Globe', grad: 'from-sky-500 to-cyan-500', desc: 'Search the live public web' },
  { id: 'web_fetch', label: 'Web Page Reader', icon: 'Globe', grad: 'from-cyan-500 to-blue-500', desc: 'Read public web pages' },
  { id: 'browser', label: 'Browser', icon: 'AppWindow', grad: 'from-violet-500 to-indigo-500', desc: 'Navigate and extract pages' },
  { id: 'file_analysis', label: 'Knowledge Files', icon: 'FileText', grad: 'from-amber-500 to-orange-500', desc: 'Read attached knowledge documents' },
  { id: 'data_analysis', label: 'Data Analysis', icon: 'Database', grad: 'from-indigo-500 to-violet-500', desc: 'Analyse numeric datasets' },
  { id: 'database_query', label: 'Workspace Data', icon: 'Database', grad: 'from-purple-500 to-indigo-500', desc: 'Read approved workspace tables' },
  { id: 'code_exec', label: 'Code Execution', icon: 'Code2', grad: 'from-emerald-500 to-teal-500', desc: 'Run sandboxed JavaScript expressions' },
  { id: 'calculator', label: 'Calculator', icon: 'Code2', grad: 'from-teal-500 to-cyan-500', desc: 'Evaluate arithmetic safely' },
  { id: 'current_time', label: 'Current Time', icon: 'Clock', grad: 'from-zinc-500 to-slate-600', desc: 'Get current UTC date and time' },
  { id: 'memory_search', label: 'Memory Search', icon: 'Brain', grad: 'from-fuchsia-500 to-violet-500', desc: 'Search stored facts and preferences' },
  { id: 'memory_write', label: 'Memory Write', icon: 'Brain', grad: 'from-pink-500 to-fuchsia-500', desc: 'Remember durable facts and preferences' },
  { id: 'http_request', label: 'HTTP Requests', icon: 'Send', grad: 'from-rose-500 to-red-500', desc: 'Call allow-listed HTTP APIs' },
  { id: 'connected_service', label: 'Connected Apps — Read', icon: 'MessageSquare', grad: 'from-blue-500 to-indigo-500', desc: 'Read connected GitHub, Google, Slack and other services' },
  { id: 'connected_service_write', label: 'Connected Apps — Write', icon: 'Send', grad: 'from-orange-500 to-rose-500', desc: 'Prepare approved writes to supported connected services' },
  { id: 'github_write', label: 'GitHub Write', icon: 'Github', grad: 'from-zinc-600 to-zinc-800', desc: 'Prepare approved repository changes' },
  { id: 'request_approval', label: 'Request Approval', icon: 'ShieldCheck', grad: 'from-yellow-500 to-orange-500', desc: 'Ask the operator before sensitive actions' },
  { id: 'shopping_search', label: 'Shopping Research', icon: 'Globe', grad: 'from-emerald-500 to-green-600', desc: 'Research products without purchasing' },
  { id: 'prepare_purchase', label: 'Prepare Purchase', icon: 'Send', grad: 'from-red-500 to-rose-600', desc: 'Prepare a purchase for explicit approval' },
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
