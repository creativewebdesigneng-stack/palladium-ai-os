// Mock data for the PalladiumAI Admin Dashboard — illustrative, backend-ready.

export const METRICS = [
  { id:'users', label:'Total Users', value:'48,210', detail:'+312 this week', icon:'Users', tone:'violet' },
  { id:'active', label:'Active Users', value:'12,840', detail:'26.6% of total', icon:'Activity', tone:'emerald' },
  { id:'revenue', label:'Revenue (MRR)', value:'$284,920', detail:'+8.2% MoM', icon:'Wallet', tone:'sky' },
  { id:'subs', label:'Subscriptions', value:'9,418', detail:'842 on enterprise', icon:'CreditCard', tone:'amber' },
  { id:'requests', label:'AI Requests', value:'4.2M', detail:'this month', icon:'Zap', tone:'fuchsia' },
  { id:'runs', label:'Agent Runs', value:'318,402', detail:'+12.4% WoW', icon:'Bot', tone:'violet' },
  { id:'projects', label:'Projects', value:'6,182', detail:'412 created today', icon:'FolderKanban', tone:'blue' },
  { id:'errors', label:'Errors (24h)', value:'182', detail:'-14 vs yesterday', icon:'AlertTriangle', tone:'rose' },
  { id:'health', label:'System Health', value:'99.98%', detail:'all systems operational', icon:'ShieldCheck', tone:'emerald' },
];

export const QUICK_ACTIONS = [
  { label:'Manage Users', path:'/admin/users', icon:'Users' },
  { label:'Manage Plans', path:'/admin/subscriptions', icon:'CreditCard' },
  { label:'Manage Integrations', path:'/admin/integrations', icon:'Plug' },
  { label:'System Settings', path:'/admin/system-settings', icon:'Settings' },
  { label:'Security', path:'/admin/security', icon:'ShieldCheck' },
  { label:'Audit Logs', path:'/admin/audit-logs', icon:'ScrollText' },
];

export const USER_GROWTH = [
  { m:'Jan', users:18200 }, { m:'Feb', users:21400 }, { m:'Mar', users:23800 },
  { m:'Apr', users:26500 }, { m:'May', users:29100 }, { m:'Jun', users:32400 },
  { m:'Jul', users:36200 }, { m:'Aug', users:39800 }, { m:'Sep', users:42100 },
  { m:'Oct', users:44820 }, { m:'Nov', users:46310 }, { m:'Dec', users:48210 },
];

export const REVENUE = [
  { m:'Jan', mrr:142000 }, { m:'Feb', mrr:158000 }, { m:'Mar', mrr:171000 },
  { m:'Apr', mrr:189000 }, { m:'May', mrr:204000 }, { m:'Jun', mrr:218000 },
  { m:'Jul', mrr:232000 }, { m:'Aug', mrr:241000 }, { m:'Sep', mrr:252000 },
  { m:'Oct', mrr:263000 }, { m:'Nov', mrr:274000 }, { m:'Dec', mrr:284920 },
];

export const AI_USAGE = [
  { d:'Mon', requests:124000 }, { d:'Tue', requests:138000 }, { d:'Wed', requests:142000 },
  { d:'Thu', requests:158000 }, { d:'Fri', requests:172000 }, { d:'Sat', requests:98000 },
  { d:'Sun', requests:88000 },
];

export const AGENT_USAGE = [
  { name:'Atlas Research', runs:84200 },
  { name:'Insight Analyst', runs:62100 },
  { name:'Support Agent', runs:58400 },
  { name:'CodePilot', runs:47200 },
  { name:'Knowledge Agent', runs:38900 },
  { name:'Marketing Agent', runs:27600 },
];

export const ERRORS = [
  { d:'Mon', errors:240 }, { d:'Tue', errors:198 }, { d:'Wed', errors:220 },
  { d:'Thu', errors:165 }, { d:'Fri', errors:142 }, { d:'Sat', errors:118 }, { d:'Sun', errors:182 },
];

export const AUDIT_LOGS = [
  { actor:'admin@palladium.ai', action:'Updated Enterprise plan pricing', t:'2m ago', icon:'CreditCard' },
  { actor:'sarah@palladium.ai', action:'Disabled integration: Slack', t:'18m ago', icon:'Plug' },
  { actor:'admin@palladium.ai', action:'Invited user (enterprise)', t:'42m ago', icon:'UserPlus' },
  { actor:'system', action:'Failed deployment rolled back', t:'1h ago', icon:'RotateCcw' },
  { actor:'admin@palladium.ai', action:'Rotated API keys', t:'3h ago', icon:'KeyRound' },
  { actor:'sarah@palladium.ai', action:'Approved new MCP server', t:'5h ago', icon:'Server' },
];

export const SYSTEM_SERVICES = [
  { name:'API Gateway', status:'operational', latency:'42ms' },
  { name:'Auth Service', status:'operational', latency:'38ms' },
  { name:'Agent Runtime', status:'operational', latency:'118ms' },
  { name:'Database Cluster', status:'degraded', latency:'312ms' },
  { name:'Vector Store', status:'operational', latency:'88ms' },
  { name:'Billing', status:'operational', latency:'54ms' },
];