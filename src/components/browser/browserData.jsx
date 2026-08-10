// Mock data for the Browser Preview. Backend ready — every device size,
// console entry, network call, and error is a thin stub a real preview
// runner can populate without touching the UI.

export const DEVICES = {
  desktop: { w: 1280, h: 800, label: 'Desktop' },
  tablet: { w: 768, h: 1024, label: 'Tablet' },
  mobile: { w: 375, h: 667, label: 'Mobile' },
};

export const HISTORY = ['https://app.palladium.ai/', 'https://app.palladium.ai/dashboard', 'https://app.palladium.ai/agents'];

export const CONSOLE = [
  { level: 'log', src: 'app', msg: 'App mounted in 312ms' },
  { level: 'info', src: 'router', msg: 'navigated to /dashboard' },
  { level: 'warn', src: 'auth', msg: 'Token nearing expiry (renew < 5m)' },
  { level: 'error', src: 'agents', msg: 'Uncaught TypeError: agent.run is not a function' },
  { level: 'log', src: 'api', msg: 'GET /api/me 200 14ms' },
  { level: 'error', src: 'agents', msg: 'Failed prop type: `name` is required in <AgentCard>' },
  { level: 'warn', src: 'perf', msg: 'Large layout shift (0.42) on /agents' },
  { level: 'log', src: 'app', msg: 'HMR connected' },
];

export const CONSOLE_STYLE = {
  log: 'text-zinc-400', info: 'text-sky-400', warn: 'text-amber-400', error: 'text-rose-400', debug: 'text-zinc-500',
};

export const NETWORK = [
  { method: 'GET', url: '/api/me', status: 200, type: 'xhr', time: 14, size: '1.2 kB' },
  { method: 'GET', url: '/api/agents', status: 200, type: 'xhr', time: 38, size: '8.4 kB' },
  { method: 'POST', url: '/api/agents/run', status: 500, type: 'xhr', time: 240, size: '0.3 kB' },
  { method: 'GET', url: '/assets/index.css', status: 200, type: 'css', time: 6, size: '3.1 kB' },
  { method: 'GET', url: '/assets/index.js', status: 200, type: 'js', time: 22, size: '142 kB' },
  { method: 'GET', url: '/assets/logo.svg', status: 200, type: 'img', time: 4, size: '0.8 kB' },
  { method: 'WS', url: 'wss://app.palladium.ai/hmr', status: 101, type: 'ws', time: 0, size: '—' },
];

export const STATUS_STYLE = {
  200: 'text-emerald-400', 304: 'text-sky-400', 500: 'text-rose-400', 404: 'text-amber-400', 101: 'text-violet-400',
};

export const ERRORS = [
  {
    id: 1, title: 'Uncaught TypeError', msg: 'agent.run is not a function',
    file: 'src/components/AgentCard.jsx', line: 12, stack: 'at AgentCard.handleRun (AgentCard.jsx:12:9)\n  at render (Agents.jsx:48:5)',
    sev: 'error',
  },
  {
    id: 2, title: 'Failed prop type', msg: '`name` is required in <AgentCard>',
    file: 'src/components/AgentCard.jsx', line: 4, stack: 'at checkPropType (react.development.js:1420)\n  at AgentCard (AgentCard.jsx:4)',
    sev: 'error',
  },
  {
    id: 3, title: 'Network error', msg: 'POST /api/agents/run 500 — upstream timeout',
    file: 'src/api/agents.js', line: 28, stack: 'at runAgent (agents.js:28:11)\n  at handleRun (AgentCard.jsx:13:5)',
    sev: 'error',
  },
];

export const AI_DEBUG = {
  summary: '3 errors detected.',
  detail: 'A shared handler in AgentCard calls agent.run() before the agent finishes initializing, then bubbles a 500 from the API. The missing `name` prop is a downstream symptom — AgentCard renders undefined before the request resolves.',
  fixes: [
    { action: 'Fix Automatically', desc: 'Guard the handler with an `agent.ready` check and add a required `name` prop default.' },
    { action: 'Explain', desc: 'Walk through the failure path from click → API 500 → undefined render.' },
    { action: 'Open File', desc: 'Jump to src/components/AgentCard.jsx:12 in the editor.' },
  ],
};