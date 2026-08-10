// Mock options + default config for the Agent Builder.
// Replace simulated test run with a backend function when ready.

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

export const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', models: ['Claude Sonnet 4.6', 'Claude Opus 4.6'] },
  { id: 'openai', label: 'OpenAI', models: ['GPT-5.4', 'GPT-5 Mini'] },
  { id: 'google', label: 'Google', models: ['Gemini 2.5 Pro', 'Gemini 3 Flash'] },
  { id: 'meta', label: 'Meta', models: ['Llama 3.3 70B'] },
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

export const ATTACHED = [
  { id: 'k1', type: 'files', label: 'Brand guidelines.pdf' },
  { id: 'k2', type: 'collections', label: 'Product knowledge base' },
  { id: 'k3', type: 'websites', label: 'docs.palladiumai.com' },
];

export const PERMISSIONS = [
  { id: 'read', label: 'Read', desc: 'View data & resources.', danger: false },
  { id: 'write', label: 'Write', desc: 'Create & update records.', danger: false },
  { id: 'execute', label: 'Execute', desc: 'Run tools & code.', danger: false },
  { id: 'delete', label: 'Delete', desc: 'Remove data & resources.', danger: true },
  { id: 'publish', label: 'Publish', desc: 'Push changes live.', danger: true },
  { id: 'send', label: 'Send', desc: 'Send messages & emails.', danger: true },
];

export const VERSIONS = [
  { v: 'v3', date: '7 Aug 2026 · 11:02', status: 'current', summary: 'Added GitHub tool + lowered temperature', author: 'Alex K.' },
  { v: 'v2', date: '5 Aug 2026 · 16:40', status: 'archived', summary: 'Switched to Claude Sonnet 4.6', author: 'Maya P.' },
  { v: 'v1', date: '1 Aug 2026 · 09:15', status: 'archived', summary: 'Initial agent draft', author: 'Alex K.' },
];

export const DEPLOYMENT_STATES = ['Draft', 'Testing', 'Published', 'Paused'];

export const PREVIEW_SEED = [
  { role: 'user', text: 'Summarise last week’s support tickets and draft a weekly digest.' },
  { role: 'agent', text: 'I’ll search the help desk for last week’s tickets, summarise by theme, then draft the digest for Slack.', steps: [
    { type: 'thinking', text: 'Tickets from 31 Jul–6 Aug → group by category → rank by volume.' },
    { type: 'tool', name: 'Database', detail: 'SELECT * FROM tickets WHERE created > now() - interval \'7 days\'' },
    { type: 'result', text: '482 tickets · top theme: billing (31%)' },
  ]},
];

export const TEST_SEED = [
  { role: 'user', text: 'What’s the status of the Atlas project?' },
  { role: 'agent', text: 'Atlas Analytics is on track — 82% of sprint scope complete, with one blocker on the data export module. Estimated ship date is 14 Aug.', steps: [
    { type: 'thinking', text: 'Query project memory for Atlas → check open tasks → identify blockers.' },
    { type: 'tool', name: 'Files', detail: 'Read projects/atlas/status.md' },
    { type: 'result', text: '12 tasks open · 1 blocker · ETA 14 Aug' },
  ]},
];