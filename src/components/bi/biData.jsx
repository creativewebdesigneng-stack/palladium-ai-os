// Mock data for the Business Intelligence dashboard. Backend ready.

export const METRICS = [
  { id: 'revenue', label: 'Revenue', value: '$284,320', delta: '+12.4%', up: true, tone: 'from-emerald-600/40 to-teal-600/40' },
  { id: 'costs', label: 'Costs', value: '$96,840', delta: '+4.1%', up: false, tone: 'from-rose-600/40 to-orange-600/40' },
  { id: 'ai-usage', label: 'AI Usage', value: '4.2M', sub: 'tokens', delta: '+18%', up: true, tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'agent-prod', label: 'Agent Productivity', value: '87%', delta: '+6.2%', up: true, tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'projects', label: 'Projects', value: '42', sub: 'active', delta: '+3', up: true, tone: 'from-amber-600/40 to-yellow-600/40' },
  { id: 'customers', label: 'Customers', value: '1,284', delta: '+8.6%', up: true, tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'tasks', label: 'Tasks', value: '3,640', sub: 'completed', delta: '+212', up: true, tone: 'from-cyan-600/40 to-sky-600/40' },
  { id: 'automation', label: 'Automation', value: '68%', sub: 'of workflows', delta: '+11%', up: true, tone: 'from-lime-600/40 to-green-600/40' },
];

export const REVENUE_SERIES = [
  { m: 'Mar', revenue: 182000, target: 175000 },
  { m: 'Apr', revenue: 198000, target: 190000 },
  { m: 'May', revenue: 212000, target: 205000 },
  { m: 'Jun', revenue: 234000, target: 220000 },
  { m: 'Jul', revenue: 256000, target: 240000 },
  { m: 'Aug', revenue: 284320, target: 260000 },
];

export const AI_COSTS_SERIES = [
  { m: 'Mar', inference: 12000, api: 6000 },
  { m: 'Apr', inference: 14800, api: 7400 },
  { m: 'May', inference: 16200, api: 8100 },
  { m: 'Jun', inference: 18900, api: 9300 },
  { m: 'Jul', inference: 21600, api: 10400 },
  { m: 'Aug', inference: 24800, api: 11200 },
];

export const AGENT_PERFORMANCE = [
  { agent: 'Support Triage', tasks: 1840, accuracy: 94 },
  { agent: 'Research Bot', tasks: 1240, accuracy: 88 },
  { agent: 'Data Analyst', tasks: 980, accuracy: 91 },
  { agent: 'Content Writer', tasks: 760, accuracy: 86 },
  { agent: 'Code Reviewer', tasks: 540, accuracy: 97 },
];

export const PROJECT_COMPLETION = [
  { name: 'Completed', value: 28, color: '#10b981' },
  { name: 'In progress', value: 12, color: '#f59e0b' },
  { name: 'At risk', value: 2, color: '#f43f5e' },
];

export const CUSTOMER_GROWTH_SERIES = [
  { m: 'Mar', customers: 842 },
  { m: 'Apr', customers: 912 },
  { m: 'May', customers: 1024 },
  { m: 'Jun', customers: 1140 },
  { m: 'Jul', customers: 1218 },
  { m: 'Aug', customers: 1284 },
];

export const FILTERS = {
  dates: ['Last 7 days', 'Last 30 days', 'This quarter', 'This year', 'Custom range'],
  departments: ['All departments', 'Engineering', 'Product', 'Support', 'Sales', 'Marketing'],
  agents: ['All agents', 'Support Triage', 'Research Bot', 'Data Analyst', 'Content Writer', 'Code Reviewer'],
  projects: ['All projects', 'Palladium App', 'Palladium API', 'Marketing Site', 'Docs Portal'],
  teams: ['All teams', 'Platform', 'Growth', 'Customer Success', 'Founders'],
};

export const AI_INSIGHTS = [
  { id: 1, tone: 'positive', title: 'Automation reduced estimated manual workload by 23%', detail: 'Workflow automations handled 3,640 tasks this month, freeing an estimated 412 engineer-hours.' },
  { id: 2, tone: 'positive', title: 'Revenue is trending 12% above target', detail: 'Driven by a 31% increase in Pro plan conversions since the June pricing refresh.' },
  { id: 3, tone: 'warning', title: 'AI inference costs rose 31% MoM', detail: 'Research Bot token usage spiked after the web-search rollout — consider caching or a smaller model for routine queries.' },
  { id: 4, tone: 'neutral', title: 'Customer growth is accelerating in EMEA', detail: 'EMEA accounted for 46% of net new accounts this month, up from 38% in July.' },
  { id: 5, tone: 'positive', title: 'Agent accuracy improved across the board', detail: 'Average agent accuracy reached 91% (+4pts), with Code Reviewer leading at 97%.' },
  { id: 6, tone: 'warning', title: '2 projects flagged at risk', detail: 'Docs Portal and Marketing Site are 9 and 12 days behind their projected completion dates.' },
];

export const INSIGHT_TONE = {
  positive: { icon: 'TrendingUp', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  warning: { icon: 'TriangleAlert', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  neutral: { icon: 'Lightbulb', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
};