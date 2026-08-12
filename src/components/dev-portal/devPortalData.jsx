// Developer Portal reference data.
//
// Every endpoint, field and event documented here maps to a real handler in
// `src/routes/api/public/v1/*` or a real emitter in the runtime. Nothing
// aspirational is listed — if it is not implemented, it is not documented.
import { API_PLAN_LIMITS, API_SCOPES, WEBHOOK_EVENT_TYPES } from '@/lib/devapi/plans';

export const API_BASE = '/api/public/v1';

export const KEY_STATUS_STYLE = {
  active: 'text-emerald-400 bg-emerald-400/10',
  revoked: 'text-zinc-500 bg-white/5',
  expired: 'text-amber-400 bg-amber-400/10',
};

export const SCOPES = [...API_SCOPES];
export const WEBHOOK_EVENTS = [...WEBHOOK_EVENT_TYPES];

export const KEY_EXPIRY_OPTIONS = [
  { label: 'No expiry', days: null },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
];

export const ENDPOINTS = [
  { method: 'GET', path: `${API_BASE}/agents`, desc: 'List agents', scope: 'agents:read' },
  { method: 'POST', path: `${API_BASE}/agents`, desc: 'Create an agent', scope: 'agents:write' },
  { method: 'GET', path: `${API_BASE}/agents/{id}`, desc: 'Retrieve an agent', scope: 'agents:read' },
  { method: 'POST', path: `${API_BASE}/agents/{id}/run`, desc: 'Execute an agent', scope: 'agents:run', execution: true },
  { method: 'GET', path: `${API_BASE}/tasks`, desc: 'List agent runs / tasks', scope: 'tasks:read' },
  { method: 'POST', path: `${API_BASE}/tasks`, desc: 'Queue a task', scope: 'tasks:write' },
  { method: 'GET', path: `${API_BASE}/workflows`, desc: 'List workflows', scope: 'workflows:read' },
  { method: 'POST', path: `${API_BASE}/workflows/{id}/run`, desc: 'Execute a workflow', scope: 'workflows:run', execution: true },
  { method: 'GET', path: `${API_BASE}/workforces`, desc: 'List workforces and members', scope: 'workforces:read' },
  { method: 'GET', path: `${API_BASE}/marketplace`, desc: 'Browse published listings', scope: 'marketplace:read' },
  { method: 'GET', path: `${API_BASE}/usage`, desc: 'Usage and plan limits this month', scope: 'usage:read' },
];

export const METHOD_STYLE = {
  GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  POST: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const LOG_STATUS_STYLE = {
  200: 'text-emerald-400',
  201: 'text-emerald-400',
  400: 'text-amber-400',
  401: 'text-rose-400',
  403: 'text-rose-400',
  404: 'text-amber-400',
  422: 'text-amber-400',
  429: 'text-orange-400',
  500: 'text-rose-400',
};

const planRow = (code) => {
  const p = API_PLAN_LIMITS[code];
  return `${p.label.padEnd(11)} ${String(p.requestsPerMinute).padStart(6)} req/min  ${String(p.requestsPerDay).padStart(9)} req/day  ${p.execution ? `${p.executionsPerDay} runs/day` : 'no execution API'}`;
};

export const DOCS_NAV = [
  { id: 'authentication', label: 'Authentication' },
  { id: 'rate-limits', label: 'Rate limits' },
  { id: 'errors', label: 'Errors' },
  { id: 'agents', label: 'Agents' },
  { id: 'execution', label: 'Agent execution' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'workforces', label: 'Workforces' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'usage', label: 'Usage' },
  { id: 'webhooks', label: 'Webhooks' },
];

export const DOCS = {
  authentication: {
    title: 'Authentication',
    desc: `Every request to ${API_BASE} is authenticated with an API key created in the API Keys panel. Send it as a bearer token (an \`X-API-Key\` header is also accepted). Keys are stored only as a SHA-256 hash, so the full value is shown once at creation and can never be recovered.`,
    code: `curl https://your-app.lovable.app${API_BASE}/agents \\
  -H "Authorization: Bearer pk_live_..."

# Equivalent
curl https://your-app.lovable.app${API_BASE}/agents \\
  -H "X-API-Key: pk_live_..."`,
    points: [
      'Keys carry an environment (live/test) and a scope list; a request missing the endpoint scope returns 403 insufficient_scope.',
      'Optional expiry: an expired key returns 401 expired_api_key; a revoked key returns 401 revoked_api_key.',
      'Requests resolve to the key owner (and their organisation when the key is org-scoped) — data is never cross-tenant.',
      'Never ship a key to a browser or mobile client. Call the API from your own server.',
    ],
  },
  'rate-limits': {
    title: 'Rate limits',
    desc: 'Limits are enforced server-side from the request log — they cannot be bypassed by the client. Per-minute and per-day ceilings apply to every endpoint; execution endpoints (agent and workflow runs) carry an additional daily ceiling and are disabled entirely on Explorer.',
    code: `# Enforced ceilings by plan
${planRow('explorer')}
${planRow('builder')}
${planRow('business')}
${planRow('enterprise')}

# Every successful response carries
X-RateLimit-Limit: 120
X-Palladium-Plan: builder`,
    points: [
      'Exceeding the minute window returns 429 rate_limit_exceeded; the daily window returns 429 daily_quota_exceeded.',
      'Execution beyond the daily run ceiling returns 429 execution_quota_exceeded.',
      'Explorer keys calling an execution endpoint receive 403 plan_execution_disabled.',
      'Active key and webhook counts are also capped per plan.',
    ],
  },
  errors: {
    title: 'Errors',
    desc: 'Errors use conventional HTTP status codes with a stable machine-readable code. Successful payloads are always wrapped in a `data` object.',
    code: `// Success
{ "data": { "agents": [ ... ], "limit": 25, "offset": 0 } }

// Failure
{
  "error": {
    "code": "insufficient_scope",
    "message": "This key is missing the \`agents:run\` scope.",
    "required_scope": "agents:run"
  }
}`,
    points: [
      '401 — missing_api_key, invalid_api_key, revoked_api_key, expired_api_key.',
      '403 — insufficient_scope, plan_execution_disabled.',
      '429 — rate_limit_exceeded, daily_quota_exceeded, execution_quota_exceeded.',
      '400/404/422 — invalid_body, invalid_request, not_found, create_failed, run_failed.',
      'Every request (including failures) is written to the request log visible in the Logs panel.',
    ],
  },
  agents: {
    title: 'Agents',
    desc: 'List, create and retrieve the agents in your workspace. Listing supports `limit` (1–100, default 25) and `offset`.',
    code: `GET ${API_BASE}/agents?limit=25&offset=0
// scope: agents:read
{ "data": { "agents": [{ "id", "name", "category", "purpose",
  "status", "autonomy", "allowed_tools", "requires_approval",
  "created_at" }], "limit": 25, "offset": 0 } }

POST ${API_BASE}/agents          // scope: agents:write
{
  "name": "Support Triage",
  "category": "support",
  "purpose": "Triage inbound tickets",
  "instructions": "Classify, then summarise.",
  "allowed_tools": ["web_search"],
  "requires_approval": true
}

GET ${API_BASE}/agents/{id}      // scope: agents:read`,
    points: [
      '`name` is required on create; `requires_approval` defaults to true.',
      'Retrieving a single agent also returns its instructions and preferences.',
      'An unknown id returns 404 not_found — ids are only resolvable within your own tenancy.',
    ],
  },
  execution: {
    title: 'Agent execution',
    desc: 'Runs an agent through the production runtime: permissions, spend limits, tools, memory recall and usage recording all apply. The call is synchronous and returns the completed task record.',
    code: `POST ${API_BASE}/agents/{id}/run
// scope: agents:run — execution API (Builder and above)
{ "input": "Summarise yesterday's support tickets" }

{ "data": { "task": { "id", "status", "output_text",
  "tokens_in", "tokens_out", "cost_pence", "duration_ms" },
  "output": "..." } }`,
    points: [
      '`input` is required (max 20,000 characters).',
      'A failed run returns 422 run_failed and the task is marked failed.',
      'The runtime emits agent.completed / task.completed on success and agent.failed on failure.',
      'Runs consume the plan execution quota and are billed against your usage.',
    ],
  },
  tasks: {
    title: 'Tasks',
    desc: 'Read agent run history and queue new work. Listing accepts `status`, `limit` and `offset`.',
    code: `GET ${API_BASE}/tasks?status=completed&limit=25
// scope: tasks:read
{ "data": { "tasks": [{ "id", "agent_id", "title", "status",
  "input", "output_text", "tokens_in", "tokens_out",
  "cost_pence", "duration_ms", "created_at", "completed_at" }] } }

POST ${API_BASE}/tasks           // scope: tasks:write
{
  "request": "Book a courier for tomorrow morning",
  "agent_id": "…",
  "title": "Courier booking",
  "category": "logistics",
  "scope": "personal",
  "requires_approval": true,
  "involves_money": true
}`,
    points: [
      '`request` is required (max 8,000 characters); `title` defaults to its first 80 characters.',
      '`scope` accepts `personal` or `professional`.',
      'Tasks that involve money or are flagged for approval wait in the Approval Centre — they never spend autonomously.',
    ],
  },
  workflows: {
    title: 'Workflows',
    desc: 'List workflows and trigger a run through the multi-agent workforce engine (sequential, parallel and conditional steps).',
    code: `GET ${API_BASE}/workflows        // scope: workflows:read
{ "data": { "workflows": [{ "id", "name", "description",
  "trigger_type", "schedule", "status", "created_at" }] } }

POST ${API_BASE}/workflows/{id}/run
// scope: workflows:run — execution API
{ "input": "Prepare the weekly revenue brief" }

{ "data": { "run": { "id", "status", "…" },
  "output": "…", "steps": [{ "name", "status", "attempts" }] } }`,
    points: [
      '`input` (alias `objective`) is required.',
      'Runs are recorded with trigger `api` and emit workflow.completed when they finish.',
      'A rejected run returns 400 run_failed with the engine\u2019s reason.',
    ],
  },
  workforces: {
    title: 'Workforces',
    desc: 'Lists your workforces with their agent membership and roles.',
    code: `GET ${API_BASE}/workforces?limit=25
// scope: workforces:read
{ "data": { "workforces": [{ "id", "name", "purpose",
  "department", "status", "created_at",
  "members": [{ "agent_id", "role" }] }] } }`,
    points: [
      'Membership is expanded in a single call — no N+1 requests needed.',
      'Scoped to your organisation when the key belongs to one, otherwise to your user.',
    ],
  },
  marketplace: {
    title: 'Marketplace',
    desc: 'Read-only catalogue of published marketplace agents, ordered by install count. Accepts `category`, `limit` and `offset`.',
    code: `GET ${API_BASE}/marketplace?category=finance
// scope: marketplace:read
{ "data": { "listings": [{ "id", "title", "slug", "summary",
  "category", "tags", "icon", "price_pence", "currency",
  "install_count", "rating_avg", "rating_count",
  "published_at" }] } }`,
    points: [
      'Only listings with status `published` are returned.',
      'Prices are integer pence in the listing currency.',
    ],
  },
  usage: {
    title: 'Usage',
    desc: 'Month-to-date consumption for the key owner (or organisation) plus the plan ceilings currently enforced.',
    code: `GET ${API_BASE}/usage            // scope: usage:read
{ "data": {
  "period_start": "2026-08-01T00:00:00.000Z",
  "plan": { "code", "requests_per_minute", "requests_per_day",
            "executions_per_day", "execution_api" },
  "agent_runs": 128, "failed_runs": 2,
  "tokens_in": 481203, "tokens_out": 96412,
  "cost_pence": 1840, "api_requests": 5210 } }`,
    points: [
      'The period always starts at the first day of the current UTC month.',
      '`cost_pence` is the recorded model spend for the period.',
    ],
  },
  webhooks: {
    title: 'Webhooks',
    desc: 'Subscribe an HTTPS endpoint to platform events. Every delivery is signed with HMAC-SHA256 over `{timestamp}.{body}` using your signing secret, which is shown once at creation and can be rotated or revoked at any time.',
    code: `// Headers on every delivery
X-Palladium-Event: agent.completed
X-Palladium-Timestamp: 1775049600
X-Palladium-Signature: v1=<hex hmac sha256>

// Body
{ "id": "…", "event": "agent.completed",
  "created_at": "…", "data": { … } }

// Node verification
import { createHmac, timingSafeEqual } from 'crypto';

const ts = req.headers['x-palladium-timestamp'];
const expected = createHmac('sha256', process.env.PALLADIUM_WEBHOOK_SECRET)
  .update(\`\${ts}.\${rawBody}\`)
  .digest('hex');
const sent = String(req.headers['x-palladium-signature']).replace('v1=', '');
const ok = timingSafeEqual(Buffer.from(sent), Buffer.from(expected));`,
    points: [
      `Events: ${WEBHOOK_EVENTS.join(', ')}.`,
      'Compare signatures in constant time and reject timestamps older than five minutes to prevent replay.',
      'Respond 2xx within 8 seconds; anything else is recorded as a failed delivery.',
      'A webhook is paused automatically after 20 consecutive failures, and revoking the secret pauses it immediately — unsigned payloads are never sent.',
      'Rotate the secret from the Webhooks panel; the new value is displayed once.',
    ],
  },
};

export const SDKS = {
  cURL: {
    install: '# any HTTP client',
    lang: 'js',
    code: `# List agents
curl https://your-app.lovable.app${API_BASE}/agents \\
  -H "Authorization: Bearer $PALLADIUM_KEY"

# Execute an agent
curl -X POST https://your-app.lovable.app${API_BASE}/agents/AGENT_ID/run \\
  -H "Authorization: Bearer $PALLADIUM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input":"Summarise yesterday\\'s tickets"}'`,
  },
  JavaScript: {
    install: '# no dependency required — uses fetch',
    lang: 'ts',
    code: `const BASE = 'https://your-app.lovable.app${API_BASE}';

async function palladium(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: \`Bearer \${process.env.PALLADIUM_KEY}\`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  return json.data;
}

const { agents } = await palladium('/agents');
const run = await palladium(\`/agents/\${agents[0].id}/run\`, {
  method: 'POST',
  body: JSON.stringify({ input: 'Summarise yesterday\\'s tickets' }),
});`,
  },
  Python: {
    install: 'pip install requests',
    lang: 'py',
    code: `import os, requests

BASE = "https://your-app.lovable.app${API_BASE}"
HEADERS = {"Authorization": f"Bearer {os.environ['PALLADIUM_KEY']}"}

agents = requests.get(f"{BASE}/agents", headers=HEADERS).json()["data"]["agents"]

run = requests.post(
    f"{BASE}/agents/{agents[0]['id']}/run",
    headers=HEADERS,
    json={"input": "Summarise yesterday's tickets"},
).json()["data"]

print(run["output"])`,
  },
};
