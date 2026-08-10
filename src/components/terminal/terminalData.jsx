// Mock data for the PalladiumAI Terminal. Frontend only — prepared for a secure
// backend execution layer (each command handler is a thin stub that a real
// sandboxed runner can replace without touching the UI).

export const COMMANDS = {
  help: () => ['Available: help, ls, pwd, whoami, date, echo, ps, top, env, ports, git status, npm run dev, clear'],
  ls: () => ['src/', 'public/', 'server/', 'tests/', 'config.json', 'README.md'],
  pwd: () => ['/home/palladium/workspace'],
  whoami: () => ['palladium-user'],
  date: () => [new Date().toString()],
  ps: () => [
    'PID   CPU%  MEM%  COMMAND',
    '1012  4.2   1.1   vite dev',
    '1018  0.3   0.6   tsserver',
    '1024  1.1   2.4   node api server',
    '1031  0.0   0.2   git fetch',
  ],
  top: () => [
    'Tasks: 4 total, 1 running, 3 sleeping',
    '%Cpu: 6.2 us, 1.1 sy, 92.7 id',
    'MiB Mem: 2048 total, 1184 free, 512 used, 352 cache',
    '',
    'PID   CPU%  MEM%  COMMAND',
    '1012  4.2   1.1   vite dev',
    '1024  1.1   2.4   node api server',
  ],
  env: () => ['PATH=/usr/bin:/home/palladium/.local/bin', 'NODE_ENV=development', 'PORT=5173', 'SHELL=/bin/zsh', 'DATABASE_URL=postgres://localhost/palladium'],
  ports: () => ['PORT   SERVICE      STATUS', '5173   vite dev    listening', '3000   api server  listening', '5432   postgres    listening'],
  'git status': () => ['On branch main', 'Changes not staged:', '  modified: src/App.jsx', '  new file:  src/terminal.jsx'],
  'npm run dev': () => ['> palladium-app dev', '', '  VITE v5.2.0  ready in 312 ms', '', '  ➜  Local:   http://localhost:5173/', '  ➜  Network: use --host to expose'],
  'npm install': () => ['added 184 packages in 6s', '', '184 packages are looking for funding', '  npm fund to support maintenance'],
};

export const PROCESSES = [
  { pid: 1012, name: 'vite dev', cpu: 4.2, mem: 1.1, user: 'palladium', started: '11:30' },
  { pid: 1018, name: 'tsserver', cpu: 0.3, mem: 0.6, user: 'palladium', started: '11:31' },
  { pid: 1024, name: 'node api server', cpu: 1.1, mem: 2.4, user: 'palladium', started: '11:32' },
  { pid: 1031, name: 'git fetch', cpu: 0.0, mem: 0.2, user: 'palladium', started: '11:40' },
  { pid: 1045, name: 'postgres', cpu: 0.8, mem: 3.2, user: 'postgres', started: '11:28' },
];

export const PORTS = [
  { port: 5173, service: 'vite dev', protocol: 'http', status: 'listening', pid: 1012 },
  { port: 3000, service: 'api server', protocol: 'http', status: 'listening', pid: 1024 },
  { port: 5432, service: 'postgres', protocol: 'tcp', status: 'listening', pid: 1045 },
  { port: 8080, service: 'preview', protocol: 'http', status: 'idle', pid: null },
];

export const ENV = [
  { key: 'PATH', value: '/usr/bin:/home/palladium/.local/bin', scope: 'system' },
  { key: 'NODE_ENV', value: 'development', scope: 'session' },
  { key: 'PORT', value: '5173', scope: 'app' },
  { key: 'SHELL', value: '/bin/zsh', scope: 'system' },
  { key: 'DATABASE_URL', value: 'postgres://localhost/palladium', scope: 'app' },
  { key: 'OPENAI_API_KEY', value: 'sk-••••••••••••3a7f', scope: 'secret' },
];

export const LOG_LINES = [
  { t: '11:30:12', level: 'info', src: 'vite', msg: 'VITE ready, listening on :5173' },
  { t: '11:31:04', level: 'info', src: 'tsserver', msg: 'TypeScript service started' },
  { t: '11:32:18', level: 'warn', src: 'api', msg: 'Rate limit near threshold (80%)' },
  { t: '11:33:55', level: 'info', src: 'api', msg: 'GET /api/me 200 14ms' },
  { t: '11:38:02', level: 'error', src: 'api', msg: 'POST /api/webhook 500 — upstream timeout' },
  { t: '11:39:41', level: 'info', src: 'postgres', msg: 'connection pool: 4/20 active' },
  { t: '11:40:09', level: 'info', src: 'git', msg: 'fetch origin/main → up to date' },
  { t: '11:41:30', level: 'warn', src: 'vite', msg: 'HMR: page reload after config change' },
];

export const LOG_STYLE = {
  info: 'text-sky-400', warn: 'text-amber-400', error: 'text-rose-400', debug: 'text-zinc-500',
};

export const METRICS = {
  cpu: { value: 6.2, cores: 8, load: '0.42' },
  mem: { used: 512, total: 2048, pct: 25 },
  procs: 5,
  ports: 3,
};