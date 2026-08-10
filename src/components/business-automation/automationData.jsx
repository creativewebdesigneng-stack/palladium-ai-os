// Mock data for the Business Automation page. Backend ready.

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'LayoutGrid', tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'sales', label: 'Sales', icon: 'TrendingUp', tone: 'from-emerald-600/40 to-teal-600/40' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone', tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'finance', label: 'Finance', icon: 'Wallet', tone: 'from-amber-600/40 to-orange-600/40' },
  { id: 'operations', label: 'Operations', icon: 'Settings2', tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'hr', label: 'HR', icon: 'Users', tone: 'from-rose-600/40 to-pink-600/40' },
  { id: 'support', label: 'Support', icon: 'LifeBuoy', tone: 'from-cyan-600/40 to-sky-600/40' },
  { id: 'it', label: 'IT', icon: 'Server', tone: 'from-lime-600/40 to-green-600/40' },
];

export const STATUS_STYLE = {
  active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  paused: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  draft: 'text-zinc-400 bg-white/5 border-white/10',
  error: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const AUTOMATIONS = [
  { id: 'auto_8f2', name: 'Lead Follow-Up', category: 'sales', trigger: 'New CRM lead created', agent: 'Sales Triage', actions: ['Enrich profile', 'Score lead', 'Send follow-up email'], status: 'active', runs: 1284, successRate: 96 },
  { id: 'auto_8e1', name: 'Invoice Processing', category: 'finance', trigger: 'Invoice email received', agent: 'Finance Bot', actions: ['Extract fields', 'Match to PO', 'Approve or flag'], status: 'active', runs: 642, successRate: 91 },
  { id: 'auto_8c0', name: 'Customer Support', category: 'support', trigger: 'New support ticket', agent: 'Support Triage', actions: ['Classify ticket', 'Draft response', 'Assign agent'], status: 'active', runs: 4180, successRate: 88 },
  { id: 'auto_8a9', name: 'Report Generation', category: 'operations', trigger: 'Every Monday 8am', agent: 'Data Analyst', actions: ['Pull metrics', 'Build charts', 'Email report'], status: 'paused', runs: 48, successRate: 99 },
  { id: 'auto_8a8', name: 'Employee Onboarding', category: 'hr', trigger: 'New hire added', agent: 'HR Assistant', actions: ['Create accounts', 'Schedule orientation', 'Send handbook'], status: 'active', runs: 36, successRate: 100 },
  { id: 'auto_8a7', name: 'Social Media Publishing', category: 'marketing', trigger: 'Scheduled post due', agent: 'Content Writer', actions: ['Render asset', 'Post to channels', 'Track engagement'], status: 'active', runs: 920, successRate: 94 },
  { id: 'auto_8a6', name: 'Meeting Summaries', category: 'operations', trigger: 'Meeting recording ends', agent: 'Notes Agent', actions: ['Transcribe', 'Summarize', 'Share notes'], status: 'active', runs: 312, successRate: 97 },
  { id: 'auto_8a5', name: 'Patch Deployment', category: 'it', trigger: 'PR merged to main', agent: 'DevOps Bot', actions: ['Run tests', 'Build image', 'Deploy & verify'], status: 'draft', runs: 0, successRate: 0 },
  { id: 'auto_8a4', name: 'Churn Outreach', category: 'sales', trigger: 'Usage drops below 20%', agent: 'Sales Triage', actions: ['Flag account', 'Draft outreach', 'Notify CSM'], status: 'error', runs: 18, successRate: 67 },
];

export const TEMPLATES = [
  { name: 'Lead Follow-Up', category: 'sales', desc: 'Enrich, score, and follow up with new leads automatically', icon: 'TrendingUp', actions: 3 },
  { name: 'Invoice Processing', category: 'finance', desc: 'Extract invoice fields and route for approval', icon: 'Wallet', actions: 3 },
  { name: 'Customer Support', category: 'support', desc: 'Classify tickets and draft first responses', icon: 'LifeBuoy', actions: 3 },
  { name: 'Report Generation', category: 'operations', desc: 'Compile metrics into a weekly report', icon: 'FileBarChart', actions: 3 },
  { name: 'Employee Onboarding', category: 'hr', desc: 'Provision accounts and schedule orientation', icon: 'Users', actions: 3 },
  { name: 'Social Media Publishing', category: 'marketing', desc: 'Schedule and publish across channels', icon: 'Megaphone', actions: 3 },
  { name: 'Meeting Summaries', category: 'operations', desc: 'Transcribe meetings and share notes', icon: 'StickyNote', actions: 3 },
  { name: 'Incident Response', category: 'it', desc: 'Detect, triage, and escalate production incidents', icon: 'Server', actions: 4 },
  { name: 'NPS Survey', category: 'marketing', desc: 'Send NPS surveys and analyze feedback', icon: 'Megaphone', actions: 2 },
  { name: 'Expense Approval', category: 'finance', desc: 'Route expense reports for approval', icon: 'Wallet', actions: 3 },
];