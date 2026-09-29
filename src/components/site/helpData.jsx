export const TOPICS = [
  { key: 'getting-started', label: 'Getting Started', icon: 'Rocket', tone: 'from-violet-500 to-fuchsia-500' },
  { key: 'agents', label: 'Agents', icon: 'Bot', tone: 'from-cyan-500 to-sky-500' },
  { key: 'projects', label: 'Projects', icon: 'FolderKanban', tone: 'from-emerald-500 to-teal-500' },
  { key: 'billing', label: 'Billing', icon: 'CreditCard', tone: 'from-amber-500 to-orange-500' },
  { key: 'integrations', label: 'Integrations', icon: 'Plug', tone: 'from-blue-500 to-indigo-500' },
  { key: 'developer-tools', label: 'Developer Tools', icon: 'Code2', tone: 'from-teal-500 to-cyan-500' },
  { key: 'security', label: 'Security', icon: 'ShieldCheck', tone: 'from-rose-500 to-pink-500' },
  { key: 'workflows', label: 'Workflows', icon: 'Workflow', tone: 'from-purple-500 to-violet-500' },
];

export const ARTICLES = [
  { title: 'Create your first AI agent', topic: 'getting-started', read: '5 min read', excerpt: 'Build an agent, attach capabilities and test it before using it for operational work.' },
  { title: 'Understand approval-gated execution', topic: 'getting-started', read: '4 min read', excerpt: 'See when Blackstar requires an approval before a connected external action can run.' },
  { title: 'Coordinate a multi-agent workforce', topic: 'agents', read: '7 min read', excerpt: 'Organise specialist agents around a shared objective while keeping execution visible.' },
  { title: 'Review agent runs and failures', topic: 'agents', read: '5 min read', excerpt: 'Use runtime and mission surfaces to inspect execution state instead of relying on simulated progress.' },
  { title: 'Organise projects and files', topic: 'projects', read: '6 min read', excerpt: 'Keep project files, context and repository-backed work grouped around the task they support.' },
  { title: 'Understand subscription state', topic: 'billing', read: '4 min read', excerpt: 'Blackstar reads plan and entitlement state from the connected billing and subscription records.' },
  { title: 'Review Marketplace fees before publishing', topic: 'billing', read: '4 min read', excerpt: 'Check listing and transaction charges on the Marketplace flow before committing a paid action.' },
  { title: 'Connect supported providers', topic: 'integrations', read: '7 min read', excerpt: 'Use the Integration Hub to connect providers through Blackstar’s existing connector and OAuth boundaries.' },
  { title: 'Use the developer surfaces', topic: 'developer-tools', read: '8 min read', excerpt: 'Work with Blackstar’s developer portal, public API routes, MCP surfaces and integration tooling.' },
  { title: 'Use API and webhook credentials safely', topic: 'developer-tools', read: '5 min read', excerpt: 'Keep credentials server-side where required and use the platform’s authenticated integration flows.' },
  { title: 'Review workspace security signals', topic: 'security', read: '6 min read', excerpt: 'Inspect authenticated session, role, approval and audit information available in the Security surfaces.' },
  { title: 'Build and inspect a workflow', topic: 'workflows', read: '8 min read', excerpt: 'Create a workflow, review its steps and inspect the durable run state when execution starts.' },
];

export const FAQ = [
  { q: 'How do I create my first AI agent?', a: 'Open AI Agents or Agent Builder, configure the agent’s objective and capabilities, then test it before using it for operational work.' },
  { q: 'Why does an action need approval?', a: 'Blackstar keeps consequential external writes on approval or policy gates where that execution path requires human control. The approval record is separate from the agent’s planning state.' },
  { q: 'How do I connect another service?', a: 'Open Integrations and use the connector offered for that provider. Blackstar supports multiple connector patterns rather than assuming every service uses the same provider.' },
  { q: 'Where can I see my subscription status?', a: 'Open Billing. Blackstar resolves entitlement state from the connected subscription records; available plan actions depend on the live billing integration.' },
  { q: 'What security information can I review?', a: 'The Security surfaces report session, role, approval and audit information that Blackstar can verify. Draft public policy pages are not certification claims.' },
  { q: 'Why is my workflow not running?', a: 'Check the workflow run state, required approvals, connected provider availability and any recorded execution error before retrying.' },
];

export const AI_SUGGESTIONS = [
  'How do I build a sales agent?',
  'Why does this action need approval?',
  'Why is my workflow not running?',
  'How do I connect a provider?',
];
