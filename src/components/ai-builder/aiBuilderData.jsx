// Mock data for the AI App Builder. Backend ready.
import {
  Sparkles, FilePlus2, Package, Code2, FlaskConical, Wrench, Hammer, Eye, Monitor, Tablet, Smartphone,
} from 'lucide-react';

export const BUILD_ACTIONS = [
  { id: 'generate', label: 'Generate', icon: Sparkles, grad: 'from-violet-600 to-indigo-600', primary: true },
  { id: 'modify', label: 'Modify', icon: Code2, grad: 'from-sky-600 to-cyan-600' },
  { id: 'fix', label: 'Fix', icon: Wrench, grad: 'from-amber-600 to-orange-600' },
  { id: 'explain', label: 'Explain', icon: Eye, grad: 'from-emerald-600 to-teal-600' },
  { id: 'test', label: 'Test', icon: FlaskConical, grad: 'from-fuchsia-600 to-pink-600' },
  { id: 'deploy', label: 'Deploy', icon: Monitor, grad: 'from-rose-600 to-orange-600' },
];

export const ACTIVITY_STEPS = [
  { id: 'plan', label: 'Planning', icon: Sparkles, detail: 'decomposing request into 7 files' },
  { id: 'files', label: 'Creating files', icon: FilePlus2, detail: 'App.jsx, Home.jsx, api/client.ts' },
  { id: 'install', label: 'Installing dependencies', icon: Package, detail: 'react-router, tailwind, recharts' },
  { id: 'write', label: 'Writing code', icon: Code2, detail: '1842 lines across 9 modules' },
  { id: 'test', label: 'Running tests', icon: FlaskConical, detail: '24 passed · 0 failed' },
  { id: 'fix', label: 'Fixing errors', icon: Wrench, detail: 'resolved 3 type errors' },
  { id: 'build', label: 'Building application', icon: Hammer, detail: 'vite build · 1.4s' },
  { id: 'preview', label: 'Previewing', icon: Eye, detail: 'served on :5173' },
];

export const CONVERSATION = [
  { role: 'user', text: 'Build a task manager app with a kanban board, due dates, and priority labels.' },
  { role: 'ai', text: 'I\'ll scaffold a React task manager: a Kanban board with drag-and-drop columns (To Do, In Progress, Done), a create-task modal with due-date and priority fields, and local persistence. Starting now — creating files and installing dependencies.' },
  { role: 'user', text: 'Add dark mode and recharts for a completion chart.' },
  { role: 'ai', text: 'Done — wired a theme toggle and a weekly completion line chart on the dashboard. Rebuilding preview…' },
];

export const FILE_TREE = [
  {
    name: 'src', open: true, children: [
      { name: 'App.jsx', file: true },
      { name: 'main.jsx', file: true },
      { name: 'pages', open: true, children: [
        { name: 'Home.jsx', file: true },
        { name: 'TaskBoard.jsx', file: true },
      ]},
      { name: 'components', open: true, children: [
        { name: 'TaskCard.jsx', file: true },
        { name: 'CreateTaskModal.jsx', file: true },
      ]},
    ],
  },
  { name: 'public', open: false, children: [{ name: 'favicon.svg', file: true }] },
  { name: 'package.json', file: true },
  { name: 'README.md', file: true },
];

export const COMPONENTS = ['Button', 'Input', 'Card', 'Modal', 'Badge', 'Dropdown', 'Tabs', 'Chart'];

export const PROPERTIES = [
  { key: 'title', value: 'Task Manager', type: 'string' },
  { key: 'theme', value: 'dark', type: 'select' },
  { key: 'columns', value: 3, type: 'number' },
  { key: 'persist', value: true, type: 'boolean' },
];

export const TERMINAL = [
  { t: '$ palladium generate "task manager app"', c: 'text-zinc-400' },
  { t: '→ planning 7 files…', c: 'text-violet-400' },
  { t: '✓ created src/App.jsx', c: 'text-emerald-400' },
  { t: '✓ created src/pages/Home.jsx', c: 'text-emerald-400' },
  { t: '✓ created src/pages/TaskBoard.jsx', c: 'text-emerald-400' },
  { t: '→ installing react-router-dom recharts…', c: 'text-sky-400' },
  { t: '✓ 48 packages added', c: 'text-emerald-400' },
  { t: '→ running tests…', c: 'text-fuchsia-400' },
  { t: '✓ 24 passed · 0 failed', c: 'text-emerald-400' },
  { t: '→ vite build…', c: 'text-amber-400' },
  { t: '✓ built in 1.4s — served on :5173', c: 'text-emerald-400' },
];

export const VERSIONS = [
  { id: 'v4', label: 'v0.4.0', time: 'just now', note: 'dark mode + completion chart', current: true },
  { id: 'v3', label: 'v0.3.0', time: '12m ago', note: 'kanban drag-and-drop' },
  { id: 'v2', label: 'v0.2.0', time: '26m ago', note: 'create-task modal' },
  { id: 'v1', label: 'v0.1.0', time: '41m ago', note: 'initial scaffold' },
];

export const VIEWPORTS = {
  desktop: { icon: Monitor, w: 'w-full', label: 'Desktop' },
  tablet: { icon: Tablet, w: 'w-[768px]', label: 'Tablet' },
  mobile: { icon: Smartphone, w: 'w-[390px]', label: 'Mobile' },
};

export const PREVIEW_URL = 'https://preview.palladium.app/task-manager';