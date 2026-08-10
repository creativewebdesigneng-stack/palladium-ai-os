import {
  FolderKanban, Activity, CheckCircle2, Archive, Bot, Files, Users, HardDrive,
  Globe, Smartphone, Monitor, Server, Bot as BotIcon, Workflow, Cpu, Gamepad2,
  BookOpen, Wrench, Rocket, Code2, Palette, Database, GitBranch, Sparkles,
  Star, Clock, Zap, TrendingUp, GitCommit, FileText, MessageSquare, UserCheck,
  ShieldCheck, Cloud, Terminal, Layout, ShoppingBag, HeartPulse, GraduationCap,
  Landmark, CalendarCheck, Layers, Box, Send, Megaphone, PenTool, BarChart3,
  CheckCircle, AlertCircle, Eye, ArrowRight, RefreshCw, CloudUpload, Briefcase,
} from 'lucide-react';

// ─── Overview Metrics ─────────────────────────────────
export const OVERVIEW_METRICS = [
  { label: 'Total Projects', value: '84', detail: '+6 this week', trend: [60, 64, 68, 70, 74, 78, 80, 82, 84], icon: FolderKanban, grad: 'from-violet-500 to-indigo-500' },
  { label: 'Active Projects', value: '38', detail: '12 building now', trend: [20, 24, 26, 28, 30, 33, 35, 37, 38], icon: Activity, grad: 'from-emerald-500 to-teal-500' },
  { label: 'Completed Projects', value: '31', detail: '+4 this month', trend: [18, 20, 22, 24, 26, 28, 29, 30, 31], icon: CheckCircle2, grad: 'from-sky-500 to-blue-500' },
  { label: 'Archived Projects', value: '15', detail: '2 this week', trend: [8, 9, 10, 11, 12, 13, 14, 14, 15], icon: Archive, grad: 'from-zinc-500 to-slate-500' },
  { label: 'Running AI Jobs', value: '17', detail: '6 active now', trend: [8, 10, 12, 11, 13, 14, 15, 16, 17], icon: Bot, grad: 'from-fuchsia-500 to-pink-500' },
  { label: 'Files', value: '12,480', detail: '+340 this week', trend: [80, 85, 90, 95, 100, 105, 110, 118, 124], icon: Files, grad: 'from-amber-500 to-orange-500' },
  { label: 'Collaborators', value: '46', detail: '8 online now', trend: [30, 33, 36, 38, 40, 42, 44, 45, 46], icon: Users, grad: 'from-cyan-500 to-sky-500' },
  { label: 'Storage Used', value: '684 GB', detail: 'of 1 TB', trend: [40, 45, 50, 55, 58, 62, 65, 67, 68], icon: HardDrive, grad: 'from-purple-500 to-violet-500' },
];

// ─── Status & Category Maps ───────────────────────────
export const STATUS_STYLE = {
  planning:   { label: 'Planning',   dot: 'bg-zinc-400',    chip: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/20',   bar: 'from-zinc-500 to-slate-500' },
  building:   { label: 'Building',   dot: 'bg-violet-400',  chip: 'bg-violet-500/15 text-violet-300 ring-violet-400/20', bar: 'from-violet-500 to-indigo-500' },
  testing:    { label: 'Testing',    dot: 'bg-amber-400',   chip: 'bg-amber-500/15 text-amber-300 ring-amber-400/20', bar: 'from-amber-500 to-orange-500' },
  review:     { label: 'Review',     dot: 'bg-sky-400',     chip: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',     bar: 'from-sky-500 to-blue-500' },
  deploying:  { label: 'Deploying',  dot: 'bg-cyan-400',    chip: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/20',  bar: 'from-cyan-500 to-teal-500' },
  live:       { label: 'Live',       dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20', bar: 'from-emerald-500 to-teal-500' },
  paused:     { label: 'Paused',     dot: 'bg-orange-400',  chip: 'bg-orange-500/15 text-orange-300 ring-orange-400/20', bar: 'from-orange-500 to-red-500' },
  archived:   { label: 'Archived',   dot: 'bg-slate-500',   chip: 'bg-slate-500/15 text-slate-300 ring-slate-400/20', bar: 'from-slate-600 to-zinc-600' },
  completed:  { label: 'Completed',  dot: 'bg-green-400',   chip: 'bg-green-500/15 text-green-300 ring-green-400/20', bar: 'from-green-500 to-emerald-500' },
};

export const DEPLOY_STYLE = {
  production:  { label: 'Production',  chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20' },
  staging:     { label: 'Staging',     chip: 'bg-amber-500/15 text-amber-300 ring-amber-400/20' },
  development: { label: 'Development', chip: 'bg-sky-500/15 text-sky-300 ring-sky-400/20' },
  none:        { label: 'Not Deployed', chip: 'bg-zinc-500/15 text-zinc-400 ring-zinc-400/20' },
};

export const CATEGORIES = [
  { key: 'website',       label: 'Website',        icon: Globe,      grad: 'from-sky-500 to-blue-500' },
  { key: 'webapp',        label: 'Web App',        icon: Layout,     grad: 'from-violet-500 to-indigo-500' },
  { key: 'mobile',        label: 'Mobile App',     icon: Smartphone,  grad: 'from-fuchsia-500 to-pink-500' },
  { key: 'desktop',       label: 'Desktop App',    icon: Monitor,     grad: 'from-cyan-500 to-teal-500' },
  { key: 'api',           label: 'API',            icon: Server,      grad: 'from-emerald-500 to-green-500' },
  { key: 'aiagent',       label: 'AI Agent',       icon: BotIcon,     grad: 'from-purple-500 to-violet-500' },
  { key: 'automation',    label: 'Automation',     icon: Workflow,    grad: 'from-amber-500 to-orange-500' },
  { key: 'workflow',      label: 'Workflow',       icon: GitBranch,   grad: 'from-indigo-500 to-blue-500' },
  { key: 'business',      label: 'Business System',icon: Box,         grad: 'from-rose-500 to-red-500' },
  { key: 'game',          label: 'Game',           icon: Gamepad2,     grad: 'from-orange-500 to-amber-500' },
  { key: 'knowledge',     label: 'Knowledge Base', icon: BookOpen,    grad: 'from-teal-500 to-cyan-500' },
  { key: 'internal',      label: 'Internal Tool',  icon: Wrench,      grad: 'from-slate-500 to-zinc-500' },
];

const cat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

// ─── Projects ─────────────────────────────────────────
export const PROJECTS = [
  {
    id: 'atlas', name: 'Atlas Analytics', description: 'Real-time analytics dashboard with AI-powered insights and predictive forecasting.',
    category: 'webapp', status: 'live', progress: 100, framework: 'React + Vite', language: 'TypeScript',
    owner: 'Maya Chen', ownerAvatar: 'MC', ownerGrad: 'from-violet-500 to-indigo-500',
    collaborators: ['Sarah Kim', 'Dev Patel', 'Lena Ortiz'], agents: ['Research Agent', 'Developer Agent', 'QA Agent'],
    updated: '2 hours ago', favorite: true, priority: 'high', tags: ['dashboard', 'analytics', 'b2b'],
    deploy: 'production', deployHealth: 'healthy', stars: 4.9, thumbnail: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'nova', name: 'Nova Support', description: 'AI customer support platform with ticket routing, sentiment analysis and auto-responses.',
    category: 'aiagent', status: 'building', progress: 72, framework: 'Next.js', language: 'TypeScript',
    owner: 'Jordan Lee', ownerAvatar: 'JL', ownerGrad: 'from-emerald-500 to-teal-500',
    collaborators: ['Tom Wright', 'Priya Shah'], agents: ['Support Agent', 'Sentiment Agent', 'Router Agent'],
    updated: '34 min ago', favorite: true, priority: 'high', tags: ['support', 'ai', 'saas'],
    deploy: 'staging', deployHealth: 'healthy', stars: 4.7, thumbnail: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'orbit', name: 'Orbit Commerce', description: 'Headless e-commerce storefront with AI product recommendations and dynamic pricing.',
    category: 'webapp', status: 'testing', progress: 88, framework: 'React + Vite', language: 'JavaScript',
    owner: 'Sarah Kim', ownerAvatar: 'SK', ownerGrad: 'from-fuchsia-500 to-pink-500',
    collaborators: ['Maya Chen', 'Dev Patel'], agents: ['Pricing Agent', 'Recommendation Agent'],
    updated: '5 hours ago', favorite: false, priority: 'medium', tags: ['ecommerce', 'ai', 'retail'],
    deploy: 'development', deployHealth: 'warning', stars: 4.6, thumbnail: 'from-fuchsia-600 to-pink-600',
  },
  {
    id: 'pulse', name: 'Pulse Health', description: 'Patient management system with appointment scheduling, records and AI triage assistant.',
    category: 'business', status: 'review', progress: 94, framework: 'Next.js', language: 'TypeScript',
    owner: 'Dev Patel', ownerAvatar: 'DP', ownerGrad: 'from-rose-500 to-red-500',
    collaborators: ['Lena Ortiz', 'Tom Wright'], agents: ['Triage Agent', 'Scheduler Agent'],
    updated: '1 day ago', favorite: false, priority: 'high', tags: ['healthcare', 'booking'],
    deploy: 'staging', deployHealth: 'healthy', stars: 4.8, thumbnail: 'from-rose-600 to-red-600',
  },
  {
    id: 'forge', name: 'Forge API Gateway', description: 'Unified API gateway with rate limiting, auth, and AI-powered request routing.',
    category: 'api', status: 'live', progress: 100, framework: 'FastAPI', language: 'Python',
    owner: 'Tom Wright', ownerAvatar: 'TW', ownerGrad: 'from-emerald-500 to-green-500',
    collaborators: ['Jordan Lee'], agents: ['Router Agent', 'Security Agent'],
    updated: '3 days ago', favorite: true, priority: 'high', tags: ['api', 'backend', 'infra'],
    deploy: 'production', deployHealth: 'healthy', stars: 4.9, thumbnail: 'from-emerald-600 to-green-600',
  },
  {
    id: 'studio', name: 'Studio Mobile', description: 'Cross-platform mobile app for creative professionals with AI design assistant.',
    category: 'mobile', status: 'building', progress: 54, framework: 'React Native', language: 'TypeScript',
    owner: 'Lena Ortiz', ownerAvatar: 'LO', ownerGrad: 'from-cyan-500 to-teal-500',
    collaborators: ['Sarah Kim', 'Priya Shah'], agents: ['Design Agent', 'UX Agent'],
    updated: '12 min ago', favorite: false, priority: 'medium', tags: ['mobile', 'design', 'creative'],
    deploy: 'development', deployHealth: 'warning', stars: 4.5, thumbnail: 'from-cyan-600 to-teal-600',
  },
  {
    id: 'quest', name: 'Quest Game Engine', description: 'AI-driven procedural game engine with dynamic storytelling and NPC behavior.',
    category: 'game', status: 'planning', progress: 18, framework: 'Three.js + React', language: 'JavaScript',
    owner: 'Priya Shah', ownerAvatar: 'PS', ownerGrad: 'from-orange-500 to-amber-500',
    collaborators: ['Dev Patel'], agents: ['Story Agent', 'NPC Agent', 'Level Agent'],
    updated: '2 days ago', favorite: false, priority: 'low', tags: ['game', '3d', 'procedural'],
    deploy: 'none', deployHealth: 'none', stars: 4.3, thumbnail: 'from-orange-600 to-amber-600',
  },
  {
    id: 'vault', name: 'Vault Knowledge Base', description: 'Enterprise knowledge base with semantic search, auto-categorization and AI Q&A.',
    category: 'knowledge', status: 'deploying', progress: 96, framework: 'Next.js', language: 'TypeScript',
    owner: 'Maya Chen', ownerAvatar: 'MC', ownerGrad: 'from-teal-500 to-cyan-500',
    collaborators: ['Tom Wright', 'Lena Ortiz', 'Dev Patel'], agents: ['Search Agent', 'Indexing Agent', 'QA Agent'],
    updated: '1 hour ago', favorite: true, priority: 'high', tags: ['knowledge', 'search', 'enterprise'],
    deploy: 'production', deployHealth: 'healthy', stars: 4.8, thumbnail: 'from-teal-600 to-cyan-600',
  },
  {
    id: 'flowdesk', name: 'FlowDesk Internal', description: 'Internal operations tool for workflow automation and team coordination.',
    category: 'internal', status: 'paused', progress: 41, framework: 'React + Vite', language: 'JavaScript',
    owner: 'Jordan Lee', ownerAvatar: 'JL', ownerGrad: 'from-slate-500 to-zinc-500',
    collaborators: ['Sarah Kim'], agents: ['Ops Agent'],
    updated: '1 week ago', favorite: false, priority: 'low', tags: ['internal', 'ops'],
    deploy: 'none', deployHealth: 'none', stars: 4.2, thumbnail: 'from-slate-600 to-zinc-600',
  },
  {
    id: 'lumen', name: 'Lumen Landing', description: 'High-converting marketing landing page with A/B testing and AI copy optimization.',
    category: 'website', status: 'live', progress: 100, framework: 'Astro', language: 'TypeScript',
    owner: 'Sarah Kim', ownerAvatar: 'SK', ownerGrad: 'from-sky-500 to-blue-500',
    collaborators: ['Priya Shah'], agents: ['Copy Agent', 'SEO Agent'],
    updated: '4 days ago', favorite: false, priority: 'medium', tags: ['marketing', 'landing'],
    deploy: 'production', deployHealth: 'healthy', stars: 4.7, thumbnail: 'from-sky-600 to-blue-600',
  },
  {
    id: 'mesh', name: 'Mesh Automation', description: 'Cross-platform automation hub connecting 200+ services with AI workflow builder.',
    category: 'automation', status: 'completed', progress: 100, framework: 'Node.js', language: 'TypeScript',
    owner: 'Dev Patel', ownerAvatar: 'DP', ownerGrad: 'from-amber-500 to-orange-500',
    collaborators: ['Tom Wright', 'Jordan Lee'], agents: ['Builder Agent', 'Connector Agent'],
    updated: '6 days ago', favorite: true, priority: 'medium', tags: ['automation', 'integration'],
    deploy: 'production', deployHealth: 'healthy', stars: 4.9, thumbnail: 'from-amber-600 to-orange-600',
  },
  {
    id: 'coredb', name: 'CoreDB Desktop', description: 'Desktop database manager with visual schema design and AI query optimization.',
    category: 'desktop', status: 'archived', progress: 100, framework: 'Electron + React', language: 'TypeScript',
    owner: 'Tom Wright', ownerAvatar: 'TW', ownerGrad: 'from-indigo-500 to-blue-500',
    collaborators: [], agents: ['Query Agent'],
    updated: '3 weeks ago', favorite: false, priority: 'low', tags: ['desktop', 'database'],
    deploy: 'none', deployHealth: 'none', stars: 4.4, thumbnail: 'from-indigo-600 to-blue-600',
  },
];

export const catIcon = (key) => cat(key).icon;
export const catGrad = (key) => cat(key).grad;
export const catLabel = (key) => cat(key).label;

// ─── Folders ──────────────────────────────────────────
export const FOLDERS = [
  { name: 'Client Projects',   count: 24, icon: Briefcase, grad: 'from-violet-500 to-indigo-500', color: 'text-violet-300' },
  { name: 'Internal Tools',    count: 12, icon: Wrench,    grad: 'from-cyan-500 to-teal-500', color: 'text-cyan-300' },
  { name: 'AI Experiments',    count: 8,  icon: Sparkles,  grad: 'from-fuchsia-500 to-pink-500', color: 'text-fuchsia-300' },
  { name: 'Marketing',         count: 6,  icon: Megaphone,  grad: 'from-amber-500 to-orange-500', color: 'text-amber-300' },
  { name: 'Research',          count: 9,  icon: BookOpen,  grad: 'from-emerald-500 to-teal-500', color: 'text-emerald-300' },
  { name: 'Archived',          count: 15, icon: Archive,   grad: 'from-slate-500 to-zinc-500', color: 'text-slate-300' },
  { name: 'Personal',          count: 5,  icon: Star,       grad: 'from-rose-500 to-red-500', color: 'text-rose-300' },
  { name: 'Enterprise',        count: 18, icon: Landmark,  grad: 'from-sky-500 to-blue-500', color: 'text-sky-300' },
];

// ─── Templates ─────────────────────────────────────────
export const TEMPLATES = [
  { name: 'CRM Platform',       desc: 'Customer relationship management with AI insights.',   icon: Users,        grad: 'from-violet-500 to-indigo-500', uses: '2.4K', rating: 4.9 },
  { name: 'Marketplace',         desc: 'Multi-vendor marketplace with escrow and reviews.',     icon: ShoppingBag,  grad: 'from-emerald-500 to-teal-500', uses: '1.8K', rating: 4.8 },
  { name: 'Landing Page',       desc: 'High-converting landing page with A/B testing.',         icon: Rocket,      grad: 'from-sky-500 to-blue-500', uses: '5.1K', rating: 4.9 },
  { name: 'Portfolio',          desc: 'Creative portfolio with case studies and blog.',         icon: Palette,     grad: 'from-fuchsia-500 to-pink-500', uses: '3.2K', rating: 4.7 },
  { name: 'Dashboard',          desc: 'Admin dashboard with charts and data tables.',          icon: BarChart3,   grad: 'from-amber-500 to-orange-500', uses: '4.0K', rating: 4.8 },
  { name: 'E-commerce',         desc: 'Full e-commerce with cart, checkout and inventory.',     icon: ShoppingBag, grad: 'from-rose-500 to-red-500', uses: '2.9K', rating: 4.7 },
  { name: 'SaaS',               desc: 'Multi-tenant SaaS with billing and auth.',              icon: Layers,      grad: 'from-purple-500 to-violet-500', uses: '3.7K', rating: 4.9 },
  { name: 'Healthcare',         desc: 'Patient portal with scheduling and records.',           icon: HeartPulse,  grad: 'from-teal-500 to-cyan-500', uses: '1.2K', rating: 4.6 },
  { name: 'Education',         desc: 'LMS with courses, quizzes and progress tracking.',       icon: GraduationCap, grad: 'from-indigo-500 to-blue-500', uses: '2.1K', rating: 4.7 },
  { name: 'Finance',           desc: 'Finance tracker with budgets and forecasting.',         icon: Landmark,    grad: 'from-emerald-500 to-green-500', uses: '1.6K', rating: 4.8 },
  { name: 'Booking Platform',  desc: 'Appointment booking with calendar sync.',               icon: CalendarCheck, grad: 'from-cyan-500 to-sky-500', uses: '1.9K', rating: 4.6 },
  { name: 'AI Chatbot',        desc: 'Conversational AI with RAG and tools.',                  icon: Bot,         grad: 'from-fuchsia-500 to-purple-500', uses: '6.3K', rating: 4.9 },
];

// ─── Recent Activity ──────────────────────────────────
export const RECENT_ACTIVITY = [
  { who: 'Developer Agent', what: 'committed code to Atlas Analytics', time: '4 min ago', icon: GitCommit, grad: 'from-violet-500 to-indigo-500' },
  { who: 'Research Agent', what: 'completed market analysis for Nova', time: '22 min ago', icon: BookOpen, grad: 'from-emerald-500 to-teal-500' },
  { who: 'System', what: 'deployed Orbit Commerce to staging', time: '1 hr ago', icon: CloudUpload, grad: 'from-sky-500 to-blue-500' },
  { who: 'QA Agent', what: 'updated test coverage for Vault KB', time: '2 hrs ago', icon: CheckCircle, grad: 'from-amber-500 to-orange-500' },
  { who: 'System', what: 'generated documentation for Forge API', time: '3 hrs ago', icon: FileText, grad: 'from-fuchsia-500 to-pink-500' },
  { who: 'Design Agent', what: 'created 12 UI components for Studio', time: '5 hrs ago', icon: Palette, grad: 'from-cyan-500 to-teal-500' },
  { who: 'Sarah Kim', what: 'approved Pull Request #482', time: '6 hrs ago', icon: UserCheck, grad: 'from-rose-500 to-red-500' },
  { who: 'Security Agent', what: 'scanned dependencies — 0 vulnerabilities', time: '8 hrs ago', icon: ShieldCheck, grad: 'from-emerald-500 to-green-500' },
];

// ─── Collaboration ────────────────────────────────────
export const ONLINE_MEMBERS = [
  { name: 'Maya Chen',   role: 'Lead Engineer', avatar: 'MC', grad: 'from-violet-500 to-indigo-500', status: 'editing' },
  { name: 'Jordan Lee',  role: 'Product',       avatar: 'JL', grad: 'from-emerald-500 to-teal-500', status: 'viewing' },
  { name: 'Sarah Kim',   role: 'Designer',      avatar: 'SK', grad: 'from-fuchsia-500 to-pink-500', status: 'editing' },
  { name: 'Dev Patel',   role: 'Engineer',      avatar: 'DP', grad: 'from-rose-500 to-red-500', status: 'idle' },
  { name: 'Tom Wright',  role: 'Backend',       avatar: 'TW', grad: 'from-emerald-500 to-green-500', status: 'viewing' },
  { name: 'Lena Ortiz',  role: 'Mobile',        avatar: 'LO', grad: 'from-cyan-500 to-teal-500', status: 'editing' },
  { name: 'Priya Shah',  role: 'Creative',      avatar: 'PS', grad: 'from-orange-500 to-amber-500', status: 'idle' },
  { name: 'Alex Rivera', role: 'DevOps',        avatar: 'AR', grad: 'from-sky-500 to-blue-500', status: 'viewing' },
];

export const COMMENTS = [
  { who: 'Maya Chen', avatar: 'MC', grad: 'from-violet-500 to-indigo-500', text: 'Pushed the new analytics widget — needs design review.', time: '12 min ago' },
  { who: 'Sarah Kim', avatar: 'SK', grad: 'from-fuchsia-500 to-pink-500', text: 'Looks great! Can we adjust the chart colors for dark mode?', time: '8 min ago' },
  { who: 'Dev Patel', avatar: 'DP', grad: 'from-rose-500 to-red-500', text: '@Jordan the API endpoints are ready for integration testing.', time: '3 min ago', mention: 'Jordan Lee' },
];

export const APPROVALS = [
  { title: 'Merge PR #482 — Atlas Dashboard Redesign', requester: 'Maya Chen', type: 'Code Review', status: 'pending' },
  { title: 'Deploy Nova Support to Production', requester: 'Jordan Lee', type: 'Deployment', status: 'pending' },
  { title: 'Schema Migration — Vault KB', requester: 'Tom Wright', type: 'Database', status: 'approved' },
];

export const RECENT_EDITS = [
  { file: 'src/components/Dashboard.jsx', who: 'Maya Chen', time: '4 min ago', action: 'edited' },
  { file: 'api/routes/analytics.ts', who: 'Tom Wright', time: '18 min ago', action: 'created' },
  { file: 'package.json', who: 'Dev Patel', time: '1 hr ago', action: 'updated' },
  { file: 'README.md', who: 'Research Agent', time: '2 hrs ago', action: 'generated' },
];

// ─── Version History ──────────────────────────────────
export const VERSION_HISTORY = [
  { version: 'v2.4.1', label: 'Released',   desc: 'Hotfix for chart rendering on Safari', who: 'Developer Agent', time: '2 hours ago', type: 'released', icon: Rocket, grad: 'from-emerald-500 to-teal-500' },
  { version: 'v2.4.0', label: 'Published',  desc: 'New analytics dashboard + AI insights panel', who: 'Maya Chen', time: '1 day ago', type: 'published', icon: CloudUpload, grad: 'from-sky-500 to-blue-500' },
  { version: 'v2.3.9', label: 'Edited',     desc: 'Refactored data layer and API client', who: 'Tom Wright', time: '3 days ago', type: 'edited', icon: GitCommit, grad: 'from-violet-500 to-indigo-500' },
  { version: 'v2.3.8', label: 'Rolled Back',desc: 'Reverted auth changes — session bug', who: 'System', time: '5 days ago', type: 'rollback', icon: RefreshCw, grad: 'from-rose-500 to-red-500' },
  { version: 'v2.3.7', label: 'Released',   desc: 'Performance optimizations and caching', who: 'Developer Agent', time: '1 week ago', type: 'released', icon: Rocket, grad: 'from-emerald-500 to-teal-500' },
  { version: 'v2.3.0', label: 'Created',    desc: 'Initial project scaffold and design system', who: 'Maya Chen', time: '2 weeks ago', type: 'created', icon: Sparkles, grad: 'from-fuchsia-500 to-pink-500' },
];

// ─── Deployments ──────────────────────────────────────
export const DEPLOYMENTS = [
  { env: 'production',  label: 'Production',  status: 'healthy',  version: 'v2.4.1', time: '2 hours ago', icon: Cloud,       grad: 'from-emerald-500 to-teal-500', health: 99.9 },
  { env: 'staging',     label: 'Staging',     status: 'healthy',  version: 'v2.5.0-rc', time: '4 hours ago', icon: Cloud,     grad: 'from-amber-500 to-orange-500', health: 98.5 },
  { env: 'development', label: 'Development', status: 'warning',  version: 'v2.5.0-dev', time: '12 min ago', icon: Terminal, grad: 'from-sky-500 to-blue-500', health: 92.0 },
];

// ─── Project Detail (sample) ───────────────────────────
export const PROJECT_DETAIL = {
  completion: 72,
  aiActivity: 'High',
  runningTasks: 4,
  pendingTasks: 7,
  upcomingDeadlines: [
    { title: 'API Integration Review', due: 'Tomorrow', icon: GitBranch },
    { title: 'Staging Deploy', due: 'Aug 9', icon: CloudUpload },
    { title: 'QA Sign-off', due: 'Aug 12', icon: CheckCircle },
  ],
  buildStatus: 'passing',
  deployStatus: 'staging',
  recentChanges: [
    { file: 'Dashboard.jsx', change: '+142 −38', who: 'Developer Agent', time: '4 min ago' },
    { file: 'analytics.ts', change: '+88 −12', who: 'Tom Wright', time: '18 min ago' },
    { file: 'theme.json', change: '+6 −3', who: 'Sarah Kim', time: '1 hr ago' },
  ],
  timeline: [
    { phase: 'Planning', done: true, date: 'Jun 12' },
    { phase: 'Design', done: true, date: 'Jun 28' },
    { phase: 'Development', done: false, current: true, date: 'In progress' },
    { phase: 'Testing', done: false, date: 'Aug 15' },
    { phase: 'Deployment', done: false, date: 'Aug 22' },
  ],
  workforce: [
    { name: 'Developer Agent', role: 'Code generation', status: 'running', tasks: 14, icon: Code2, grad: 'from-violet-500 to-indigo-500' },
    { name: 'Research Agent', role: 'Market analysis', status: 'idle', tasks: 3, icon: BookOpen, grad: 'from-emerald-500 to-teal-500' },
    { name: 'QA Agent', role: 'Testing & coverage', status: 'running', tasks: 8, icon: CheckCircle2, grad: 'from-amber-500 to-orange-500' },
    { name: 'Design Agent', role: 'UI components', status: 'idle', tasks: 5, icon: Palette, grad: 'from-cyan-500 to-teal-500' },
  ],
  tasks: [
    { title: 'Build analytics widget', status: 'done', assignee: 'Developer Agent' },
    { title: 'Integrate forecasting API', status: 'in_progress', assignee: 'Tom Wright' },
    { title: 'Write E2E tests', status: 'todo', assignee: 'QA Agent' },
    { title: 'Design dark mode variants', status: 'review', assignee: 'Sarah Kim' },
    { title: 'Optimize bundle size', status: 'todo', assignee: 'Developer Agent' },
  ],
  files: [
    { name: 'Dashboard.jsx', size: '24 KB', type: 'code' },
    { name: 'analytics.ts', size: '18 KB', type: 'code' },
    { name: 'theme.json', size: '4 KB', type: 'config' },
    { name: 'logo.svg', size: '12 KB', type: 'asset' },
    { name: 'README.md', size: '8 KB', type: 'doc' },
  ],
  models: ['GPT-5', 'Claude Sonnet 4.6', 'Gemini 3 Flash', 'Llama 3.3'],
  integrations: ['GitHub', 'Slack', 'Stripe', 'Vercel', 'Supabase'],
};

// ─── Right Sidebar ─────────────────────────────────────
export const NOTIFICATIONS = [
  { title: 'Build passed', detail: 'Atlas Analytics — v2.4.1', time: '4 min', icon: CheckCircle, color: 'text-emerald-400' },
  { title: 'Approval needed', detail: 'Deploy Nova to production', time: '22 min', icon: AlertCircle, color: 'text-amber-400' },
  { title: 'New comment', detail: 'Sarah Kim on Dashboard.jsx', time: '8 min', icon: MessageSquare, color: 'text-sky-400' },
  { title: 'Agent idle', detail: 'Research Agent waiting for input', time: '1 hr', icon: Bot, color: 'text-zinc-400' },
];

export const RECOMMENDATIONS = [
  { title: 'Add E2E tests', detail: 'Coverage at 68% — add tests for analytics module.', icon: ShieldCheck, grad: 'from-emerald-500 to-teal-500' },
  { title: 'Optimize images', detail: '4 images over 500KB detected.', icon: Zap, grad: 'from-amber-500 to-orange-500' },
  { title: 'Upgrade dependencies', detail: '6 packages have updates available.', icon: TrendingUp, grad: 'from-sky-500 to-blue-500' },
];

export const PINNED_PROJECTS = [
  { name: 'Atlas Analytics', status: 'live', progress: 100, grad: 'from-violet-500 to-indigo-500' },
  { name: 'Nova Support', status: 'building', progress: 72, grad: 'from-emerald-500 to-teal-500' },
  { name: 'Vault KB', status: 'deploying', progress: 96, grad: 'from-teal-500 to-cyan-500' },
];

export const FAV_TEMPLATES = [
  { name: 'CRM Platform', uses: '2.4K', grad: 'from-violet-500 to-indigo-500' },
  { name: 'AI Chatbot', uses: '6.3K', grad: 'from-fuchsia-500 to-purple-500' },
  { name: 'SaaS', uses: '3.7K', grad: 'from-purple-500 to-violet-500' },
];

export const RECENT_FILES = [
  { name: 'Dashboard.jsx', project: 'Atlas', time: '4 min', icon: Code2 },
  { name: 'analytics.ts', project: 'Atlas', time: '18 min', icon: Terminal },
  { name: 'README.md', project: 'Vault KB', time: '1 hr', icon: FileText },
  { name: 'logo.svg', project: 'Studio', time: '2 hr', icon: Palette },
];

export const AI_SUGGESTIONS = [
  { text: 'Use the Research Agent to analyze competitor pricing for Orbit Commerce.', icon: Sparkles },
  { text: 'Generate API documentation for the Forge Gateway endpoints.', icon: FileText },
  { text: 'Create a Kanban board for the Quest Game Engine sprint.', icon: Layout },
];