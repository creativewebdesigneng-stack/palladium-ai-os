import {
  Activity, Boxes, CheckCircle2, Clock, Code2, Database, FileCode2, Folder, GitBranch,
  Layers, Monitor, Rocket, Sparkles, Users, Zap, Cpu, PenTool, TestTube, ShieldCheck, Server, BookOpen,
} from 'lucide-react';

// ---------- Overview metrics ----------
export const OVERVIEW_METRICS = [
  { label: 'Project Name', value: 'Palladium CRM', detail: 'Active build', icon: Sparkles, grad: 'from-violet-500/20 to-indigo-500/10' },
  { label: 'Current Stage', value: 'Frontend', detail: 'Stage 5 / 10', icon: Activity, grad: 'from-cyan-500/20 to-blue-500/10' },
  { label: 'Completion', value: '52%', detail: '+12% today', icon: CheckCircle2, grad: 'from-emerald-500/20 to-teal-500/10' },
  { label: 'Est. Build Time', value: '4m 20s', detail: 'remaining', icon: Clock, grad: 'from-amber-500/20 to-orange-500/10' },
  { label: 'AI Agents Working', value: '6', detail: '2 queued', icon: Users, grad: 'from-violet-500/20 to-fuchsia-500/10' },
  { label: 'Files Generated', value: '142', detail: '+18', icon: FileCode2, grad: 'from-sky-500/20 to-indigo-500/10' },
  { label: 'Components Created', value: '38', detail: 'reusable', icon: Boxes, grad: 'from-lime-500/20 to-emerald-500/10' },
  { label: 'Pages Built', value: '12', detail: 'of 18', icon: Layers, grad: 'from-rose-500/20 to-pink-500/10' },
  { label: 'Tests Passed', value: '94', detail: '2 failed', icon: CheckCircle2, grad: 'from-emerald-500/20 to-teal-500/10' },
  { label: 'Deployment Status', value: 'Staging', detail: 'ready', icon: Rocket, grad: 'from-violet-500/20 to-cyan-400/10' },
];

// ---------- Build pipeline ----------
export const PIPELINE_STAGES = [
  { name: 'Idea', icon: Sparkles, status: 'done' },
  { name: 'Planning', icon: PenTool, status: 'done' },
  { name: 'Architecture', icon: Boxes, status: 'done' },
  { name: 'UI Design', icon: Monitor, status: 'done' },
  { name: 'Frontend', icon: Code2, status: 'active' },
  { name: 'Backend', icon: Server, status: 'pending' },
  { name: 'Database', icon: Database, status: 'pending' },
  { name: 'Testing', icon: TestTube, status: 'pending' },
  { name: 'Optimisation', icon: Zap, status: 'pending' },
  { name: 'Deployment', icon: Rocket, status: 'pending' },
];

// ---------- Live activity ----------
export const LIVE_ACTIVITY = [
  { text: 'Generating React components...', agent: 'Frontend Dev', time: 'now', icon: Code2, grad: 'from-violet-500 to-indigo-500' },
  { text: 'Planning architecture...', agent: 'Architect', time: '4s ago', icon: Boxes, grad: 'from-cyan-500 to-blue-500' },
  { text: 'Building API endpoints...', agent: 'Backend Dev', time: '12s ago', icon: Server, grad: 'from-emerald-500 to-teal-500' },
  { text: 'Creating database schema...', agent: 'DB Engineer', time: '28s ago', icon: Database, grad: 'from-amber-500 to-orange-500' },
  { text: 'Writing authentication...', agent: 'Security Eng', time: '45s ago', icon: ShieldCheck, grad: 'from-rose-500 to-pink-500' },
  { text: 'Generating dashboard...', agent: 'UI Designer', time: '1m ago', icon: Monitor, grad: 'from-violet-500 to-fuchsia-500' },
  { text: 'Running tests...', agent: 'QA Tester', time: '1m ago', icon: TestTube, grad: 'from-lime-500 to-emerald-500' },
  { text: 'Fixing bugs...', agent: 'QA Tester', time: '2m ago', icon: Zap, grad: 'from-amber-500 to-red-500' },
  { text: 'Deploying project...', agent: 'DevOps', time: '3m ago', icon: Rocket, grad: 'from-sky-500 to-cyan-500' },
];

// ---------- File explorer ----------
export const FILE_TREE = [
  {
    name: 'src', icon: Folder, children: [
      { name: 'components', icon: Folder, children: [
        { name: 'Navbar.jsx', icon: FileCode2, lines: 84 },
        { name: 'Sidebar.jsx', icon: FileCode2, lines: 112 },
        { name: 'Dashboard.jsx', icon: FileCode2, lines: 256 },
        { name: 'Card.jsx', icon: FileCode2, lines: 42 },
      ] },
      { name: 'pages', icon: Folder, children: [
        { name: 'Home.jsx', icon: FileCode2, lines: 188 },
        { name: 'Login.jsx', icon: FileCode2, lines: 96 },
        { name: 'Settings.jsx', icon: FileCode2, lines: 142 },
      ] },
      { name: 'App.jsx', icon: FileCode2, lines: 64 },
      { name: 'index.css', icon: FileCode2, lines: 128 },
    ],
  },
  {
    name: 'api', icon: Folder, children: [
      { name: 'auth.js', icon: FileCode2, lines: 78 },
      { name: 'projects.js', icon: FileCode2, lines: 134 },
      { name: 'tasks.js', icon: FileCode2, lines: 92 },
    ],
  },
  {
    name: 'hooks', icon: Folder, children: [
      { name: 'useAuth.js', icon: FileCode2, lines: 54 },
      { name: 'useFetch.js', icon: FileCode2, lines: 38 },
    ],
  },
  {
    name: 'database', icon: Folder, children: [
      { name: 'schema.sql', icon: FileCode2, lines: 220 },
      { name: 'migrations', icon: Folder, children: [
        { name: '001_init.sql', icon: FileCode2, lines: 86 },
      ] },
    ],
  },
  { name: 'public', icon: Folder, children: [{ name: 'favicon.ico', icon: FileCode2, lines: 0 }] },
  { name: 'tests', icon: Folder, children: [{ name: 'auth.test.js', icon: FileCode2, lines: 64 }] },
  { name: 'docs', icon: Folder, children: [{ name: 'README.md', icon: FileCode2, lines: 142 }] },
];

// ---------- Code samples ----------
export const CODE_FILES = {
  'App.jsx': `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}`,
  'Navbar.jsx': `import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  return (
    <nav className="flex items-center justify-between px-6 py-4">
      <span className="text-lg font-bold text-white">Palladium CRM</span>
      <button onClick={() => setOpen(!open)} className="lg:hidden">
        {open ? <X /> : <Menu />}
      </button>
    </nav>
  );
}`,
  'auth.js': `import jwt from 'jsonwebtoken';

export async function authenticate(email, password) {
  const user = await db.users.findOne({ email });
  if (!user) throw new Error('User not found');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}`,
  'schema.sql': `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active'
);`,
};

// ---------- Component library ----------
export const COMPONENTS = [
  { name: 'Navbar', grad: 'from-violet-500 to-indigo-500' },
  { name: 'Sidebar', grad: 'from-cyan-500 to-blue-500' },
  { name: 'Dashboard', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Cards', grad: 'from-amber-500 to-orange-500' },
  { name: 'Forms', grad: 'from-rose-500 to-pink-500' },
  { name: 'Buttons', grad: 'from-violet-500 to-fuchsia-500' },
  { name: 'Charts', grad: 'from-sky-500 to-cyan-500' },
  { name: 'Tables', grad: 'from-lime-500 to-emerald-500' },
  { name: 'Modals', grad: 'from-indigo-500 to-violet-500' },
  { name: 'Settings', grad: 'from-zinc-500 to-zinc-600' },
  { name: 'Authentication', grad: 'from-orange-500 to-red-500' },
  { name: 'Search', grad: 'from-blue-500 to-indigo-500' },
];

// ---------- Database design (ER) ----------
export const DB_TABLES = [
  { name: 'Users', x: 5, y: 20, fields: ['id', 'email', 'password', 'role'], grad: 'from-violet-500 to-indigo-500' },
  { name: 'Projects', x: 40, y: 10, fields: ['id', 'user_id →', 'name', 'status'], grad: 'from-cyan-500 to-blue-500' },
  { name: 'Tasks', x: 75, y: 25, fields: ['id', 'project_id →', 'title', 'done'], grad: 'from-emerald-500 to-teal-500' },
  { name: 'Files', x: 40, y: 55, fields: ['id', 'project_id →', 'path', 'size'], grad: 'from-amber-500 to-orange-500' },
  { name: 'Agents', x: 8, y: 60, fields: ['id', 'name', 'model', 'status'], grad: 'from-rose-500 to-pink-500' },
  { name: 'Messages', x: 73, y: 58, fields: ['id', 'agent_id →', 'role', 'content'], grad: 'from-sky-500 to-cyan-500' },
  { name: 'Settings', x: 25, y: 78, fields: ['id', 'user_id →', 'key', 'value'], grad: 'from-lime-500 to-emerald-500' },
  { name: 'API Keys', x: 55, y: 82, fields: ['id', 'user_id →', 'provider', 'key'], grad: 'from-fuchsia-500 to-purple-500' },
];

export const DB_RELATIONS = [
  { from: 'Users', to: 'Projects' },
  { from: 'Projects', to: 'Tasks' },
  { from: 'Projects', to: 'Files' },
  { from: 'Agents', to: 'Messages' },
  { from: 'Users', to: 'Settings' },
  { from: 'Users', to: 'API Keys' },
];

// ---------- API design ----------
export const API_GROUPS = [
  { group: 'Authentication', endpoints: [['POST', '/auth/login'], ['POST', '/auth/register'], ['POST', '/auth/logout'], ['GET', '/auth/me']], grad: 'from-orange-500 to-red-500' },
  { group: 'Projects', endpoints: [['GET', '/projects'], ['POST', '/projects'], ['GET', '/projects/:id'], ['PUT', '/projects/:id'], ['DELETE', '/projects/:id']], grad: 'from-cyan-500 to-blue-500' },
  { group: 'Agents', endpoints: [['GET', '/agents'], ['POST', '/agents'], ['PUT', '/agents/:id'], ['POST', '/agents/:id/run']], grad: 'from-violet-500 to-indigo-500' },
  { group: 'Tasks', endpoints: [['GET', '/tasks'], ['POST', '/tasks'], ['PUT', '/tasks/:id'], ['DELETE', '/tasks/:id']], grad: 'from-emerald-500 to-teal-500' },
  { group: 'Messages', endpoints: [['GET', '/messages'], ['POST', '/messages'], ['GET', '/messages/:id']], grad: 'from-sky-500 to-cyan-500' },
  { group: 'Files', endpoints: [['GET', '/files'], ['POST', '/files/upload'], ['DELETE', '/files/:id']], grad: 'from-amber-500 to-orange-500' },
  { group: 'Billing', endpoints: [['GET', '/billing'], ['POST', '/billing/subscribe'], ['GET', '/billing/invoices']], grad: 'from-rose-500 to-pink-500' },
  { group: 'Users', endpoints: [['GET', '/users'], ['PUT', '/users/:id'], ['DELETE', '/users/:id']], grad: 'from-lime-500 to-emerald-500' },
  { group: 'Settings', endpoints: [['GET', '/settings'], ['PUT', '/settings']], grad: 'from-fuchsia-500 to-purple-500' },
];

export const METHOD_STYLE = {
  GET: 'text-emerald-400 bg-emerald-400/10',
  POST: 'text-sky-400 bg-sky-400/10',
  PUT: 'text-amber-400 bg-amber-400/10',
  DELETE: 'text-rose-400 bg-rose-400/10',
};

// ---------- AI workforce ----------
export const AI_WORKFORCE = [
  { name: 'Planner', role: 'Plans the build', status: 'Done', progress: 100, task: 'Defined 18 pages', eta: 'Complete', icon: PenTool, grad: 'from-cyan-500 to-blue-500' },
  { name: 'Architect', role: 'Designs architecture', status: 'Done', progress: 100, task: 'Schema + API design', eta: 'Complete', icon: Boxes, grad: 'from-violet-500 to-indigo-500' },
  { name: 'Frontend Developer', role: 'Builds UI', status: 'Working', progress: 64, task: 'Building dashboard', eta: '2m left', icon: Code2, grad: 'from-violet-500 to-fuchsia-500' },
  { name: 'Backend Developer', role: 'Builds APIs', status: 'Working', progress: 38, task: 'Auth endpoints', eta: '4m left', icon: Server, grad: 'from-emerald-500 to-teal-500' },
  { name: 'UI Designer', role: 'Designs visuals', status: 'Done', progress: 100, task: 'Design system ready', eta: 'Complete', icon: Monitor, grad: 'from-rose-500 to-pink-500' },
  { name: 'QA Tester', role: 'Tests everything', status: 'Queued', progress: 0, task: 'Awaiting build', eta: 'Pending', icon: TestTube, grad: 'from-lime-500 to-emerald-500' },
  { name: 'Database Engineer', role: 'Builds schema', status: 'Done', progress: 100, task: '8 tables created', eta: 'Complete', icon: Database, grad: 'from-amber-500 to-orange-500' },
  { name: 'Security Engineer', role: 'Secures app', status: 'Working', progress: 52, task: 'JWT + bcrypt', eta: '1m left', icon: ShieldCheck, grad: 'from-orange-500 to-red-500' },
  { name: 'DevOps Engineer', role: 'Deploys', status: 'Queued', progress: 0, task: 'Awaiting tests', eta: 'Pending', icon: Rocket, grad: 'from-sky-500 to-cyan-500' },
  { name: 'Doc Writer', role: 'Writes docs', status: 'Queued', progress: 0, task: 'Awaiting build', eta: 'Pending', icon: BookOpen, grad: 'from-zinc-500 to-zinc-600' },
];

export const WORKFORCE_STATUS = {
  Done: 'bg-emerald-400/10 text-emerald-400',
  Working: 'bg-violet-400/10 text-violet-300',
  Queued: 'bg-white/5 text-zinc-500',
};

// ---------- Build logs ----------
export const BUILD_LOGS = [
  { type: 'cmd', text: 'npm run build --target staging' },
  { type: 'success', text: '✓ Compiled successfully in 1.84s' },
  { type: 'info', text: '→ Building 142 modules...' },
  { type: 'success', text: '✓ Auth module built (78 lines)' },
  { type: 'success', text: '✓ Dashboard page built (256 lines)' },
  { type: 'warn', text: '⚠ Unused import: lodash in Home.jsx' },
  { type: 'info', text: '→ Running test suite...' },
  { type: 'error', text: '✗ auth.test.js: 2 tests failed' },
  { type: 'info', text: '→ Fixing failed tests...' },
  { type: 'success', text: '✓ Tests fixed, 94 passing' },
  { type: 'info', text: '→ Deploying to staging...' },
  { type: 'success', text: '✓ Deployed: https://palladium-crm.staging.app' },
];

export const LOG_STYLE = {
  cmd: 'text-zinc-300',
  success: 'text-emerald-400',
  info: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
};

// ---------- Project settings ----------
export const PROJECT_SETTINGS = [
  { label: 'Framework', value: 'React + Vite', icon: Code2 },
  { label: 'Language', value: 'JavaScript', icon: FileCode2 },
  { label: 'Styling', value: 'Tailwind CSS', icon: PenTool },
  { label: 'Database', value: 'PostgreSQL', icon: Database },
  { label: 'Authentication', value: 'JWT + OAuth', icon: ShieldCheck },
  { label: 'Hosting', value: 'Vercel', icon: Rocket },
  { label: 'Package Manager', value: 'pnpm', icon: Boxes },
  { label: 'Git Provider', value: 'GitHub', icon: GitBranch },
];

// ---------- Templates ----------
export const TEMPLATES = [
  { name: 'CRM', desc: 'Customer relationships', grad: 'from-violet-500 to-indigo-500', icon: Users },
  { name: 'Marketplace', desc: 'Multi-vendor store', grad: 'from-cyan-500 to-blue-500', icon: Boxes },
  { name: 'Dashboard', desc: 'Analytics & metrics', grad: 'from-emerald-500 to-teal-500', icon: Activity },
  { name: 'Portfolio', desc: 'Personal showcase', grad: 'from-amber-500 to-orange-500', icon: PenTool },
  { name: 'Landing Page', desc: 'Marketing site', grad: 'from-rose-500 to-pink-500', icon: Rocket },
  { name: 'E-commerce', desc: 'Online store', grad: 'from-violet-500 to-fuchsia-500', icon: Boxes },
  { name: 'Social Network', desc: 'Community platform', grad: 'from-sky-500 to-cyan-500', icon: Users },
  { name: 'Booking Platform', desc: 'Appointments', grad: 'from-lime-500 to-emerald-500', icon: Clock },
  { name: 'AI SaaS', desc: 'AI-powered product', grad: 'from-indigo-500 to-violet-500', icon: Sparkles },
  { name: 'Finance', desc: 'Banking & budgets', grad: 'from-orange-500 to-red-500', icon: Activity },
  { name: 'Healthcare', desc: 'Patient portal', grad: 'from-teal-500 to-cyan-500', icon: ShieldCheck },
  { name: 'Education', desc: 'LMS & courses', grad: 'from-fuchsia-500 to-purple-500', icon: BookOpen },
];

// ---------- Recent projects ----------
export const RECENT_PROJECTS = [
  { name: 'Palladium CRM', stage: 'Frontend', progress: 52, lastEdited: 'now', status: 'Building', grad: 'from-violet-500 to-indigo-500' },
  { name: 'TaskFlow', stage: 'Deployed', progress: 100, lastEdited: '2h ago', status: 'Live', grad: 'from-emerald-500 to-teal-500' },
  { name: 'MarketHub', stage: 'Testing', progress: 88, lastEdited: '1d ago', status: 'Testing', grad: 'from-cyan-500 to-blue-500' },
  { name: 'DevPortal', stage: 'Planning', progress: 12, lastEdited: '3d ago', status: 'Draft', grad: 'from-amber-500 to-orange-500' },
  { name: 'SocialApp', stage: 'Architecture', progress: 34, lastEdited: '5d ago', status: 'Building', grad: 'from-rose-500 to-pink-500' },
  { name: 'FinTrack', stage: 'Deployed', progress: 100, lastEdited: '1w ago', status: 'Live', grad: 'from-sky-500 to-cyan-500' },
];

export const PROJECT_STATUS_STYLE = {
  Building: 'bg-violet-400/10 text-violet-300',
  Live: 'bg-emerald-400/10 text-emerald-400',
  Testing: 'bg-amber-400/10 text-amber-400',
  Draft: 'bg-white/5 text-zinc-500',
};

// ---------- Right sidebar ----------
export const RIGHT_NOTIFICATIONS = [
  { text: 'Frontend stage 64% complete', kind: 'info' },
  { text: '2 tests failed in auth module', kind: 'warn' },
  { text: 'Database schema generated', kind: 'success' },
  { text: 'New template: AI SaaS', kind: 'info' },
];

export const RIGHT_RECOMMENDATIONS = [
  { text: 'Add role-based access control', icon: ShieldCheck },
  { text: 'Enable real-time updates', icon: Zap },
  { text: 'Add billing with Stripe', icon: Activity },
];

export const RIGHT_CURRENT_TASKS = [
  { text: 'Build dashboard page', agent: 'Frontend', progress: 64 },
  { text: 'Create auth endpoints', agent: 'Backend', progress: 38 },
  { text: 'Implement JWT auth', agent: 'Security', progress: 52 },
];

export const RIGHT_RECENT_FILES = [
  { name: 'Dashboard.jsx', time: 'now' },
  { name: 'auth.js', time: '4s ago' },
  { name: 'schema.sql', time: '28s ago' },
  { name: 'Navbar.jsx', time: '1m ago' },
];

export const DEPLOYMENT_STAGES = [
  { label: 'Build', status: 'done' },
  { label: 'Test', status: 'done' },
  { label: 'Staging', status: 'active' },
  { label: 'Production', status: 'pending' },
];

// ---------- Prompt examples ----------
export const EXAMPLE_PROMPTS = [
  'Build me a CRM.',
  'Create an Airbnb clone.',
  'Build an AI chatbot.',
  'Create a GTA V Mod Manager.',
  'Build a Restaurant POS.',
  'Create an Employee Portal.',
  'Build a Marketplace.',
  'Create a Social Network.',
  'Build a SaaS platform.',
  'Create a Portfolio Website.',
];

export const PROMPT_TOOLS = [
  { label: 'Attach Files', icon: FileCode2 },
  { label: 'Upload Images', icon: Layers },
  { label: 'Wireframes', icon: PenTool },
  { label: 'Select AI Team', icon: Users },
  { label: 'Choose Model', icon: Cpu },
  { label: 'Choose Framework', icon: Code2 },
];

// ---------- Preview snippet ----------
export const PREVIEW_HTML = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80';