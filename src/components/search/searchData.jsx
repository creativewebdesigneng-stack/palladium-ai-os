// Mock searchable dataset + suggestion metadata for the Global Search system.
// Replace SEARCH_ITEMS with backend reads (entities / vector store) when ready.

export const CATEGORIES = [
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', grad: 'from-indigo-500 to-purple-500', href: '/projects' },
  { id: 'agents', label: 'Agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500', href: '/agents' },
  { id: 'tasks', label: 'Tasks', icon: 'ListChecks', grad: 'from-violet-500 to-indigo-500', href: '/tasks' },
  { id: 'files', label: 'Files', icon: 'FileText', grad: 'from-zinc-500 to-slate-600', href: '/files' },
  { id: 'knowledge', label: 'Knowledge', icon: 'BookOpen', grad: 'from-emerald-500 to-teal-500', href: '/files' },
  { id: 'workflows', label: 'Workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500', href: '/automation' },
  { id: 'integrations', label: 'Integrations', icon: 'Plug', grad: 'from-amber-500 to-orange-500', href: '/integrations' },
  { id: 'users', label: 'Users', icon: 'User', grad: 'from-rose-500 to-red-500', href: '/team' },
  { id: 'teams', label: 'Teams', icon: 'Users', grad: 'from-emerald-500 to-green-600', href: '/team' },
  { id: 'docs', label: 'Documentation', icon: 'BookText', grad: 'from-cyan-500 to-blue-500', href: '/docs' },
  { id: 'models', label: 'AI Models', icon: 'Cpu', grad: 'from-violet-500 to-fuchsia-500', href: '/models' },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store', grad: 'from-amber-500 to-yellow-500', href: '/marketplace' },
];

// status per category varies; `status` drives intent filtering + badges
export const SEARCH_ITEMS = [
  // Projects
  { id: 'p1', category: 'projects', title: 'Atlas Analytics Platform', desc: 'Unified analytics dashboard for customer insights.', status: 'active', daysAgo: 2, tags: ['analytics','dashboard','production'], href: '/projects' },
  { id: 'p2', category: 'projects', title: 'Nova Support Bot', desc: 'AI-first customer support experience.', status: 'active', daysAgo: 5, tags: ['support','chatbot'], href: '/projects' },
  { id: 'p3', category: 'projects', title: 'Orbit Commerce', desc: 'Headless commerce storefront with AI recommendations.', status: 'planning', daysAgo: 9, tags: ['commerce','storefront'], href: '/projects' },
  { id: 'p4', category: 'projects', title: 'Helios Mobile', desc: 'Mobile companion app for field teams.', status: 'paused', daysAgo: 21, tags: ['mobile','ios','android'], href: '/projects' },
  { id: 'p5', category: 'projects', title: 'Lumen Reporting', desc: 'Automated weekly reporting pipeline.', status: 'completed', daysAgo: 40, tags: ['reports','etl'], href: '/projects' },
  // Agents
  { id: 'a1', category: 'agents', title: 'Research Agent', desc: 'Synthesises market briefs from web + internal data.', status: 'running', daysAgo: 0, tags: ['research','web'], href: '/agents' },
  { id: 'a2', category: 'agents', title: 'Code Agent', desc: 'Writes and reviews PRs across repositories.', status: 'idle', daysAgo: 1, tags: ['code','github','review'], href: '/agents' },
  { id: 'a3', category: 'agents', title: 'Support Agent', desc: 'Triage and resolve customer tickets.', status: 'running', daysAgo: 0, tags: ['support','tickets'], href: '/agents' },
  { id: 'a4', category: 'agents', title: 'Data Agent', desc: 'Runs SQL queries and builds charts.', status: 'error', daysAgo: 3, tags: ['data','sql','charts'], href: '/agents' },
  // Tasks
  { id: 't1', category: 'tasks', title: 'Review workforce plan', desc: 'Approve Q3 agent workforce allocation.', status: 'in_progress', daysAgo: 0, tags: ['planning','workforce'], href: '/tasks' },
  { id: 't2', category: 'tasks', title: 'Fix checkout flow', desc: 'Resolve payment redirect on mobile.', status: 'todo', daysAgo: 1, tags: ['bug','checkout'], href: '/tasks' },
  { id: 't3', category: 'tasks', title: 'Publish v2.4.1', desc: 'Cut release and update changelog.', status: 'todo', daysAgo: 2, tags: ['release'], href: '/tasks' },
  { id: 't4', category: 'tasks', title: 'Migrate billing DB', desc: 'Move billing records to new cluster.', status: 'done', daysAgo: 12, tags: ['billing','migration'], href: '/tasks' },
  // Files
  { id: 'f1', category: 'files', title: 'Vendor Contract — Acme.pdf', desc: 'Signed MSA, uploaded to Knowledge Hub.', status: '-', daysAgo: 4, tags: ['contract','legal','acme'], href: '/files' },
  { id: 'f2', category: 'files', title: 'Q3 Strategy Deck.pdf', desc: 'Leadership strategy presentation.', status: '-', daysAgo: 6, tags: ['strategy','deck'], href: '/files' },
  { id: 'f3', category: 'files', title: 'Brand System.fig', desc: 'Design tokens and component library.', status: '-', daysAgo: 14, tags: ['design','brand'], href: '/files' },
  { id: 'f4', category: 'files', title: 'Agent Prompts.md', desc: 'Curated prompt library for agents.', status: '-', daysAgo: 18, tags: ['prompts','agents'], href: '/files' },
  // Knowledge
  { id: 'k1', category: 'knowledge', title: 'Onboarding Playbook', desc: 'How new hires get started on PalladiumAI.', status: '-', daysAgo: 8, tags: ['onboarding','hr'], href: '/files' },
  { id: 'k2', category: 'knowledge', title: 'API Reference', desc: 'Public REST + webhook documentation.', status: '-', daysAgo: 11, tags: ['api','docs'], href: '/files' },
  { id: 'k3', category: 'knowledge', title: 'Security Policies', desc: 'SOC2 controls and access policy.', status: '-', daysAgo: 30, tags: ['security','soc2'], href: '/files' },
  // Workflows
  { id: 'w1', category: 'workflows', title: 'Daily Sales Digest', desc: 'Aggregates sales and posts to Slack each morning.', status: 'running', daysAgo: 0, tags: ['sales','slack','schedule'], href: '/automation' },
  { id: 'w2', category: 'workflows', title: 'Release v2.4.1', desc: 'Build, test and deploy on tag push.', status: 'failed', daysAgo: 0, tags: ['ci','deploy','github'], href: '/automation' },
  { id: 'w3', category: 'workflows', title: 'Lead Enrichment', desc: 'Enriches new leads with firmographics.', status: 'succeeded', daysAgo: 1, tags: ['crm','leads'], href: '/automation' },
  { id: 'w4', category: 'workflows', title: 'Invoice Reminder', desc: 'Sends reminders for overdue invoices.', status: 'paused', daysAgo: 5, tags: ['billing','reminder'], href: '/automation' },
  // Integrations
  { id: 'i1', category: 'integrations', title: 'Slack', desc: 'Team messaging and workflow alerts.', status: 'connected', daysAgo: 2, tags: ['slack','messaging'], href: '/integrations' },
  { id: 'i2', category: 'integrations', title: 'GitHub', desc: 'Source control and CI.', status: 'connected', daysAgo: 2, tags: ['github','git'], href: '/integrations' },
  { id: 'i3', category: 'integrations', title: 'Stripe', desc: 'Payments and subscriptions.', status: 'connected', daysAgo: 7, tags: ['stripe','payments'], href: '/integrations' },
  { id: 'i4', category: 'integrations', title: 'Notion', desc: 'Docs and knowledge base.', status: 'available', daysAgo: 15, tags: ['notion','docs'], href: '/integrations' },
  // Users
  { id: 'u1', category: 'users', title: 'Alex Kerr', desc: 'Workspace admin · London.', status: '-', daysAgo: 0, tags: ['admin','alex'], href: '/team' },
  { id: 'u2', category: 'users', title: 'Maya Patel', desc: 'Engineering lead.', status: '-', daysAgo: 1, tags: ['engineering','maya'], href: '/team' },
  { id: 'u3', category: 'users', title: 'Jordan Lee', desc: 'Backend engineer.', status: '-', daysAgo: 1, tags: ['engineering','jordan'], href: '/team' },
  // Teams
  { id: 'tm1', category: 'teams', title: 'Engineering', desc: 'Platform + product engineering.', status: '-', daysAgo: 3, tags: ['engineering'], href: '/team' },
  { id: 'tm2', category: 'teams', title: 'AI Workforce', desc: 'Autonomous agents squad.', status: '-', daysAgo: 3, tags: ['ai','agents'], href: '/team' },
  { id: 'tm3', category: 'teams', title: 'Revenue', desc: 'Sales, marketing and success.', status: '-', daysAgo: 5, tags: ['revenue','sales'], href: '/team' },
  // Documentation
  { id: 'd1', category: 'docs', title: 'Getting started', desc: 'Set up your first agent in 5 minutes.', status: '-', daysAgo: 4, tags: ['guide','start'], href: '/docs' },
  { id: 'd2', category: 'docs', title: 'Agent SDK reference', desc: 'Build code agents with tools.', status: '-', daysAgo: 9, tags: ['sdk','agents'], href: '/docs' },
  { id: 'd3', category: 'docs', title: 'Workflow triggers', desc: 'Scheduled, entity and webhook triggers.', status: '-', daysAgo: 13, tags: ['workflows','triggers'], href: '/docs' },
  // AI Models
  { id: 'm1', category: 'models', title: 'Gemini 2.5 Pro', desc: 'Google multimodal model.', status: 'connected', daysAgo: 1, tags: ['google','multimodal'], href: '/models' },
  { id: 'm2', category: 'models', title: 'Claude Sonnet 4.6', desc: 'Anthropic long-context reasoning.', status: 'connected', daysAgo: 1, tags: ['anthropic','reasoning'], href: '/models' },
  { id: 'm3', category: 'models', title: 'GPT-5.4', desc: 'OpenAI flagship model.', status: 'connected', daysAgo: 2, tags: ['openai'], href: '/models' },
  { id: 'm4', category: 'models', title: 'Llama 3.3 70B', desc: 'Local runtime model.', status: 'available', daysAgo: 6, tags: ['local','llama'], href: '/models' },
  // Marketplace
  { id: 'mk1', category: 'marketplace', title: 'Sales Copilot', desc: 'Agent that drafts outbound sequences.', status: '-', daysAgo: 2, tags: ['sales','agent'], href: '/marketplace' },
  { id: 'mk2', category: 'marketplace', title: 'PDF Extractor', desc: 'Plugin to extract structured data from PDFs.', status: '-', daysAgo: 4, tags: ['pdf','plugin'], href: '/marketplace' },
  { id: 'mk3', category: 'marketplace', title: 'Slack Notifier', desc: 'Workflow block for Slack messages.', status: '-', daysAgo: 7, tags: ['slack','workflow'], href: '/marketplace' },
];

export const AI_EXAMPLES = [
  'Show me all unfinished projects.',
  'Find the contract uploaded last week.',
  'Which agents are currently running?',
  'Show failed workflows.',
  'What did Maya work on recently?',
  'List connected AI models.',
];

export const RECENT_SEARCHES = [
  'Research Agent',
  'unpaid invoices',
  'Atlas Analytics',
  'failed workflows',
];

export const POPULAR_SEARCHES = [
  'Agents',
  'Workflows',
  'Marketplace',
  'API keys',
  'Onboarding',
];