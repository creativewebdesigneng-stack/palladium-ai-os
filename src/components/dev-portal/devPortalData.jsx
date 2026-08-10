// Mock data for the PalladiumAI Developer Portal. Backend ready.
// Secrets are intentionally masked — never expose full key material in the UI.

export const API_KEYS = [
  { id: 'key_8f2', name: 'Production Server', prefix: 'pk_live_8f2a', masked: 'pk_live_8f2a••••••••3a7f', created: 'Aug 1, 2026', lastUsed: '2m ago', status: 'active' },
  { id: 'key_8e1', name: 'Staging CI', prefix: 'pk_test_4e5f', masked: 'pk_test_4e5f••••••••9b2c', created: 'Jul 22, 2026', lastUsed: '1h ago', status: 'active' },
  { id: 'key_8c0', name: 'Mobile App', prefix: 'pk_live_2c3d', masked: 'pk_live_2c3d••••••••6d8e', created: 'Jul 3, 2026', lastUsed: '3d ago', status: 'revoked' },
];

export const KEY_STATUS_STYLE = { active: 'text-emerald-400 bg-emerald-400/10', revoked: 'text-zinc-500 bg-white/5' };

export const DOCS_NAV = [
  { id: 'authentication', label: 'Authentication' },
  { id: 'agents', label: 'Agents' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'files', label: 'Files' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'webhooks', label: 'Webhooks' },
];

export const DOCS = {
  authentication: {
    title: 'Authentication',
    desc: 'All API requests require a Bearer token. Create a key in the API Keys panel and send it in the Authorization header.',
    code: `curl https://api.palladium.ai/v1/agents \\\n  -H "Authorization: Bearer pk_live_..."`,
    points: ['Keys are scoped per environment (live/test).', 'Rotate keys regularly; revoke immediately if leaked.', 'Never expose full secrets in client code.'],
  },
  agents: {
    title: 'Agents',
    desc: 'Create, configure, and run AI agents. Agents have a model, instructions, tools, and memory.',
    code: `POST /v1/agents\n{\n  "name": "Support Triage",\n  "model": "claude-sonnet",\n  "tools": ["search", "email"]\n}`,
    points: ['List agents with GET /v1/agents.', 'Run an agent with POST /v1/agents/:id/run.', 'Stream responses via SSE.'],
  },
  projects: {
    title: 'Projects',
    desc: 'Projects group agents, workflows, and resources for a workspace.',
    code: `GET /v1/projects\nPOST /v1/projects\nDELETE /v1/projects/:id`,
    points: ['Projects isolate members and settings.', 'Archive projects instead of deleting.'],
  },
  tasks: {
    title: 'Tasks',
    desc: 'Tasks are unit work items assigned to agents or humans.',
    code: `POST /v1/tasks\n{\n  "title": "Review PR #482",\n  "assignee": "agent_triage"\n}`,
    points: ['Tasks move through statuses: todo → in_progress → done.', 'Subscribe to task events via webhooks.'],
  },
  workflows: {
    title: 'Workflows',
    desc: 'Workflows orchestrate triggers, conditions, and multi-agent steps.',
    code: `POST /v1/workflows\n{\n  "trigger": "schedule",\n  "steps": [ { "call": "agent.run" } ]\n}`,
    points: ['Workflows are durable across restarts.', 'Inspect run history with GET /v1/workflows/:id/runs.'],
  },
  files: {
    title: 'Files',
    desc: 'Upload, store, and retrieve files linked to projects.',
    code: `POST /v1/files/upload\n  multipart/form-data`,
    points: ['Private files require a signed URL.', 'Files are virus-scanned on upload.'],
  },
  knowledge: {
    title: 'Knowledge',
    desc: 'Index knowledge bases for retrieval-augmented generation.',
    code: `POST /v1/knowledge\n{\n  "name": "Product Docs",\n  "sources": ["https://docs.palladium.ai"]\n}`,
    points: ['Chunking and embeddings run automatically.', 'Query with POST /v1/knowledge/:id/query.'],
  },
  integrations: {
    title: 'Integrations',
    desc: 'Connect external services via OAuth connectors or custom APIs.',
    code: `GET /v1/integrations\nPOST /v1/integrations/connect`,
    points: ['Shared tokens act on the workspace behalf.', 'App-user connectors per-user consent.'],
  },
  webhooks: {
    title: 'Webhooks',
    desc: 'Receive real-time events for agents, tasks, and deployments.',
    code: `POST /v1/webhooks\n{\n  "url": "https://app.example.com/hook",\n  "events": ["agent.run.completed"]\n}`,
    points: ['Verify signatures with the webhook secret.', 'Retries use exponential backoff.'],
  },
};

export const ENDPOINTS = [
  { method: 'GET', path: '/v1/agents', desc: 'List agents' },
  { method: 'POST', path: '/v1/agents', desc: 'Create an agent' },
  { method: 'GET', path: '/v1/agents/:id', desc: 'Get an agent' },
  { method: 'POST', path: '/v1/agents/:id/run', desc: 'Run an agent (execution API)' },
  { method: 'GET', path: '/v1/tasks', desc: 'List tasks' },
  { method: 'POST', path: '/v1/tasks', desc: 'Create a task' },
  { method: 'GET', path: '/v1/workflows', desc: 'List workflows' },
  { method: 'POST', path: '/v1/workflows/:id/run', desc: 'Run a workflow (execution API)' },
  { method: 'GET', path: '/v1/workforces', desc: 'List workforces and members' },
  { method: 'GET', path: '/v1/marketplace', desc: 'Browse published marketplace agents' },
  { method: 'GET', path: '/v1/usage', desc: 'Usage and plan limits for this month' },
];

export const METHOD_STYLE = {
  GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  POST: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const SAMPLE_RESPONSES = {
  GET: { status: 200, body: '{\n  "data": [\n    { "id": "agent_01", "name": "Support Triage", "model": "claude-sonnet" },\n    { "id": "agent_02", "name": "Research Bot", "model": "gpt-5" }\n  ],\n  "total": 2\n}' },
  POST: { status: 201, body: '{\n  "id": "agent_03",\n  "name": "New Agent",\n  "model": "claude-sonnet",\n  "status": "ready"\n}' },
  PUT: { status: 200, body: '{\n  "id": "agent_03",\n  "name": "Renamed Agent",\n  "updated": true\n}' },
  DELETE: { status: 204, body: '' },
};

export const WEBHOOKS = [
  { id: 'wh_8f2', url: 'https://app.example.com/hooks/agents', event: 'agent.run.completed', secret: 'whsec_••••••••3a7f', status: 'active', deliveries: 1284 },
  { id: 'wh_8e1', url: 'https://app.example.com/hooks/tasks', event: 'task.status.changed', secret: 'whsec_••••••••9b2c', status: 'active', deliveries: 642 },
  { id: 'wh_8c0', url: 'https://app.example.com/hooks/deploys', event: 'deployment.failed', secret: 'whsec_••••••••6d8e', status: 'paused', deliveries: 31 },
];

export const WEBHOOK_EVENTS = [
  'agent.completed',
  'agent.failed',
  'task.completed',
  'workflow.completed',
  'approval.required',
  'purchase.completed',
];

export const SDKS = {
  JavaScript: {
    install: 'npm install @palladium/sdk',
    code: `import { Palladium } from '@palladium/sdk';

const client = new Palladium({ apiKey: process.env.PALLADIUM_KEY });

const agents = await client.agents.list();
const run = await client.agents.run('agent_01', { input: 'Summarize this' });`,
  },
  TypeScript: {
    install: 'npm install @palladium/sdk',
    code: `import { Palladium } from '@palladium/sdk';

const client = new Palladium({ apiKey: process.env.PALLADIUM_KEY! });

const agents = await client.agents.list();
console.log(agents.total);`,
  },
  Python: {
    install: 'pip install palladium',
    code: `from palladium import Palladium

client = Palladium(api_key=os.environ["PALLADIUM_KEY"])

agents = client.agents.list()
run = client.agents.run("agent_01", input="Summarize this")`,
  },
  REST: {
    install: '# any HTTP client',
    code: `curl https://api.palladium.ai/v1/agents \\\n  -H "Authorization: Bearer pk_live_..." \\\n  -H "Content-Type: application/json"`,
  },
};

export const USAGE = {
  requests: 184320,
  requestsDelta: '+12%',
  tokens: 4_820_000,
  tokensDelta: '+8%',
  errors: 42,
  errorsDelta: '-23%',
  avgLatency: '142ms',
  series: [12, 18, 14, 22, 28, 24, 32, 38, 30, 36, 44, 40],
};

export const LOGS = [
  { t: '11:45:02', method: 'POST', path: '/v1/agents/agent_01/run', status: 200, ms: 142, ip: '203.0.113.9' },
  { t: '11:44:51', method: 'GET', path: '/v1/agents', status: 200, ms: 38, ip: '203.0.113.9' },
  { t: '11:44:33', method: 'POST', path: '/v1/tasks', status: 201, ms: 54, ip: '198.51.100.4' },
  { t: '11:44:08', method: 'DELETE', path: '/v1/agents/agent_03', status: 204, ms: 22, ip: '198.51.100.4' },
  { t: '11:43:47', method: 'GET', path: '/v1/workflows', status: 401, ms: 9, ip: '192.0.2.7' },
  { t: '11:43:22', method: 'PUT', path: '/v1/agents/agent_02', status: 400, ms: 18, ip: '203.0.113.9' },
  { t: '11:42:58', method: 'GET', path: '/v1/projects', status: 200, ms: 31, ip: '198.51.100.4' },
];

export const LOG_STATUS_STYLE = { 200: 'text-emerald-400', 201: 'text-emerald-400', 204: 'text-emerald-400', 400: 'text-amber-400', 401: 'text-rose-400', 500: 'text-rose-400' };