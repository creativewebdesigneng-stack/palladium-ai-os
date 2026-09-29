export const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'Layers' },
  { key: 'docs', label: 'Documentation', icon: 'BookOpen' },
  { key: 'guides', label: 'Guides', icon: 'Compass' },
  { key: 'tutorials', label: 'Tutorials', icon: 'GraduationCap' },
  { key: 'platform', label: 'Platform', icon: 'Newspaper' },
  { key: 'dev', label: 'Developer Resources', icon: 'Code2' },
];

export const FEATURED = [
  {
    title: 'Blackstar architecture overview',
    category: 'platform',
    read: '8 min read',
    excerpt: 'Understand the bounded General Intelligence architecture, Astra-class engine and governed execution model.',
    tone: 'from-violet-500 to-fuchsia-500',
    to: '/features',
  },
  {
    title: 'Build your first AI workforce',
    category: 'guides',
    read: '10 min read',
    excerpt: 'See how agents, capabilities, workflows and approvals fit together inside the existing Blackstar workforce model.',
    tone: 'from-cyan-500 to-sky-500',
    to: '/ai-agents',
  },
  {
    title: 'Connected execution and approvals',
    category: 'docs',
    read: '7 min read',
    excerpt: 'Learn why consequential external actions stay on explicit approval or policy boundaries.',
    tone: 'from-emerald-500 to-teal-500',
    to: '/features',
  },
];

export const RECENT = [
  { title: 'Agent Builder checklist', category: 'guides', read: '6 min', to: '/register?returnTo=/agent-builder' },
  { title: 'Using the MCP surface', category: 'dev', read: '8 min', to: '/mcp' },
  { title: 'Understanding the AI Hub', category: 'docs', read: '7 min', to: '/register?returnTo=/ai-hub' },
  { title: 'Mission Control live state', category: 'docs', read: '6 min', to: '/register?returnTo=/mission-control' },
  { title: 'Retail Hub connected workflows', category: 'tutorials', read: '9 min', to: '/register?returnTo=/retail-hub' },
  { title: 'Company Hub operating workspace', category: 'tutorials', read: '9 min', to: '/register?returnTo=/company-hub' },
  { title: 'Website Studio builder', category: 'tutorials', read: '8 min', to: '/register?returnTo=/website-studio' },
  { title: 'Cinema Studio rendering pipeline', category: 'guides', read: '10 min', to: '/register?returnTo=/cinema-studio' },
];

export const SECTIONS = [
  { key: 'docs', label: 'Documentation', desc: 'Product and execution guidance tied to Blackstar’s current surfaces.', tone: 'text-sky-300', to: '/help' },
  { key: 'guides', label: 'Guides', desc: 'Practical guides for agents, workflows and operating hubs.', tone: 'text-violet-300', to: '/resources' },
  { key: 'tutorials', label: 'Tutorials', desc: 'Task-oriented walkthroughs for connected Blackstar workflows.', tone: 'text-emerald-300', to: '/resources' },
  { key: 'platform', label: 'Platform', desc: 'Architecture, governance and capability overviews.', tone: 'text-fuchsia-300', to: '/features' },
  { key: 'dev', label: 'Developer Resources', desc: 'Developer portal, MCP, API and integration guidance.', tone: 'text-teal-300', to: '/developers' },
];
