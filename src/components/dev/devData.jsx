// Mock data for the Developer Workspace. Backend ready.

export const FILES = [
  {
    path: 'src/App.jsx', name: 'App.jsx', lang: 'react', open: true,
    code: `import { useState } from 'react';
import Home from './pages/Home';

export default function App() {
  const [user, setUser] = useState(null);

  // bootstrap session on mount
  if (!user) return <Home onLogin={setUser} />;

  return (
    <main className="app">
      <h1>Welcome back, {user.name}</h1>
    </main>
  );
}`,
  },
  {
    path: 'src/pages/Home.jsx', name: 'Home.jsx', lang: 'react',
    code: `import { Button } from '../components/Button';

export default function Home({ onLogin }) {
  const handleClick = async () => {
    const res = await fetch('/api/me');
    onLogin(await res.json());
  };

  return (
    <div className="hero">
      <h1>Palladium</h1>
      <Button onClick={handleClick}>Enter</Button>
    </div>
  );
}`,
  },
  {
    path: 'src/api/client.ts', name: 'client.ts', lang: 'ts',
    code: `interface Client {
  baseUrl: string;
  token?: string;
}

export async function request<T>(path: string): Promise<T> {
  const res = await fetch(this.baseUrl + path, {
    headers: { Authorization: \`Bearer \${this.token}\` },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json() as Promise<T>;
}`,
  },
  {
    path: 'public/index.html', name: 'index.html', lang: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Palladium</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  },
  {
    path: 'src/styles.css', name: 'styles.css', lang: 'css',
    code: `:root {
  --primary: #7c3aed;
  --bg: #0c0d13;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 4rem 2rem;
  color: var(--bg);
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
}`,
  },
  {
    path: 'server/main.py', name: 'main.py', lang: 'py',
    code: `from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/api/me")
async def me():
    # TODO: read session cookie
    user = get_current_user()
    if user is None:
        raise HTTPException(status_code=401)
    return {"name": user.name}`,
  },
  {
    path: 'config.json', name: 'config.json', lang: 'json',
    code: `{
  "name": "palladium-app",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "recharts": "^2.15.0"
  }
}`,
  },
  {
    path: 'README.md', name: 'README.md', lang: 'markdown',
    code: `# Palladium App

A sample workspace built with the **Developer Workspace**.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

> Mock only — no real machines are contacted.`,
  },
];

export const PROBLEMS = {
  errors: [
    { file: 'src/api/client.ts', line: 9, msg: "'this' is not defined in module scope", sev: 'error' },
    { file: 'server/main.py', line: 6, msg: "Name 'get_current_user' is not defined", sev: 'error' },
  ],
  warnings: [
    { file: 'src/App.jsx', line: 4, msg: "'user' state is set but conditionally returned", sev: 'warn' },
    { file: 'src/pages/Home.jsx', line: 3, msg: "Async function has no error handling", sev: 'warn' },
  ],
  suggestions: [
    { file: 'src/styles.css', line: 2, msg: "Consider using a CSS variable for --primary", sev: 'info' },
    { file: 'config.json', line: 6, msg: "Pin recharts to a single major version", sev: 'info' },
  ],
};

export const SEV_STYLE = {
  error: 'text-rose-400 bg-rose-400/10',
  warn: 'text-amber-400 bg-amber-400/10',
  info: 'text-sky-400 bg-sky-400/10',
};

export const OUTPUT = [
  '> vite build',
  'vite v5.2.0 building for production...',
  '✓ 184 modules transformed.',
  'dist/index.html                  0.46 kB │ gzip:  0.30 kB',
  'dist/assets/index-Cf2a8b.css     3.12 kB │ gzip:  0.98 kB',
  'dist/assets/index-9d1c4f.js    142.78 kB │ gzip: 46.20 kB',
  '✓ built in 1.42s',
];

export const GIT = {
  current: 'main',
  branches: [
    { name: 'main', ahead: 0, behind: 0, active: true },
    { name: 'feat/kanban-board', ahead: 4, behind: 1 },
    { name: 'fix/auth-session', ahead: 2, behind: 0 },
    { name: 'chore/deps', ahead: 1, behind: 3 },
  ],
  changes: [
    { file: 'src/App.jsx', status: 'M' },
    { file: 'src/pages/Home.jsx', status: 'M' },
    { file: 'src/api/client.ts', status: 'A' },
    { file: 'server/main.py', status: 'M' },
    { file: 'README.md', status: 'U' },
  ],
  commits: [
    { hash: 'a1b2c3d', msg: 'feat: add kanban drag-and-drop', author: 'Aria', time: '12m ago' },
    { hash: '4e5f6a7', msg: 'fix: resolve auth session cookie', author: 'Devon', time: '1h ago' },
    { hash: '8b9c0d1', msg: 'chore: bump recharts to 2.15', author: 'Finn', time: '3h ago' },
  ],
  prs: [
    { n: 482, title: 'Kanban board with drag-and-drop', state: 'open', author: 'Aria' },
    { n: 481, title: 'Auth session cookie fix', state: 'merged', author: 'Devon' },
    { n: 479, title: 'Dependency updates', state: 'draft', author: 'Finn' },
  ],
};

export const EXTENSIONS = [
  { id: 'prettier', name: 'Prettier', publisher: 'Prettier', desc: 'Code formatter', enabled: true, icon: '✦' },
  { id: 'eslint', name: 'ESLint', publisher: 'Microsoft', desc: 'Lint JavaScript & TypeScript', enabled: true, icon: '◆' },
  { id: 'pyright', name: 'Pylance', publisher: 'Microsoft', desc: 'Python type checking', enabled: false, icon: '▲' },
  { id: 'gitlens', name: 'GitLens', publisher: 'GitKraken', desc: 'Supercharge Git', enabled: true, icon: '⌥' },
  { id: 'tailwind', name: 'Tailwind CSS', publisher: 'Tailwind Labs', desc: 'IntelliSense for utilities', enabled: true, icon: '≈' },
  { id: 'copilot', name: 'AI Assistant', publisher: 'Palladium', desc: 'Explain, fix, generate code', enabled: true, icon: '✸' },
];

export const AI_ACTIONS = ['Explain Code', 'Fix Code', 'Generate Code', 'Refactor', 'Test', 'Debug'];

export const TERMINAL_HELP = {
  help: ['Available commands: ls, cat <file>, npm run dev, npm run build, git status, git log, clear, help'],
  ls: ['src/', 'public/', 'server/', 'config.json', 'README.md'],
  'npm run dev': ['> palladium-app dev', 'VITE v5.2.0  ready in 312 ms', '', '➜  Local:   http://localhost:5173/', '➜  Network: use --host to expose'],
  'npm run build': ['> palladium-app build', '✓ 184 modules transformed.', '✓ built in 1.42s'],
  'git status': ['On branch main', 'Changes not staged for commit:', '  modified:   src/App.jsx', '  modified:   src/pages/Home.jsx', '  new file:   src/api/client.ts'],
  'git log': ['a1b2c3d feat: add kanban drag-and-drop  (Aria, 12m ago)', '4e5f6a7 fix: resolve auth session cookie  (Devon, 1h ago)', '8b9c0d1 chore: bump recharts to 2.15  (Finn, 3h ago)'],
};