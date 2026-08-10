import {
  Bot, Users, MessageSquare, Workflow, LayoutGrid, Globe, Smartphone, Server,
  Briefcase, Code2, Plug, Puzzle, Database, BookOpen, Mic, Image as ImageIcon,
  Video, CheckSquare, Megaphone, DollarSign, TrendingUp, Headphones, Search,
  GraduationCap, HeartPulse, Scale, Gamepad2, BrainCircuit, Star, Download,
  Shield, Zap, Crown, Sparkles, BadgeCheck, FileCode2, GitBranch, Cpu,
  Terminal, FolderTree, Monitor, MessageCircle, Layers, FolderOpen, Clock,
} from 'lucide-react';

/* ── Category Grid ─────────────────────────────────────────── */
export const CATEGORIES = [
  { name: 'AI Agents', icon: Bot, count: '2,840', grad: 'from-violet-500 to-indigo-500' },
  { name: 'AI Teams', icon: Users, count: '420', grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Prompt Packs', icon: MessageSquare, count: '1,560', grad: 'from-cyan-500 to-sky-500' },
  { name: 'Automation Workflows', icon: Workflow, count: '980', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Applications', icon: LayoutGrid, count: '740', grad: 'from-amber-500 to-orange-500' },
  { name: 'Website Templates', icon: Globe, count: '1,120', grad: 'from-blue-500 to-cyan-500' },
  { name: 'Mobile App Templates', icon: Smartphone, count: '680', grad: 'from-rose-500 to-pink-500' },
  { name: 'SaaS Templates', icon: Server, count: '540', grad: 'from-indigo-500 to-purple-500' },
  { name: 'Business Systems', icon: Briefcase, count: '390', grad: 'from-slate-500 to-zinc-500' },
  { name: 'Developer Tools', icon: Code2, count: '1,240', grad: 'from-emerald-500 to-green-500' },
  { name: 'Plugins', icon: Plug, count: '890', grad: 'from-violet-500 to-purple-500' },
  { name: 'Extensions', icon: Puzzle, count: '560', grad: 'from-teal-500 to-cyan-500' },
  { name: 'Integrations', icon: Layers, count: '720', grad: 'from-orange-500 to-amber-500' },
  { name: 'MCP Servers', icon: Server, count: '340', grad: 'from-sky-500 to-blue-500' },
  { name: 'Models', icon: BrainCircuit, count: '280', grad: 'from-fuchsia-500 to-violet-500' },
  { name: 'Datasets', icon: Database, count: '450', grad: 'from-lime-500 to-emerald-500' },
  { name: 'Knowledge Packs', icon: BookOpen, count: '620', grad: 'from-indigo-500 to-blue-500' },
  { name: 'Voice Agents', icon: Mic, count: '210', grad: 'from-pink-500 to-rose-500' },
  { name: 'Image Models', icon: ImageIcon, count: '190', grad: 'from-purple-500 to-fuchsia-500' },
  { name: 'Video Tools', icon: Video, count: '170', grad: 'from-red-500 to-orange-500' },
  { name: 'Productivity', icon: CheckSquare, count: '1,340', grad: 'from-cyan-500 to-teal-500' },
  { name: 'Marketing', icon: Megaphone, count: '1,080', grad: 'from-violet-500 to-fuchsia-500' },
  { name: 'Finance', icon: DollarSign, count: '560', grad: 'from-emerald-500 to-green-500' },
  { name: 'Sales', icon: TrendingUp, count: '720', grad: 'from-blue-500 to-indigo-500' },
  { name: 'Customer Support', icon: Headphones, count: '480', grad: 'from-amber-500 to-yellow-500' },
  { name: 'Research', icon: Search, count: '390', grad: 'from-sky-500 to-cyan-500' },
  { name: 'Education', icon: GraduationCap, count: '640', grad: 'from-teal-500 to-emerald-500' },
  { name: 'Healthcare', icon: HeartPulse, count: '280', grad: 'from-rose-500 to-red-500' },
  { name: 'Legal', icon: Scale, count: '190', grad: 'from-slate-500 to-gray-500' },
  { name: 'Gaming', icon: Gamepad2, count: '340', grad: 'from-violet-500 to-blue-500' },
];

/* ── Featured Carousel ─────────────────────────────────────── */
export const FEATURED = [
  { tag: 'Featured AI Agent', title: 'Atlas Revenue Intelligence', creator: 'Palladium Labs', avatarGrad: 'from-violet-500 to-indigo-500', rating: 4.9, downloads: '124k', price: '£29/mo', banner: 'from-violet-600/40 via-fuchsia-500/20 to-cyan-400/10', icon: Bot, desc: 'Autonomous revenue forecasting, pipeline analysis & deal coaching across your CRM.' },
  { tag: 'Trending App', title: 'Nexus CRM Suite', creator: 'Vertex Studios', avatarGrad: 'from-cyan-500 to-sky-500', rating: 4.8, downloads: '89k', price: '£19/mo', banner: 'from-cyan-600/40 via-blue-500/20 to-indigo-400/10', icon: LayoutGrid, desc: 'Full-featured customer relationship platform with AI-driven lead scoring and enrichment.' },
  { tag: "Editor's Choice", title: 'Quill Content Studio', creator: 'InkForge', avatarGrad: 'from-amber-500 to-orange-500', rating: 5.0, downloads: '67k', price: '£15/mo', banner: 'from-amber-500/30 via-rose-500/20 to-fuchsia-400/10', icon: Sparkles, desc: 'Multi-agent content engine for blogs, ad copy, and SEO at enterprise scale.' },
  { tag: 'Top Plugin', title: 'GitHub Power Sync', creator: 'DevForge', avatarGrad: 'from-emerald-500 to-teal-500', rating: 4.9, downloads: '210k', price: 'Free', banner: 'from-emerald-600/30 via-teal-500/20 to-cyan-400/10', icon: Plug, desc: 'Bi-directional repo sync, release automation, and AI-powered PR reviews.' },
  { tag: 'Most Downloaded', title: 'FlowOps Automation Pack', creator: 'Palladium Labs', avatarGrad: 'from-blue-500 to-indigo-500', rating: 4.7, downloads: '480k', price: '£9/mo', banner: 'from-blue-600/30 via-violet-500/20 to-fuchsia-400/10', icon: Workflow, desc: '120+ pre-built automations for sales, marketing, ops and support workflows.' },
  { tag: 'Newest Release', title: 'Sonar Voice Agent', creator: 'Acoustic AI', avatarGrad: 'from-pink-500 to-rose-500', rating: 4.8, downloads: '12k', price: '£25/mo', banner: 'from-pink-600/30 via-rose-500/20 to-amber-400/10', icon: Mic, desc: 'Real-time voice assistant with sub-300ms latency and 40+ language support.' },
];

/* ── Trending ───────────────────────────────────────────────── */
export const TRENDING = [
  { title: 'Sentinel SOC Analyst', desc: 'Autonomous security operations agent with threat triage.', creator: 'CyberDyne', avatarGrad: 'from-sky-500 to-blue-500', rating: 4.9, reviews: 842, downloads: '54k', price: '£19', banner: 'from-sky-600/30 to-blue-400/10' },
  { title: 'Bloom Marketing Engine', desc: 'Multi-channel campaign orchestration with AI creative.', creator: 'GrowthLab', avatarGrad: 'from-fuchsia-500 to-pink-500', rating: 4.8, reviews: 1204, downloads: '88k', price: '£24', banner: 'from-fuchsia-600/30 to-pink-400/10' },
  { title: 'Ledger Finance Copilot', desc: 'Bookkeeping, invoicing and cashflow forecasting agent.', creator: 'FinStack', avatarGrad: 'from-emerald-500 to-teal-500', rating: 4.7, reviews: 560, downloads: '41k', price: '£29', banner: 'from-emerald-600/30 to-teal-400/10' },
  { title: 'Forge Code Reviewer', desc: 'AI code review with security, perf and style checks.', creator: 'DevForge', avatarGrad: 'from-violet-500 to-indigo-500', rating: 4.9, reviews: 2010, downloads: '132k', price: 'Free', banner: 'from-violet-600/30 to-indigo-400/10' },
  { title: 'Pulse Support Desk', desc: 'Tier-1/Tier-2 customer support automation platform.', creator: 'HelpHub', avatarGrad: 'from-amber-500 to-orange-500', rating: 4.8, reviews: 930, downloads: '67k', price: '£15', banner: 'from-amber-600/30 to-orange-400/10' },
  { title: 'Compass Research Agent', desc: 'Deep research with citations across 10k+ sources.', creator: 'InsightAI', avatarGrad: 'from-cyan-500 to-sky-500', rating: 4.9, reviews: 712, downloads: '49k', price: '£12', banner: 'from-cyan-600/30 to-sky-400/10' },
  { title: 'Atlas SEO Optimizer', desc: 'Technical SEO, content gaps and ranking tracking suite.', creator: 'RankWorks', avatarGrad: 'from-rose-500 to-pink-500', rating: 4.7, reviews: 420, downloads: '38k', price: '£18', banner: 'from-rose-600/30 to-pink-400/10' },
  { title: 'Vault Legal Reviewer', desc: 'Contract analysis, redlining and compliance checking.', creator: 'LegalTech', avatarGrad: 'from-slate-500 to-zinc-500', rating: 4.8, reviews: 318, downloads: '22k', price: '£35', banner: 'from-slate-600/30 to-zinc-400/10' },
];

/* ── AI Agents ─────────────────────────────────────────────── */
export const AI_AGENTS = [
  { name: 'Marketing Agent', desc: 'Plans and executes multi-channel campaigns.', capabilities: ['Campaign planning', 'Ad copy', 'A/B testing'], models: 'GPT-5, Claude', version: '2.4.1', downloads: '88k', rating: 4.8, creator: 'GrowthLab', price: '£24', grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Research Agent', desc: 'Deep research with cited sources and summaries.', capabilities: ['Web search', 'Citations', 'Reports'], models: 'Gemini, GPT-5', version: '1.9.0', downloads: '49k', rating: 4.9, creator: 'InsightAI', price: '£12', grad: 'from-cyan-500 to-sky-500' },
  { name: 'Sales Agent', desc: 'Lead qualification, outreach and deal coaching.', capabilities: ['Lead scoring', 'Outreach', 'CRM sync'], models: 'Claude, GPT-5', version: '3.1.2', downloads: '72k', rating: 4.7, creator: 'RevenuePro', price: '£29', grad: 'from-blue-500 to-indigo-500' },
  { name: 'Coding Agent', desc: 'Writes, refactors and reviews code autonomously.', capabilities: ['Code gen', 'Refactor', 'PR review'], models: 'Claude, GPT-5', version: '4.0.0', downloads: '132k', rating: 4.9, creator: 'DevForge', price: 'Free', grad: 'from-violet-500 to-indigo-500' },
  { name: 'Designer Agent', desc: 'Generates UI mockups, brand assets and icons.', capabilities: ['UI mockups', 'Branding', 'Icons'], models: 'Gemini, DALL-E', version: '2.0.3', downloads: '56k', rating: 4.6, creator: 'PixelLab', price: '£19', grad: 'from-rose-500 to-pink-500' },
  { name: 'SEO Agent', desc: 'Technical audits, content gaps and rank tracking.', capabilities: ['Audits', 'Keywords', 'Tracking'], models: 'GPT-5', version: '1.7.4', downloads: '38k', rating: 4.7, creator: 'RankWorks', price: '£18', grad: 'from-amber-500 to-orange-500' },
  { name: 'Legal Agent', desc: 'Contract review, redlining and compliance.', capabilities: ['Contract review', 'Redlining', 'Compliance'], models: 'Claude', version: '1.3.0', downloads: '22k', rating: 4.8, creator: 'LegalTech', price: '£35', grad: 'from-slate-500 to-zinc-500' },
  { name: 'Recruiter Agent', desc: 'Sourcing, screening and interview scheduling.', capabilities: ['Sourcing', 'Screening', 'Scheduling'], models: 'GPT-5, Claude', version: '2.2.1', downloads: '31k', rating: 4.6, creator: 'TalentAI', price: '£22', grad: 'from-teal-500 to-emerald-500' },
  { name: 'Finance Agent', desc: 'Bookkeeping, forecasting and reporting.', capabilities: ['Bookkeeping', 'Forecasting', 'Reports'], models: 'GPT-5', version: '3.0.1', downloads: '41k', rating: 4.7, creator: 'FinStack', price: '£29', grad: 'from-emerald-500 to-green-500' },
  { name: 'Operations Manager', desc: 'Coordinates teams, tasks and resources.', capabilities: ['Task routing', 'Resource alloc', 'Reporting'], models: 'Claude, GPT-5', version: '2.5.0', downloads: '34k', rating: 4.8, creator: 'OpsHub', price: '£26', grad: 'from-indigo-500 to-purple-500' },
];

/* ── Applications ──────────────────────────────────────────── */
export const APPLICATIONS = [
  { name: 'CRM', desc: 'Customer relationship management suite.', downloads: '120k', rating: 4.8, price: '£19', grad: 'from-violet-500 to-indigo-500', icon: Briefcase },
  { name: 'Project Manager', desc: 'Tasks, sprints and roadmap planning.', downloads: '98k', rating: 4.7, price: '£15', grad: 'from-blue-500 to-cyan-500', icon: CheckSquare },
  { name: 'Inventory System', desc: 'Stock tracking across warehouses.', downloads: '54k', rating: 4.6, price: '£22', grad: 'from-emerald-500 to-teal-500', icon: Database },
  { name: 'Booking Platform', desc: 'Calendar and appointment scheduling.', downloads: '67k', rating: 4.8, price: '£18', grad: 'from-amber-500 to-orange-500', icon: LayoutGrid },
  { name: 'E-commerce', desc: 'Storefront, checkout and inventory.', downloads: '210k', rating: 4.7, price: '£29', grad: 'from-fuchsia-500 to-pink-500', icon: DollarSign },
  { name: 'Help Desk', desc: 'Ticketing and customer support.', downloads: '78k', rating: 4.8, price: '£15', grad: 'from-cyan-500 to-sky-500', icon: Headphones },
  { name: 'Accounting', desc: 'Books, invoices and tax reporting.', downloads: '62k', rating: 4.6, price: '£25', grad: 'from-emerald-500 to-green-500', icon: DollarSign },
  { name: 'Analytics', desc: 'Dashboards and reporting platform.', downloads: '145k', rating: 4.9, price: '£24', grad: 'from-indigo-500 to-purple-500', icon: TrendingUp },
  { name: 'Marketing Dashboard', desc: 'Campaign performance and attribution.', downloads: '89k', rating: 4.7, price: '£21', grad: 'from-rose-500 to-pink-500', icon: Megaphone },
  { name: 'Employee Portal', desc: 'HR, payroll and self-service.', downloads: '43k', rating: 4.5, price: '£19', grad: 'from-teal-500 to-cyan-500', icon: Users },
];

/* ── Workflow Library ──────────────────────────────────────── */
export const WORKFLOWS = [
  { name: 'Lead Generation', desc: 'Capture, enrich and route leads automatically.', steps: 8, runs: '1.2M', rating: 4.8, downloads: '88k', price: '£12', grad: 'from-violet-500 to-indigo-500', icon: TrendingUp },
  { name: 'Email Automation', desc: 'Drip campaigns, sequences and triggers.', steps: 12, runs: '3.4M', rating: 4.7, downloads: '120k', price: '£9', grad: 'from-cyan-500 to-sky-500', icon: MessageSquare },
  { name: 'Content Creation', desc: 'Brief to publish multi-format content pipeline.', steps: 10, runs: '890k', rating: 4.9, downloads: '67k', price: '£15', grad: 'from-fuchsia-500 to-pink-500', icon: Sparkles },
  { name: 'Research Pipeline', desc: 'Collect, analyse and summarise sources.', steps: 6, runs: '560k', rating: 4.8, downloads: '49k', price: '£14', grad: 'from-blue-500 to-cyan-500', icon: Search },
  { name: 'Sales Funnel', desc: 'Qualify, nurture and close deals end-to-end.', steps: 14, runs: '2.1M', rating: 4.7, downloads: '72k', price: '£19', grad: 'from-emerald-500 to-teal-500', icon: TrendingUp },
  { name: 'Customer Support', desc: 'Triage, route and resolve tickets.', steps: 9, runs: '1.8M', rating: 4.6, downloads: '54k', price: '£11', grad: 'from-amber-500 to-orange-500', icon: Headphones },
  { name: 'Document Processing', desc: 'Extract, classify and file documents.', steps: 7, runs: '940k', rating: 4.7, downloads: '38k', price: '£16', grad: 'from-indigo-500 to-purple-500', icon: FileCode2 },
  { name: 'Social Media', desc: 'Plan, post and analyse across channels.', steps: 11, runs: '1.5M', rating: 4.8, downloads: '61k', price: '£13', grad: 'from-rose-500 to-pink-500', icon: Megaphone },
  { name: 'Software Deployment', desc: 'Build, test and ship with zero downtime.', steps: 13, runs: '780k', rating: 4.9, downloads: '45k', price: '£22', grad: 'from-teal-500 to-emerald-500', icon: GitBranch },
];

/* ── Plugins ───────────────────────────────────────────────── */
export const PLUGINS = [
  { name: 'GitHub', desc: 'Repo sync & PR automation', grad: 'from-slate-500 to-zinc-600', icon: GitBranch, rating: 4.9, downloads: '210k', price: 'Free' },
  { name: 'Slack', desc: 'Channel alerts & commands', grad: 'from-violet-500 to-fuchsia-500', icon: MessageCircle, rating: 4.8, downloads: '180k', price: 'Free' },
  { name: 'Discord', desc: 'Bot & webhook integrations', grad: 'from-indigo-500 to-blue-500', icon: MessageCircle, rating: 4.7, downloads: '94k', price: 'Free' },
  { name: 'Google Drive', desc: 'File sync & storage', grad: 'from-emerald-500 to-teal-500', icon: FolderOpen, rating: 4.8, downloads: '160k', price: 'Free' },
  { name: 'Dropbox', desc: 'Cloud storage connector', grad: 'from-cyan-500 to-blue-500', icon: FolderOpen, rating: 4.6, downloads: '78k', price: 'Free' },
  { name: 'Notion', desc: 'Docs & database sync', grad: 'from-slate-500 to-gray-500', icon: BookOpen, rating: 4.8, downloads: '142k', price: 'Free' },
  { name: 'Jira', desc: 'Issue & sprint tracking', grad: 'from-blue-500 to-indigo-500', icon: CheckSquare, rating: 4.7, downloads: '120k', price: '£9' },
  { name: 'Linear', desc: 'Project & cycle management', grad: 'from-violet-500 to-purple-500', icon: Layers, rating: 4.8, downloads: '88k', price: '£9' },
  { name: 'Stripe', desc: 'Payments & subscriptions', grad: 'from-indigo-500 to-violet-500', icon: DollarSign, rating: 4.9, downloads: '150k', price: 'Free' },
  { name: 'PayPal', desc: 'Payments & payouts', grad: 'from-blue-500 to-sky-500', icon: DollarSign, rating: 4.5, downloads: '92k', price: 'Free' },
  { name: 'Twilio', desc: 'SMS & voice messaging', grad: 'from-red-500 to-rose-500', icon: MessageSquare, rating: 4.6, downloads: '64k', price: '£12' },
  { name: 'Zapier', desc: '10k+ app connections', grad: 'from-orange-500 to-amber-500', icon: Zap, rating: 4.7, downloads: '200k', price: 'Free' },
  { name: 'n8n', desc: 'Self-hosted workflow engine', grad: 'from-rose-500 to-pink-500', icon: Workflow, rating: 4.8, downloads: '76k', price: 'Free' },
  { name: 'ClickUp', desc: 'Tasks & docs management', grad: 'from-fuchsia-500 to-purple-500', icon: CheckSquare, rating: 4.6, downloads: '58k', price: '£9' },
  { name: 'HubSpot', desc: 'CRM & marketing automation', grad: 'from-orange-500 to-red-500', icon: Megaphone, rating: 4.7, downloads: '110k', price: '£15' },
  { name: 'Salesforce', desc: 'Enterprise CRM connector', grad: 'from-sky-500 to-blue-500', icon: Briefcase, rating: 4.8, downloads: '98k', price: '£19' },
];

/* ── Integrations ──────────────────────────────────────────── */
export const INTEGRATIONS = [
  { name: 'Salesforce', desc: 'Enterprise CRM sync', verified: true, status: 'Connected', popularity: '98%', compat: 'v2.4+', grad: 'from-sky-500 to-blue-500', icon: Briefcase },
  { name: 'HubSpot', desc: 'Marketing & sales platform', verified: true, status: 'Available', popularity: '95%', compat: 'v3.0+', grad: 'from-orange-500 to-red-500', icon: Megaphone },
  { name: 'Stripe', desc: 'Payments & billing', verified: true, status: 'Connected', popularity: '99%', compat: 'v1.8+', grad: 'from-indigo-500 to-violet-500', icon: DollarSign },
  { name: 'Slack', desc: 'Team messaging', verified: true, status: 'Connected', popularity: '97%', compat: 'v2.0+', grad: 'from-violet-500 to-fuchsia-500', icon: MessageCircle },
  { name: 'Notion', desc: 'Docs & wikis', verified: true, status: 'Available', popularity: '93%', compat: 'v1.5+', grad: 'from-slate-500 to-gray-500', icon: BookOpen },
  { name: 'Linear', desc: 'Issue tracking', verified: false, status: 'Available', popularity: '88%', compat: 'v2.1+', grad: 'from-violet-500 to-purple-500', icon: Layers },
  { name: 'Jira', desc: 'Project management', verified: true, status: 'Available', popularity: '91%', compat: 'v3.2+', grad: 'from-blue-500 to-indigo-500', icon: CheckSquare },
  { name: 'Zapier', desc: 'Automation bridge', verified: true, status: 'Connected', popularity: '96%', compat: 'v2.8+', grad: 'from-orange-500 to-amber-500', icon: Zap },
];

/* ── MCP Servers ───────────────────────────────────────────── */
export const MCP_SERVERS = [
  { name: 'GitHub MCP', desc: 'Repo, issues and PR access via MCP.', capabilities: ['Read repos', 'Create PRs', 'Manage issues'], permissions: ['repo', 'workflow'], grad: 'from-slate-500 to-zinc-600', icon: GitBranch },
  { name: 'Filesystem MCP', desc: 'Secure read/write file operations.', capabilities: ['Read files', 'Write files', 'Watch dirs'], permissions: ['fs:read', 'fs:write'], grad: 'from-emerald-500 to-teal-500', icon: FolderTree },
  { name: 'Browser MCP', desc: 'Headless browser automation & scraping.', capabilities: ['Navigate', 'Screenshot', 'Extract'], permissions: ['browser', 'network'], grad: 'from-cyan-500 to-sky-500', icon: Monitor },
  { name: 'Database MCP', desc: 'Query and mutate SQL/NoSQL stores.', capabilities: ['Query', 'Insert', 'Schema'], permissions: ['db:read', 'db:write'], grad: 'from-blue-500 to-indigo-500', icon: Database },
  { name: 'Terminal MCP', desc: 'Execute shell commands in a sandbox.', capabilities: ['Run cmds', 'Pipe output', 'Scripts'], permissions: ['shell:exec'], grad: 'from-zinc-500 to-slate-600', icon: Terminal },
  { name: 'Slack MCP', desc: 'Send messages and read channels.', capabilities: ['Post', 'Read', 'Reactions'], permissions: ['channels:read', 'chat:write'], grad: 'from-violet-500 to-fuchsia-500', icon: MessageCircle },
  { name: 'Google Workspace MCP', desc: 'Drive, Docs, Sheets and Calendar.', capabilities: ['Docs', 'Sheets', 'Calendar'], permissions: ['drive', 'docs'], grad: 'from-amber-500 to-orange-500', icon: Briefcase },
  { name: 'Notion MCP', desc: 'Read and write Notion pages.', capabilities: ['Pages', 'Databases', 'Search'], permissions: ['pages:rw'], grad: 'from-slate-500 to-gray-500', icon: BookOpen },
  { name: 'Jira MCP', desc: 'Issues, sprints and boards access.', capabilities: ['Issues', 'Sprints', 'Boards'], permissions: ['jira:rw'], grad: 'from-blue-500 to-indigo-500', icon: CheckSquare },
  { name: 'Custom MCP', desc: 'Build and deploy your own MCP server.', capabilities: ['Custom tools', 'Auth', 'Sandbox'], permissions: ['configurable'], grad: 'from-violet-500 to-purple-500', icon: Cpu },
];

/* ── Prompt Store ──────────────────────────────────────────── */
export const PROMPT_PACKS = [
  { name: 'Business', count: 120, rating: 4.8, downloads: '88k', creator: 'Palladium Labs', price: '£9', grad: 'from-blue-500 to-indigo-500', icon: Briefcase },
  { name: 'Coding', count: 240, rating: 4.9, downloads: '142k', creator: 'DevForge', price: 'Free', grad: 'from-emerald-500 to-teal-500', icon: Code2 },
  { name: 'Writing', count: 180, rating: 4.7, downloads: '98k', creator: 'InkForge', price: '£7', grad: 'from-fuchsia-500 to-pink-500', icon: Sparkles },
  { name: 'Marketing', count: 160, rating: 4.8, downloads: '110k', creator: 'GrowthLab', price: '£12', grad: 'from-violet-500 to-fuchsia-500', icon: Megaphone },
  { name: 'Education', count: 95, rating: 4.6, downloads: '54k', creator: 'EduAI', price: '£6', grad: 'from-teal-500 to-emerald-500', icon: GraduationCap },
  { name: 'Legal', count: 78, rating: 4.7, downloads: '32k', creator: 'LegalTech', price: '£19', grad: 'from-slate-500 to-zinc-500', icon: Scale },
  { name: 'Research', count: 130, rating: 4.8, downloads: '67k', creator: 'InsightAI', price: '£10', grad: 'from-cyan-500 to-sky-500', icon: Search },
  { name: 'Creative', count: 210, rating: 4.9, downloads: '128k', creator: 'PixelLab', price: '£8', grad: 'from-rose-500 to-pink-500', icon: ImageIcon },
];

/* ── Creators ──────────────────────────────────────────────── */
export const CREATORS = [
  { name: 'Palladium Labs', handle: '@palladium', verified: true, followers: '248k', items: 42, downloads: '4.8M', revenue: '£1.2M', grad: 'from-violet-500 to-indigo-500', website: 'palladium.ai' },
  { name: 'DevForge', handle: '@devforge', verified: true, followers: '180k', items: 28, downloads: '3.2M', revenue: '£890k', grad: 'from-emerald-500 to-teal-500', website: 'devforge.io' },
  { name: 'GrowthLab', handle: '@growthlab', verified: true, followers: '142k', items: 19, downloads: '2.1M', revenue: '£640k', grad: 'from-fuchsia-500 to-pink-500', website: 'growthlab.co' },
  { name: 'InsightAI', handle: '@insightai', verified: true, followers: '98k', items: 16, downloads: '1.4M', revenue: '£420k', grad: 'from-cyan-500 to-sky-500', website: 'insightai.dev' },
  { name: 'FinStack', handle: '@finstack', verified: true, followers: '76k', items: 12, downloads: '980k', revenue: '£380k', grad: 'from-emerald-500 to-green-500', website: 'finstack.io' },
  { name: 'PixelLab', handle: '@pixellab', verified: false, followers: '54k', items: 22, downloads: '760k', revenue: '£290k', grad: 'from-rose-500 to-pink-500', website: 'pixellab.studio' },
];

/* ── Reviews ───────────────────────────────────────────────── */
export const REVIEWS = [
  { author: 'James Whitfield', avatarGrad: 'from-violet-500 to-indigo-500', rating: 5, verified: true, comment: 'The Atlas Revenue Agent transformed our forecasting. We cut our pipeline review time by 70% in the first month.', helpful: 142, item: 'Atlas Revenue Intelligence', date: '2 days ago' },
  { author: 'Sofia Marchetti', avatarGrad: 'from-fuchsia-500 to-pink-500', rating: 5, verified: true, comment: 'Bloom Marketing Engine is incredible — it generates a full quarter of campaign creative in minutes. Worth every penny.', helpful: 98, item: 'Bloom Marketing Engine', date: '1 week ago' },
  { author: 'Daniel Okafor', avatarGrad: 'from-emerald-500 to-teal-500', rating: 4, verified: true, comment: 'Ledger Finance Copilot is solid for bookkeeping. Would love more bank integrations, but the forecasting is best-in-class.', helpful: 54, item: 'Ledger Finance Copilot', date: '3 days ago' },
  { author: 'Priya Nair', avatarGrad: 'from-cyan-500 to-sky-500', rating: 5, verified: false, comment: "Forge Code Reviewer catches bugs our senior engineers miss. It has become a mandatory step in our PR workflow.", helpful: 210, item: 'Forge Code Reviewer', date: '5 days ago' },
  { author: 'Marcus Chen', avatarGrad: 'from-amber-500 to-orange-500', rating: 5, verified: true, comment: 'Pulse Support Desk reduced our ticket backlog by 80%. The Tier-1 automation handles 70% of issues autonomously.', helpful: 87, item: 'Pulse Support Desk', date: '1 day ago' },
];

/* ── Top Charts ────────────────────────────────────────────── */
export const TOP_CHARTS = [
  { label: 'Most Downloaded', icon: Download, grad: 'from-violet-500 to-indigo-500', items: ['FlowOps Automation Pack', 'Forge Code Reviewer', 'Nexus CRM Suite', 'GitHub Power Sync'] },
  { label: 'Highest Rated', icon: Star, grad: 'from-amber-500 to-orange-500', items: ['Quill Content Studio', 'Atlas Revenue Intelligence', 'Compass Research Agent', 'Sentinel SOC Analyst'] },
  { label: 'Trending Today', icon: TrendingUp, grad: 'from-emerald-500 to-teal-500', items: ['Sonar Voice Agent', 'Bloom Marketing Engine', 'Forge Code Reviewer', 'Atlas SEO Optimizer'] },
  { label: 'Trending This Week', icon: TrendingUp, grad: 'from-fuchsia-500 to-pink-500', items: ['Bloom Marketing Engine', 'Pulse Support Desk', 'Vault Legal Reviewer', 'Compass Research Agent'] },
  { label: 'New Releases', icon: Sparkles, grad: 'from-cyan-500 to-sky-500', items: ['Sonar Voice Agent', 'Compass Research Agent', 'Atlas SEO Optimizer', 'Vault Legal Reviewer'] },
  { label: 'Staff Picks', icon: Crown, grad: 'from-rose-500 to-pink-500', items: ['Quill Content Studio', 'Atlas Revenue Intelligence', 'Forge Code Reviewer', 'Ledger Finance Copilot'] },
  { label: 'Enterprise Ready', icon: Shield, grad: 'from-blue-500 to-indigo-500', items: ['Atlas Revenue Intelligence', 'Vault Legal Reviewer', 'Sentinel SOC Analyst', 'Ledger Finance Copilot'] },
  { label: 'Free', icon: Zap, grad: 'from-emerald-500 to-green-500', items: ['Forge Code Reviewer', 'GitHub Power Sync', 'Slack Plugin', 'Coding Prompt Pack'] },
  { label: 'Paid', icon: BadgeCheck, grad: 'from-amber-500 to-yellow-500', items: ['Atlas Revenue Intelligence', 'Vault Legal Reviewer', 'Ledger Finance Copilot', 'Operations Manager'] },
];

/* ── My Library ────────────────────────────────────────────── */
export const MY_LIBRARY = [
  { tab: 'Installed', icon: Download, count: 24, items: ['Forge Code Reviewer', 'Nexus CRM Suite', 'GitHub Power Sync', 'Slack Plugin'] },
  { tab: 'Purchased', icon: BadgeCheck, count: 8, items: ['Atlas Revenue Intelligence', 'Vault Legal Reviewer', 'Ledger Finance Copilot'] },
  { tab: 'Saved', icon: Sparkles, count: 42, items: ['Bloom Marketing Engine', 'Sonar Voice Agent', 'Quill Content Studio'] },
  { tab: 'Recently Used', icon: Clock, count: 12, items: ['Forge Code Reviewer', 'Atlas Revenue Intelligence', 'Pulse Support Desk'] },
  { tab: 'Updates Available', icon: Zap, count: 3, items: ['Nexus CRM Suite v2.4', 'GitHub Power Sync v1.8', 'Slack Plugin v3.0'] },
];

/* ── Right Sidebar ──────────────────────────────────────────── */
export const NOTIFICATIONS = [
  { kind: 'update', text: 'Nexus CRM Suite has a new update available (v2.4).' },
  { kind: 'recommend', text: 'Based on your installs, you might like Compass Research Agent.' },
  { kind: 'sale', text: 'Atlas Revenue Intelligence is 30% off this week.' },
  { kind: 'update', text: 'Forge Code Reviewer added GPT-5 support.' },
];

export const RECOMMENDATIONS = [
  { text: 'Sentinel SOC Analyst', grad: 'from-sky-500 to-blue-500', icon: Shield },
  { text: 'Compass Research Agent', grad: 'from-cyan-500 to-sky-500', icon: Search },
  { text: 'Quill Content Studio', grad: 'from-amber-500 to-orange-500', icon: Sparkles },
  { text: 'Pulse Support Desk', grad: 'from-amber-500 to-orange-500', icon: Headphones },
];

export const RECENTLY_VIEWED = [
  { name: 'Atlas Revenue Intelligence', type: 'Agent', time: '2m ago' },
  { name: 'Bloom Marketing Engine', type: 'App', time: '1h ago' },
  { name: 'GitHub Power Sync', type: 'Plugin', time: '3h ago' },
  { name: 'FlowOps Automation Pack', type: 'Workflow', time: '1d ago' },
];

export const WISHLIST = [
  { name: 'Sonar Voice Agent', price: '£25' },
  { name: 'Vault Legal Reviewer', price: '£35' },
  { name: 'Operations Manager', price: '£26' },
];

export const FEATURED_CREATOR = { name: 'Palladium Labs', handle: '@palladium', verified: true, followers: '248k', items: 42, grad: 'from-violet-500 to-indigo-500' };

export const MARKETPLACE_NEWS = [
  { title: 'MCP Server Library now live', time: '2h ago' },
  { title: 'Creator revenue payouts processed', time: '6h ago' },
  { title: 'New: Voice Agents category', time: '1d ago' },
  { title: 'Q3 Marketplace Hackathon winners', time: '2d ago' },
];

/* ── Styling Maps ──────────────────────────────────────────── */
export const STATUS_STYLE = {
  Connected: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
  Available: 'bg-white/5 text-zinc-400 border-white/10',
};