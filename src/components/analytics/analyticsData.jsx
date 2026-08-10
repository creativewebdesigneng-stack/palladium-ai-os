// Mock data for the PalladiumAI Analytics page. Backend ready.

export const METRICS = [
  { id: 'users', label: 'Users', value: '1,284', delta: '+8.6%', up: true },
  { id: 'sessions', label: 'Sessions', value: '18,420', delta: '+12.1%', up: true },
  { id: 'projects', label: 'Projects', value: '42', delta: '+3', up: true },
  { id: 'agents', label: 'Agents', value: '24', delta: '+2', up: true },
  { id: 'tasks', label: 'Tasks', value: '3,640', delta: '+212', up: true },
  { id: 'workflows', label: 'Workflows', value: '128', delta: '+9', up: true },
  { id: 'ai-requests', label: 'AI Requests', value: '184,320', delta: '+12.4%', up: true },
  { id: 'api-requests', label: 'API Requests', value: '2.1M', delta: '+6.8%', up: true },
  { id: 'errors', label: 'Errors', value: '42', delta: '-23%', up: true },
  { id: 'costs', label: 'Costs', value: '$96,840', delta: '+4.1%', up: false },
];

export const ACTIVITY = {
  daily: [
    { k: '00', users: 120, requests: 4200 }, { k: '02', users: 80, requests: 3100 }, { k: '04', users: 40, requests: 1800 },
    { k: '06', users: 220, requests: 5400 }, { k: '08', users: 680, requests: 12400 }, { k: '10', users: 920, requests: 18600 },
    { k: '12', users: 1040, requests: 21200 }, { k: '14', users: 880, requests: 19800 }, { k: '16', users: 760, requests: 16400 },
    { k: '18', users: 540, requests: 11200 }, { k: '20', users: 420, requests: 8800 }, { k: '22', users: 240, requests: 5200 },
  ],
  weekly: [
    { k: 'Mon', users: 4200, requests: 84000 }, { k: 'Tue', users: 4800, requests: 92000 },
    { k: 'Wed', users: 5200, requests: 101000 }, { k: 'Thu', users: 6100, requests: 118000 },
    { k: 'Fri', users: 6800, requests: 132000 }, { k: 'Sat', users: 3100, requests: 58000 },
    { k: 'Sun', users: 2400, requests: 46000 },
  ],
  monthly: [
    { k: 'Mar', users: 18200, requests: 340000 }, { k: 'Apr', users: 19800, requests: 392000 },
    { k: 'May', users: 21200, requests: 418000 }, { k: 'Jun', users: 23400, requests: 472000 },
    { k: 'Jul', users: 25600, requests: 514000 }, { k: 'Aug', users: 28420, requests: 582000 },
  ],
};

export const AGENT_ANALYTICS = [
  { agent: 'Support Triage', tasks: 1840, requests: 42100, success: 94, cost: 1840 },
  { agent: 'Research Bot', tasks: 1240, requests: 38900, success: 88, cost: 2120 },
  { agent: 'Data Analyst', tasks: 980, requests: 24800, success: 91, cost: 980 },
  { agent: 'Content Writer', tasks: 760, requests: 16400, success: 86, cost: 620 },
  { agent: 'Code Reviewer', tasks: 540, requests: 12800, success: 97, cost: 740 },
];

export const PROJECT_ANALYTICS = [
  { project: 'Palladium App', agents: 8, tasks: 1640, requests: 84200, completion: 78 },
  { project: 'Palladium API', agents: 4, tasks: 920, requests: 48400, completion: 64 },
  { project: 'Marketing Site', agents: 2, tasks: 420, requests: 12800, completion: 92 },
  { project: 'Docs Portal', agents: 3, tasks: 660, requests: 18900, completion: 41 },
];

export const TEAM_ANALYTICS = [
  { team: 'Platform', members: 8, requests: 64200, tasks: 1240, cost: 28400 },
  { team: 'Growth', members: 5, requests: 38200, tasks: 920, cost: 14800 },
  { team: 'Customer Success', members: 6, requests: 41600, tasks: 1080, cost: 9200 },
  { team: 'Founders', members: 3, requests: 22800, tasks: 400, cost: 18400 },
];

export const INTEGRATION_ANALYTICS = [
  { integration: 'GitHub', calls: 18200, status: 'healthy', lastSync: '2m ago' },
  { integration: 'Slack', calls: 9400, status: 'healthy', lastSync: '1m ago' },
  { integration: 'Google Calendar', calls: 6200, status: 'degraded', lastSync: '14m ago' },
  { integration: 'Stripe', calls: 3100, status: 'healthy', lastSync: '3m ago' },
  { integration: 'Notion', calls: 2800, status: 'down', lastSync: '2h ago' },
];

export const MODEL_ANALYTICS = [
  { model: 'Claude Sonnet', requests: 64200, tokens: '2.1M', cost: '$24,800', latency: '142ms' },
  { model: 'GPT-5', requests: 48800, tokens: '1.4M', cost: '$18,200', latency: '188ms' },
  { model: 'Gemini 3 Flash', requests: 38400, tokens: '980K', cost: '$8,400', latency: '94ms' },
  { model: 'Claude Opus', requests: 16200, tokens: '420K', cost: '$12,600', latency: '310ms' },
  { model: 'Llama 3.3', requests: 9800, tokens: '210K', cost: '$1,200', latency: '120ms' },
];

export const FILTERS = {
  dates: ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'This quarter', 'This year'],
  users: ['All users', 'Aria Khan', 'Devon Lee', 'Finn Park', 'Maya Rao'],
  teams: ['All teams', 'Platform', 'Growth', 'Customer Success', 'Founders'],
  agents: ['All agents', 'Support Triage', 'Research Bot', 'Data Analyst', 'Content Writer', 'Code Reviewer'],
  projects: ['All projects', 'Palladium App', 'Palladium API', 'Marketing Site', 'Docs Portal'],
  models: ['All models', 'Claude Sonnet', 'GPT-5', 'Gemini 3 Flash', 'Claude Opus', 'Llama 3.3'],
};

export const INTEGRATION_STATUS = { healthy: 'text-emerald-400 bg-emerald-400/10', degraded: 'text-amber-400 bg-amber-400/10', down: 'text-rose-400 bg-rose-400/10' };