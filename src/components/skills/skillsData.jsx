// Mock data for the Skills & Tools page. Placeholder only — backend ready.
import {
  Globe, MonitorSmartphone, Code2, FileText, Database, Plug, Mail, Search,
  Workflow, Github, Briefcase, Terminal, GitBranch, Calendar, Send, Webhook,
  ShieldCheck, Power, Beaker, KeyRound, Server, Braces,
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'Web', icon: Globe },
  { id: 'Browser', icon: MonitorSmartphone },
  { id: 'Code', icon: Code2 },
  { id: 'Files', icon: FileText },
  { id: 'Database', icon: Database },
  { id: 'APIs', icon: Plug },
  { id: 'Communication', icon: Mail },
  { id: 'Search', icon: Search },
  { id: 'Automation', icon: Workflow },
  { id: 'Developer', icon: Github },
  { id: 'Business', icon: Briefcase },
];

export const STATUS_STYLE = {
  Enabled: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Power },
  Disabled: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5', icon: Power },
  Beta: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10', icon: Beaker },
  Deprecated: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10', icon: Beaker },
};

export const AUTH_METHODS = ['None', 'API Key', 'OAuth 2.0', 'Bearer Token', 'Basic Auth'];

export const PERMISSION_OPTIONS = ['Read', 'Write', 'Execute', 'Network', 'Admin', 'Filesystem', 'Sandboxed'];

export const TOOLS = [
  { id: 'tool-001', name: 'Web Search', description: 'Query the web and return ranked sources with snippets.', category: 'Web', version: '2.4.1', permissions: ['Network', 'Read'], agents: 8, agentNames: ['Aria', 'Mia', 'Cody'], status: 'Enabled', endpoint: 'https://api.palladium/skills/web-search', auth: 'API Key', input: '{ query: string, limit?: number }', output: '{ results: Source[] }' },
  { id: 'tool-002', name: 'Web Scraper', description: 'Extract structured content from any URL with CSS selectors.', category: 'Web', version: '1.9.0', permissions: ['Network', 'Read'], agents: 4, agentNames: ['Aria', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/scrape', auth: 'API Key', input: '{ url: string, selectors?: object }', output: '{ content: object }' },
  { id: 'tool-003', name: 'Browser Control', description: 'Drive a headless browser: navigate, click, fill, and capture screenshots.', category: 'Browser', version: '3.0.2', permissions: ['Network', 'Execute', 'Sandboxed'], agents: 6, agentNames: ['Devon', 'Mia'], status: 'Enabled', endpoint: 'https://api.palladium/skills/browser', auth: 'API Key', input: '{ steps: Step[] }', output: '{ pages: Page[], screenshots: string[] }' },
  { id: 'tool-004', name: 'Screenshot Capture', description: 'Render a full-page screenshot of any URL.', category: 'Browser', version: '1.2.0', permissions: ['Network', 'Read'], agents: 2, agentNames: ['Mia'], status: 'Beta', endpoint: 'https://api.palladium/skills/screenshot', auth: 'Bearer Token', input: '{ url: string }', output: '{ image_url: string }' },
  { id: 'tool-005', name: 'Python', description: 'Execute sandboxed Python 3.12 with standard libraries and pip packages.', category: 'Code', version: '3.12.0', permissions: ['Execute', 'Sandboxed'], agents: 12, agentNames: ['Leo', 'Devon', 'Aria', 'Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/python', auth: 'API Key', input: '{ code: string, stdin?: string }', output: '{ stdout: string, stderr: string, result: any }' },
  { id: 'tool-006', name: 'Terminal', description: 'Run shell commands in an isolated ephemeral environment.', category: 'Code', version: '2.1.0', permissions: ['Execute', 'Filesystem'], agents: 5, agentNames: ['Devon', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/terminal', auth: 'OAuth 2.0', input: '{ command: string }', output: '{ stdout: string, exit_code: number }' },
  { id: 'tool-007', name: 'JavaScript', description: 'Execute JS in a V8 sandbox for data transforms and quick scripts.', category: 'Code', version: '1.5.0', permissions: ['Execute', 'Sandboxed'], agents: 7, agentNames: ['Mia', 'Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/js', auth: 'API Key', input: '{ code: string }', output: '{ result: any }' },
  { id: 'tool-008', name: 'File Reader', description: 'Read text, CSV, JSON, PDF and Office files into structured content.', category: 'Files', version: '4.0.0', permissions: ['Read', 'Filesystem'], agents: 14, agentNames: ['Aria', 'Mia', 'Cody', 'Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/read', auth: 'None', input: '{ path: string }', output: '{ content: string, meta: object }' },
  { id: 'tool-009', name: 'File Writer', description: 'Write and append files to the workspace storage with versioning.', category: 'Files', version: '3.2.0', permissions: ['Write', 'Filesystem'], agents: 9, agentNames: ['Aria', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/write', auth: 'None', input: '{ path: string, content: string }', output: '{ path: string, bytes: number }' },
  { id: 'tool-010', name: 'PDF Generator', description: 'Render HTML/markdown into branded PDF documents.', category: 'Files', version: '1.4.1', permissions: ['Write'], agents: 3, agentNames: ['Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/pdf', auth: 'API Key', input: '{ html: string }', output: '{ url: string }' },
  { id: 'tool-011', name: 'SQL', description: 'Run parameterised SQL against connected warehouses with read/write guards.', category: 'Database', version: '2.6.0', permissions: ['Read', 'Write', 'Execute'], agents: 6, agentNames: ['Finn', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/sql', auth: 'Basic Auth', input: '{ query: string, params?: any[] }', output: '{ rows: any[] }' },
  { id: 'tool-012', name: 'Vector Store', description: 'Embed and retrieve documents from the managed vector database.', category: 'Database', version: '1.8.0', permissions: ['Read', 'Write'], agents: 8, agentNames: ['Aria', 'Cody'], status: 'Enabled', endpoint: 'https://api.palladium/skills/vector', auth: 'API Key', input: '{ op: string, docs?: Doc[] }', output: '{ ids: string[], matches: Match[] }' },
  { id: 'tool-013', name: 'HTTP Request', description: 'Call any REST endpoint with retries, timeouts, and streaming support.', category: 'APIs', version: '5.0.0', permissions: ['Network'], agents: 18, agentNames: ['Aria', 'Devon', 'Finn', 'Mia'], status: 'Enabled', endpoint: 'https://api.palladium/skills/http', auth: 'None', input: '{ method, url, headers?, body? }', output: '{ status, headers, body }' },
  { id: 'tool-014', name: 'REST Client', description: 'Typed REST client with schema validation and auto-retries.', category: 'APIs', version: '2.3.0', permissions: ['Network', 'Read'], agents: 4, agentNames: ['Devon'], status: 'Enabled', endpoint: 'https://api.palladium/skills/rest', auth: 'Bearer Token', input: '{ spec: object, call: string }', output: '{ data: any }' },
  { id: 'tool-015', name: 'Git', description: 'Clone, branch, commit, and push to connected repositories.', category: 'Developer', version: '2.41.0', permissions: ['Execute', 'Network', 'Write'], agents: 7, agentNames: ['Devon', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/git', auth: 'OAuth 2.0', input: '{ repo, op, args? }', output: '{ ref: string, log: string[] }' },
  { id: 'tool-016', name: 'GitHub', description: 'Manage issues, PRs, actions, and reviews across repositories.', category: 'Developer', version: '4.2.0', permissions: ['Network', 'Read', 'Write'], agents: 9, agentNames: ['Devon', 'Cody'], status: 'Enabled', endpoint: 'https://api.palladium/skills/github', auth: 'OAuth 2.0', input: '{ repo, action, payload? }', output: '{ data: any }' },
  { id: 'tool-017', name: 'CI Runner', description: 'Trigger and monitor CI pipelines and surface failures with logs.', category: 'Developer', version: '1.7.0', permissions: ['Network', 'Execute'], agents: 3, agentNames: ['Devon'], status: 'Beta', endpoint: 'https://api.palladium/skills/ci', auth: 'Bearer Token', input: '{ pipeline: string }', output: '{ run_id, status }' },
  { id: 'tool-018', name: 'Email', description: 'Send, read, and thread emails from connected mailboxes.', category: 'Communication', version: '3.1.0', permissions: ['Network', 'Read', 'Write'], agents: 11, agentNames: ['Cody', 'Aria', 'Mia'], status: 'Enabled', endpoint: 'https://api.palladium/skills/email', auth: 'OAuth 2.0', input: '{ to, subject, body }', output: '{ message_id: string }' },
  { id: 'tool-019', name: 'Slack', description: 'Post messages, create channels, and react across Slack workspaces.', category: 'Communication', version: '2.0.4', permissions: ['Network', 'Write'], agents: 10, agentNames: ['Aria', 'Cody', 'Mia'], status: 'Enabled', endpoint: 'https://api.palladium/skills/slack', auth: 'OAuth 2.0', input: '{ channel, text }', output: '{ ts: string }' },
  { id: 'tool-020', name: 'Calendar', description: 'Create, update, and query calendar events with availability checks.', category: 'Business', version: '1.9.2', permissions: ['Network', 'Read', 'Write'], agents: 6, agentNames: ['Mia', 'Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/calendar', auth: 'OAuth 2.0', input: '{ title, start, end }', output: '{ event_id: string }' },
  { id: 'tool-021', name: 'Semantic Search', description: 'Natural-language search over indexed knowledge with citations.', category: 'Search', version: '2.2.0', permissions: ['Read'], agents: 13, agentNames: ['Aria', 'Cody', 'Leo'], status: 'Enabled', endpoint: 'https://api.palladium/skills/semantic', auth: 'API Key', input: '{ query: string, top_k?: number }', output: '{ results: Passage[] }' },
  { id: 'tool-022', name: 'RAG Retrieval', description: 'Retrieve and rank grounded context for agent prompts.', category: 'Search', version: '1.6.0', permissions: ['Read'], agents: 9, agentNames: ['Aria', 'Mia'], status: 'Enabled', endpoint: 'https://api.palladium/skills/rag', auth: 'None', input: '{ query, collection }', output: '{ context: Chunk[] }' },
  { id: 'tool-023', name: 'Scheduler', description: 'Schedule and manage recurring task runs with cron expressions.', category: 'Automation', version: '1.4.0', permissions: ['Execute'], agents: 5, agentNames: ['Aria', 'Finn'], status: 'Enabled', endpoint: 'https://api.palladium/skills/scheduler', auth: 'API Key', input: '{ cron, task_id }', output: '{ job_id: string }' },
  { id: 'tool-024', name: 'Webhook', description: 'Receive and validate inbound webhooks, trigger downstream flows.', category: 'Automation', version: '1.3.0', permissions: ['Network', 'Read'], agents: 4, agentNames: ['Devon'], status: 'Enabled', endpoint: 'https://api.palladium/skills/webhook', auth: 'Bearer Token', input: '{ event: string, payload: any }', output: '{ ack: boolean }' },
  { id: 'tool-025', name: 'CRM Sync', description: 'Two-way sync of contacts and deals with the connected CRM.', category: 'Business', version: '0.9.0', permissions: ['Network', 'Read', 'Write'], agents: 2, agentNames: ['Finn'], status: 'Beta', endpoint: 'https://api.palladium/skills/crm', auth: 'OAuth 2.0', input: '{ entity, record }', output: '{ id: string }' },
];