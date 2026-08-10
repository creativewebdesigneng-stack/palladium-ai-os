// Mock data for the Code Explorer. Backend ready.

export const TREE = [
  { name: 'src', type: 'dir', open: true, children: [
    { name: 'components', type: 'dir', open: true, children: [
      { name: 'Button.jsx', type: 'file', lang: 'react' },
      { name: 'Card.jsx', type: 'file', lang: 'react' },
    ]},
    { name: 'pages', type: 'dir', open: true, children: [
      { name: 'Home.jsx', type: 'file', lang: 'react' },
      { name: 'Dashboard.jsx', type: 'file', lang: 'react' },
    ]},
    { name: 'hooks', type: 'dir', open: true, children: [
      { name: 'useAuth.ts', type: 'file', lang: 'ts' },
      { name: 'useFetch.ts', type: 'file', lang: 'ts' },
    ]},
    { name: 'lib', type: 'dir', open: true, children: [
      { name: 'api.ts', type: 'file', lang: 'ts' },
      { name: 'utils.ts', type: 'file', lang: 'ts' },
    ]},
  ]},
  { name: 'public', type: 'dir', open: false, children: [
    { name: 'favicon.svg', type: 'file', lang: 'html' },
    { name: 'index.html', type: 'file', lang: 'html' },
  ]},
  { name: 'server', type: 'dir', open: true, children: [
    { name: 'main.py', type: 'file', lang: 'py' },
    { name: 'auth.py', type: 'file', lang: 'py' },
  ]},
  { name: 'tests', type: 'dir', open: false, children: [
    { name: 'auth.test.ts', type: 'file', lang: 'ts' },
    { name: 'api.test.ts', type: 'file', lang: 'ts' },
  ]},
];

export const FILE_CONTENT = {
  'src/components/Button.jsx': `import { useState } from 'react';

export function Button({ children, onClick, variant = 'primary' }) {
  return (
    <button className={'btn btn-' + variant} onClick={onClick}>
      {children}
    </button>
  );
}`,
  'src/components/Card.jsx': `export function Card({ title, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="card-body">{children}</div>
    </div>
  );
}`,
  'src/pages/Home.jsx': `import { Button } from '../components/Button';

export default function Home() {
  return (
    <div className="hero">
      <h1>Welcome to Palladium</h1>
      <Button>Get started</Button>
    </div>
  );
}`,
  'src/pages/Dashboard.jsx': `import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  return <h1>Hello, {user?.name}</h1>;
}`,
  'src/hooks/useAuth.ts': `import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => { fetch('/api/me').then(r => r.json()).then(setUser); }, []);
  return { user };
}`,
  'src/hooks/useFetch.ts': `export function useFetch(url: string) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, [url]);
  return data;
}`,
  'src/lib/api.ts': `const BASE = '/api';

export async function get(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}`,
  'src/lib/utils.ts': `export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}`,
  'public/favicon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#7c3aed"/></svg>`,
  'public/index.html': `<!DOCTYPE html>
<html><head><title>Palladium</title></head>
<body><div id="root"></div></body>
</html>`,
  'server/main.py': `from fastapi import FastAPI

app = FastAPI()

@app.get('/api/me')
async def me():
    return {'name': 'Aria'}`,
  'server/auth.py': `def login(email, password):
    # verify credentials then issue session
    return create_session(email)`,
  'tests/auth.test.ts': `import { useAuth } from '../src/hooks/useAuth';

test('returns null without session', () => {
  expect(useAuth().user).toBeNull();
});`,
  'tests/api.test.ts': `import { get } from '../src/lib/api';

test('get resolves json', async () => {
  const data = await get('/me');
  expect(data).toBeDefined();
});`,
};

export const GIT_STATUS = {
  'src/components/Button.jsx': 'M',
  'src/pages/Dashboard.jsx': 'M',
  'src/hooks/useAuth.ts': 'A',
  'src/lib/utils.ts': 'U',
  'server/auth.py': 'M',
  'tests/api.test.ts': '??',
};

export const GIT_STYLE = { M: 'text-amber-400', A: 'text-emerald-400', U: 'text-sky-400', '??': 'text-zinc-400' };

export const FILE_ACTIONS = ['Create', 'Rename', 'Delete', 'Duplicate', 'Move', 'Download'];

export const AI_ACTIONS = ['Explain', 'Fix', 'Refactor', 'Generate Tests'];

export const AI_RESPONSES = {
  Explain: (p) => `This file defines the ${p.split('/').pop()} module. It exports functions/hooks used elsewhere in the app; the entry point wires state and side effects together.`,
  Fix: (p) => `Reviewed ${p.split('/').pop()}. Patched a missing dependency in an effect and added an error boundary for the async call.`,
  Refactor: (p) => `Extracted duplicated logic into a shared helper, replaced manual effect with a custom hook, and removed 14 lines.`,
  'Generate Tests': (p) => `Generated 5 tests for ${p.split('/').pop()} covering happy path, empty state, and error handling — all passing.`,
};