export const TOPICS = [
  { key: 'getting-started', label: 'Getting Started', icon: 'Rocket', tone: 'from-violet-500 to-fuchsia-500', count: 12 },
  { key: 'agents', label: 'Agents', icon: 'Bot', tone: 'from-cyan-500 to-sky-500', count: 24 },
  { key: 'projects', label: 'Projects', icon: 'FolderKanban', tone: 'from-emerald-500 to-teal-500', count: 18 },
  { key: 'billing', label: 'Billing', icon: 'CreditCard', tone: 'from-amber-500 to-orange-500', count: 9 },
  { key: 'integrations', label: 'Integrations', icon: 'Plug', tone: 'from-blue-500 to-indigo-500', count: 31 },
  { key: 'developer-tools', label: 'Developer Tools', icon: 'Code2', tone: 'from-teal-500 to-cyan-500', count: 27 },
  { key: 'security', label: 'Security', icon: 'ShieldCheck', tone: 'from-rose-500 to-pink-500', count: 15 },
  { key: 'workflows', label: 'Workflows', icon: 'Workflow', tone: 'from-purple-500 to-violet-500', count: 21 },
];

export const ARTICLES = [
  { title: 'How to create your first AI agent', topic: 'getting-started', author: 'PalladiumAI', read: '5 min read', date: 'Aug 2026', excerpt: 'A step-by-step walkthrough of building, configuring and deploying your first agent.', views: '4.2k', helpful: 98 },
  { title: 'Composing multi-agent workforces', topic: 'agents', author: 'PalladiumAI', read: '8 min read', date: 'Aug 2026', excerpt: 'Combine specialised agents so they collaborate and hand off tasks automatically.', views: '2.8k', helpful: 95 },
  { title: 'Organising projects and files', topic: 'projects', author: 'PalladiumAI', read: '6 min read', date: 'Jul 2026', excerpt: 'Structure projects, attach context and manage assets at scale.', views: '1.9k', helpful: 92 },
  { title: 'Understanding plans and credits', topic: 'billing', author: 'PalladiumAI', read: '4 min read', date: 'Jul 2026', excerpt: 'How billing works, what credits cover, and how to upgrade or downgrade.', views: '3.1k', helpful: 90 },
  { title: 'Connecting Slack, Gmail and Google Drive', topic: 'integrations', author: 'PalladiumAI', read: '7 min read', date: 'Aug 2026', excerpt: 'Authorise connectors and route data between your tools and agents.', views: '2.4k', helpful: 94 },
  { title: 'Using the Agent SDK from your app', topic: 'developer-tools', author: 'Dev Team', read: '11 min read', date: 'Aug 2026', excerpt: 'Embed PalladiumAI agents in your own product with the SDK and webhooks.', views: '1.6k', helpful: 97 },
  { title: 'Securing your workspace', topic: 'security', author: 'PalladiumAI', read: '9 min read', date: 'Jul 2026', excerpt: 'SSO, role-based access, audit logs and data residency explained.', views: '2.1k', helpful: 96 },
  { title: 'Building your first workflow', topic: 'workflows', author: 'PalladiumAI', read: '10 min read', date: 'Aug 2026', excerpt: 'Trigger, branch and chain steps to automate multi-step processes.', views: '3.4k', helpful: 93 },
  { title: 'Inviting team members and assigning roles', topic: 'getting-started', author: 'PalladiumAI', read: '4 min read', date: 'Jul 2026', excerpt: 'Add people, set roles and control who can build, deploy and view data.', views: '1.7k', helpful: 91 },
  { title: 'Monitoring agent performance', topic: 'agents', author: 'PalladiumAI', read: '6 min read', date: 'Aug 2026', excerpt: 'Track runs, costs, accuracy and set guardrails for production agents.', views: '1.3k', helpful: 89 },
  { title: 'Setting up API keys and webhooks', topic: 'developer-tools', author: 'Dev Team', read: '5 min read', date: 'Jul 2026', excerpt: 'Generate keys, sign requests and receive real-time webhook events.', views: '1.1k', helpful: 94 },
  { title: 'Managing payment methods and invoices', topic: 'billing', author: 'PalladiumAI', read: '3 min read', date: 'Jul 2026', excerpt: 'Update cards, download invoices and manage tax details.', views: '2.0k', helpful: 88 },
];

export const FAQ = [
  { q: 'How do I create my first AI agent?', a: 'Navigate to AI Agents in your workspace, click "New agent", choose a model, add a system prompt and tools, then test it in the playground before deploying.' },
  { q: 'What are AI credits and how do they work?', a: 'AI credits are consumed when your agents run LLM calls, generate content or use integrations. Each plan includes a monthly allowance; unused credits do not roll over.' },
  { q: 'Can I bring my own API keys?', a: 'Yes. You can connect your own model provider keys (OpenAI, Anthropic, Google) under Settings → AI Models to route usage to your own accounts.' },
  { q: 'How do I invite team members?', a: 'Go to Team & Org, click Invite, enter an email and assign a role. Invitees receive an email and join your workspace on sign-up.' },
  { q: 'Is my data secure?', a: 'All data is encrypted in transit and at rest. Workspaces support SSO, role-based access, audit logging and regional data residency on Business and Enterprise plans.' },
  { q: 'Can I cancel or change my plan anytime?', a: 'Yes. Upgrade, downgrade or cancel at any time from Billing. Changes apply immediately and are prorated.' },
];

export const AI_SUGGESTIONS = [
  'How do I build a sales agent?',
  'Reset my API key',
  'Why is my workflow not running?',
  'Compare Professional vs Business plans',
];