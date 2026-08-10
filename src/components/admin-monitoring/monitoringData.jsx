// Mock infrastructure monitoring data for the PalladiumAI Admin System Monitoring — illustrative, backend-ready.

export const HEALTH = {
  operational: { label: 'Operational', tone: 'text-emerald-300 bg-emerald-500/15', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30' },
  degraded: { label: 'Degraded', tone: 'text-amber-300 bg-amber-500/15', dot: 'bg-amber-400', ring: 'ring-amber-400/30' },
  down: { label: 'Down', tone: 'text-rose-300 bg-rose-500/15', dot: 'bg-rose-400', ring: 'ring-rose-400/30' },
};

export const SERVICES = [
  { id: 'api', name: 'API Status', health: 'operational', uptime: 99.982, latency: 142, note: 'All endpoints responding nominally.' },
  { id: 'db', name: 'Database', health: 'operational', uptime: 99.999, latency: 18, note: 'Primary replica healthy; lag 0.4ms.' },
  { id: 'ai', name: 'AI Services', health: 'degraded', uptime: 99.74, latency: 1840, note: 'OpenAI experiencing elevated latency.' },
  { id: 'orchestrator', name: 'Agent Orchestrator', health: 'operational', uptime: 99.95, latency: 310, note: '3 active agent runs across 2 orgs.' },
  { id: 'queue', name: 'Queue', health: 'operational', uptime: 99.99, latency: 22, note: 'Backlog nominal — 412 pending jobs.' },
  { id: 'storage', name: 'Storage', health: 'operational', uptime: 99.97, latency: 88, note: 'Object store healthy, 2.4TB free.' },
  { id: 'search', name: 'Search', health: 'degraded', uptime: 99.60, latency: 620, note: 'Index rebuild in progress for org 412.' },
  { id: 'webhooks', name: 'Webhooks', health: 'operational', uptime: 99.88, latency: 140, note: 'Delivery success 99.2% last hour.' },
  { id: 'workers', name: 'Workers', health: 'operational', uptime: 99.92, latency: 96, note: '8 workers online, 0 dead-letter.' },
];

// sparkline-friendly metric series (most recent last)
export const METRICS = {
  cpu: { label: 'CPU', unit: '%', value: 42, series: [30, 36, 41, 38, 44, 48, 42, 39, 46, 51, 47, 42], tone: 'violet' },
  memory: { label: 'Memory', unit: '%', value: 68, series: [55, 58, 61, 60, 64, 67, 66, 68, 71, 70, 69, 68], tone: 'cyan' },
  requests: { label: 'Requests', unit: '/min', value: 8420, series: [6200, 6800, 7100, 7600, 7400, 7900, 8100, 7700, 8200, 8400, 8100, 8420], tone: 'emerald' },
  latency: { label: 'Latency', unit: 'ms', value: 142, series: [120, 128, 135, 140, 138, 148, 160, 152, 144, 138, 140, 142], tone: 'amber' },
  errors: { label: 'Errors', unit: '/min', value: 6, series: [2, 1, 3, 2, 4, 8, 12, 9, 7, 5, 6, 6], tone: 'rose' },
  queue: { label: 'Queue Size', unit: 'jobs', value: 412, series: [380, 395, 410, 405, 420, 460, 480, 440, 420, 415, 410, 412], tone: 'blue' },
};

export const INCIDENTS = [
  { id: 'INC-2042', title: 'Elevated OpenAI latency', service: 'AI Services', severity: 'degraded', status: 'Investigating', started: '2026-08-07T11:48:00', updated: '2026-08-07T12:30:00', summary: 'p95 latency on completion requests rose to 1.8s. Failover to Anthropic enabled as fallback.' },
  { id: 'INC-2041', title: 'Search index rebuild', service: 'Search', severity: 'degraded', status: 'Monitoring', started: '2026-08-07T11:10:00', updated: '2026-08-07T12:15:00', summary: 'Reindexing org 412 after schema migration. Query latency temporarily elevated.' },
  { id: 'INC-2040', title: 'Webhook delivery delay', service: 'Webhooks', severity: 'degraded', status: 'Resolved', started: '2026-08-07T09:20:00', updated: '2026-08-07T10:02:00', summary: 'Transient backlog cleared; delivery SLA restored.' },
  { id: 'INC-2039', title: 'Worker node restart', service: 'Workers', severity: 'operational', status: 'Resolved', started: '2026-08-06T22:14:00', updated: '2026-08-06T22:21:00', summary: 'Auto-scaling cycled a worker; no jobs lost.' },
];

export const LOGS = [
  { ts: '2026-08-07T12:32:14', level: 'info', service: 'api', msg: 'GET /v2/agents 200 — 128ms' },
  { ts: '2026-08-07T12:32:11', level: 'warn', service: 'ai', msg: 'openai completion slow: 1840ms (threshold 1200ms)' },
  { ts: '2026-08-07T12:32:08', level: 'info', service: 'orchestrator', msg: 'Agent run run_8842 step 4/7 completed' },
  { ts: '2026-08-07T12:32:02', level: 'error', service: 'search', msg: 'index shard-3 lag 620ms — reindex in progress' },
  { ts: '2026-08-07T12:31:58', level: 'info', service: 'queue', msg: 'enqueued job job_22418 priority=normal' },
  { ts: '2026-08-07T12:31:51', level: 'info', service: 'webhooks', msg: 'delivered event agent.deployed to 3 subscribers' },
  { ts: '2026-08-07T12:31:44', level: 'error', service: 'api', msg: 'POST /v2/billing/webhook 502 — upstream timeout' },
  { ts: '2026-08-07T12:31:38', level: 'info', service: 'storage', msg: 'uploaded asset a_882410 (2.1MB) to palladium-assets-prod' },
  { ts: '2026-08-07T12:31:31', level: 'warn', service: 'workers', msg: 'worker w-4 memory 78% — auto-restart scheduled' },
  { ts: '2026-08-07T12:31:24', level: 'info', service: 'db', msg: 'replication lag 0.4ms — within SLA' },
  { ts: '2026-08-07T12:31:18', level: 'info', service: 'orchestrator', msg: 'Agent run run_8841 completed (7 steps, 14.2s)' },
  { ts: '2026-08-07T12:31:11', level: 'error', service: 'ai', msg: 'anthropic rate limit hit — retrying with backoff (attempt 2/3)' },
];

export const LOG_LEVELS = {
  info: 'text-zinc-400',
  warn: 'text-amber-300',
  error: 'text-rose-300',
};