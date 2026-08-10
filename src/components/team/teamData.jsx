import {
  Users, UserCheck, Building2, Network, MailOpen, Bot, ShieldCheck, UserCog,
  Code2, Megaphone, ShoppingCart, Wallet, Settings2, Headphones, FlaskConical, Briefcase,
  Crown, Eye, BarChart3, KeyRound, Database, Cpu, Lock, UserPlus, MessageSquare, CheckCircle2,
  FileText, GitPullRequest, ThumbsUp, AtSign, Activity, Clock, Globe, Image, Layers,
} from 'lucide-react';

export const OVERVIEW = [
  { label: 'Total Members', value: '128', delta: '+8', grad: 'from-violet-500 to-indigo-500', icon: Users, trend: [40, 52, 48, 60, 72, 80, 88, 96, 104, 112, 120, 128] },
  { label: 'Active Members', value: '104', delta: '+6', grad: 'from-emerald-500 to-teal-500', icon: UserCheck, trend: [30, 38, 44, 50, 58, 64, 70, 78, 84, 92, 98, 104] },
  { label: 'Teams', value: '14', delta: '+2', grad: 'from-sky-500 to-blue-500', icon: Network, trend: [6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 14] },
  { label: 'Departments', value: '8', delta: '0', grad: 'from-fuchsia-500 to-purple-500', icon: Building2, trend: [6, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8] },
  { label: 'Pending Invitations', value: '7', delta: '+3', grad: 'from-amber-500 to-orange-500', icon: MailOpen, trend: [2, 3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7] },
  { label: 'AI Agents', value: '23', delta: '+5', grad: 'from-violet-500 to-fuchsia-500', icon: Bot, trend: [8, 10, 12, 14, 16, 17, 18, 20, 21, 22, 23, 23] },
  { label: 'Administrators', value: '4', delta: '+1', grad: 'from-rose-500 to-red-500', icon: ShieldCheck, trend: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4] },
  { label: 'Managers', value: '11', delta: '+2', grad: 'from-cyan-500 to-sky-500', icon: UserCog, trend: [5, 6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11] },
];

export const DEPARTMENTS = [
  { id: 'eng', name: 'Engineering', icon: Code2, grad: 'from-violet-500 to-indigo-500', lead: 'Maya Chen', members: 34, teams: 4, agents: 8 },
  { id: 'mkt', name: 'Marketing', icon: Megaphone, grad: 'from-fuchsia-500 to-pink-500', lead: 'Liam Patel', members: 18, teams: 2, agents: 3 },
  { id: 'sales', name: 'Sales', icon: ShoppingCart, grad: 'from-emerald-500 to-teal-500', lead: 'Sofia Rossi', members: 22, teams: 3, agents: 4 },
  { id: 'fin', name: 'Finance', icon: Wallet, grad: 'from-amber-500 to-orange-500', lead: 'Noah Kim', members: 12, teams: 2, agents: 2 },
  { id: 'ops', name: 'Operations', icon: Settings2, grad: 'from-sky-500 to-blue-500', lead: 'Ava Müller', members: 16, teams: 2, agents: 3 },
  { id: 'support', name: 'Customer Support', icon: Headphones, grad: 'from-cyan-500 to-teal-500', lead: 'Ethan Costa', members: 14, teams: 2, agents: 2 },
  { id: 'research', name: 'Research', icon: FlaskConical, grad: 'from-violet-500 to-fuchsia-500', lead: 'Zara Ali', members: 8, teams: 1, agents: 4 },
  { id: 'hr', name: 'Human Resources', icon: Briefcase, grad: 'from-rose-500 to-pink-500', lead: 'Olivia Brooks', members: 6, teams: 1, agents: 1 },
];

export const TEAMS = [
  { id: 't1', name: 'Platform', dept: 'eng', lead: 'Maya Chen', members: 10, agents: ['Atlas Coder', 'Code Reviewer'] },
  { id: 't2', name: 'Frontend', dept: 'eng', lead: 'Leo Tanaka', members: 9, agents: ['UI Builder'] },
  { id: 't3', name: 'Backend', dept: 'eng', lead: 'Sara Vik', members: 8, agents: ['API Architect', 'DB Optimiser'] },
  { id: 't4', name: 'DevOps', dept: 'eng', lead: 'Kai Owens', members: 7, agents: ['Deploy Bot'] },
  { id: 't5', name: 'Growth', dept: 'mkt', lead: 'Liam Patel', members: 10, agents: ['Campaign Agent'] },
  { id: 't6', name: 'Content', dept: 'mkt', lead: 'Mia Rosa', members: 8, agents: ['Copywriter AI'] },
  { id: 't7', name: 'Inside Sales', dept: 'sales', lead: 'Sofia Rossi', members: 8, agents: ['Sales Agent'] },
  { id: 't8', name: 'Field Sales', dept: 'sales', lead: 'Diego Soto', members: 8, agents: ['Lead Scout'] },
  { id: 't9', name: 'Accounting', dept: 'fin', lead: 'Noah Kim', members: 6, agents: ['Finance Agent'] },
  { id: 't10', name: 'Treasury', dept: 'fin', lead: 'Yuki Mori', members: 6, agents: ['Forecast AI'] },
  { id: 't11', name: 'Logistics', dept: 'ops', lead: 'Ava Müller', members: 8, agents: ['Ops Monitor'] },
  { id: 't12', name: 'IT Ops', dept: 'ops', lead: 'Ravi Nair', members: 8, agents: ['Infra Bot'] },
  { id: 't13', name: 'Tier 1 Support', dept: 'support', lead: 'Ethan Costa', members: 8, agents: ['Support Agent'] },
  { id: 't14', name: 'AI Research', dept: 'research', lead: 'Zara Ali', members: 8, agents: ['Research Agent', 'Data Miner'] },
];

export const ROLES = [
  { id: 'owner', name: 'Owner', icon: Crown, grad: 'from-amber-500 to-yellow-500', members: 1, desc: 'Full organisation control' },
  { id: 'admin', name: 'Administrator', icon: ShieldCheck, grad: 'from-rose-500 to-red-500', members: 4, desc: 'Manage all settings and members' },
  { id: 'manager', name: 'Manager', icon: UserCog, grad: 'from-cyan-500 to-sky-500', members: 11, desc: 'Manage teams and assignments' },
  { id: 'developer', name: 'Developer', icon: Code2, grad: 'from-violet-500 to-indigo-500', members: 34, desc: 'Build and deploy integrations' },
  { id: 'employee', name: 'Employee', icon: Users, grad: 'from-sky-500 to-blue-500', members: 58, desc: 'Standard workspace access' },
  { id: 'analyst', name: 'Analyst', icon: BarChart3, grad: 'from-emerald-500 to-teal-500', members: 12, desc: 'View analytics and reports' },
  { id: 'viewer', name: 'Viewer', icon: Eye, grad: 'from-zinc-500 to-slate-600', members: 8, desc: 'Read-only access to dashboards' },
  { id: 'custom', name: 'Custom Role', icon: Settings2, grad: 'from-fuchsia-500 to-purple-500', members: 0, desc: 'Tailored permission set' },
];

export const PERMISSIONS = [
  { id: 'view_projects', label: 'View Projects', icon: Eye, group: 'Projects' },
  { id: 'create_projects', label: 'Create Projects', icon: Layers, group: 'Projects' },
  { id: 'edit_projects', label: 'Edit Projects', icon: Settings2, group: 'Projects' },
  { id: 'delete_projects', label: 'Delete Projects', icon: Lock, group: 'Projects' },
  { id: 'manage_agents', label: 'Manage Agents', icon: Bot, group: 'Agents' },
  { id: 'run_agents', label: 'Run Agents', icon: Cpu, group: 'Agents' },
  { id: 'create_workflows', label: 'Create Workflows', icon: GitPullRequest, group: 'Automation' },
  { id: 'manage_integrations', label: 'Manage Integrations', icon: Database, group: 'Automation' },
  { id: 'view_billing', label: 'View Billing', icon: FileText, group: 'Billing' },
  { id: 'manage_billing', label: 'Manage Billing', icon: Wallet, group: 'Billing' },
  { id: 'manage_members', label: 'Manage Members', icon: UserPlus, group: 'Administration' },
  { id: 'view_analytics', label: 'View Analytics', icon: BarChart3, group: 'Administration' },
  { id: 'manage_api_keys', label: 'Manage API Keys', icon: KeyRound, group: 'Administration' },
  { id: 'access_devtools', label: 'Access Developer Tools', icon: Code2, group: 'Administration' },
  { id: 'manage_knowledge', label: 'Manage Knowledge', icon: FileText, group: 'Knowledge' },
  { id: 'export_data', label: 'Export Data', icon: Globe, group: 'Knowledge' },
];

// role id -> set of permission ids
export const ROLE_PERMISSIONS = {
  owner: PERMISSIONS.map(p => p.id),
  admin: ['view_projects','create_projects','edit_projects','manage_agents','run_agents','create_workflows','manage_integrations','view_billing','manage_billing','manage_members','view_analytics','manage_api_keys','access_devtools','manage_knowledge','export_data'],
  manager: ['view_projects','create_projects','edit_projects','manage_agents','run_agents','create_workflows','view_billing','view_analytics','manage_knowledge'],
  developer: ['view_projects','create_projects','edit_projects','run_agents','create_workflows','manage_integrations','access_devtools','manage_knowledge'],
  employee: ['view_projects','run_agents','view_analytics'],
  analyst: ['view_projects','view_billing','view_analytics','export_data'],
  viewer: ['view_projects','view_analytics'],
  custom: ['view_projects','run_agents','create_workflows'],
};

export const STATUS = {
  active: { label: 'Active', badge: 'bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  away: { label: 'Away', badge: 'bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  suspended: { label: 'Suspended', badge: 'bg-red-500/10 text-red-300', dot: 'bg-red-400' },
  invited: { label: 'Invited', badge: 'bg-sky-500/10 text-sky-300', dot: 'bg-sky-400' },
  offline: { label: 'Offline', badge: 'bg-zinc-500/10 text-zinc-400', dot: 'bg-zinc-500' },
};

const grads = ['from-violet-500 to-indigo-500','from-sky-500 to-blue-500','from-emerald-500 to-teal-500','from-fuchsia-500 to-pink-500','from-amber-500 to-orange-500','from-cyan-500 to-sky-500','from-rose-500 to-red-500','from-violet-500 to-fuchsia-500'];
const initials = (n) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

export const MEMBERS = [
  { id: 'u1', name: 'Maya Chen', email: 'maya.chen@palladiumai.com', role: 'Owner', roleId: 'owner', dept: 'Engineering', team: 'Platform', status: 'active', lastActive: '2 min ago', joined: 'Jan 2023', agents: ['Atlas Coder','Code Reviewer'], grad: grads[0] },
  { id: 'u2', name: 'Liam Patel', email: 'liam.patel@palladiumai.com', role: 'Administrator', roleId: 'admin', dept: 'Marketing', team: 'Growth', status: 'active', lastActive: '5 min ago', joined: 'Mar 2023', agents: ['Campaign Agent'], grad: grads[3] },
  { id: 'u3', name: 'Sofia Rossi', email: 'sofia.rossi@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Sales', team: 'Inside Sales', status: 'active', lastActive: '12 min ago', joined: 'Apr 2023', agents: ['Sales Agent'], grad: grads[2] },
  { id: 'u4', name: 'Noah Kim', email: 'noah.kim@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Finance', team: 'Accounting', status: 'away', lastActive: '1 hr ago', joined: 'Feb 2023', agents: ['Finance Agent'], grad: grads[4] },
  { id: 'u5', name: 'Leo Tanaka', email: 'leo.tanaka@palladiumai.com', role: 'Developer', roleId: 'developer', dept: 'Engineering', team: 'Frontend', status: 'active', lastActive: 'just now', joined: 'Jun 2023', agents: ['UI Builder'], grad: grads[1] },
  { id: 'u6', name: 'Sara Vik', email: 'sara.vik@palladiumai.com', role: 'Developer', roleId: 'developer', dept: 'Engineering', team: 'Backend', status: 'active', lastActive: '8 min ago', joined: 'Jul 2023', agents: ['API Architect'], grad: grads[6] },
  { id: 'u7', name: 'Zara Ali', email: 'zara.ali@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Research', team: 'AI Research', status: 'active', lastActive: '3 min ago', joined: 'May 2023', agents: ['Research Agent','Data Miner'], grad: grads[7] },
  { id: 'u8', name: 'Ethan Costa', email: 'ethan.costa@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Customer Support', team: 'Tier 1 Support', status: 'away', lastActive: '40 min ago', joined: 'Aug 2023', agents: ['Support Agent'], grad: grads[5] },
  { id: 'u9', name: 'Ava Müller', email: 'ava.muller@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Operations', team: 'Logistics', status: 'active', lastActive: '15 min ago', joined: 'Sep 2023', agents: ['Ops Monitor'], grad: grads[1] },
  { id: 'u10', name: 'Diego Soto', email: 'diego.soto@palladiumai.com', role: 'Employee', roleId: 'employee', dept: 'Sales', team: 'Field Sales', status: 'active', lastActive: '20 min ago', joined: 'Oct 2023', agents: ['Lead Scout'], grad: grads[2] },
  { id: 'u11', name: 'Mia Rosa', email: 'mia.rosa@palladiumai.com', role: 'Employee', roleId: 'employee', dept: 'Marketing', team: 'Content', status: 'active', lastActive: '1 hr ago', joined: 'Nov 2023', agents: ['Copywriter AI'], grad: grads[3] },
  { id: 'u12', name: 'Kai Owens', email: 'kai.owens@palladiumai.com', role: 'Developer', roleId: 'developer', dept: 'Engineering', team: 'DevOps', status: 'active', lastActive: '4 min ago', joined: 'Dec 2023', agents: ['Deploy Bot'], grad: grads[0] },
  { id: 'u13', name: 'Olivia Brooks', email: 'olivia.brooks@palladiumai.com', role: 'Manager', roleId: 'manager', dept: 'Human Resources', team: 'People Ops', status: 'active', lastActive: '30 min ago', joined: 'Jan 2024', agents: [], grad: grads[6] },
  { id: 'u14', name: 'Ravi Nair', email: 'ravi.nair@palladiumai.com', role: 'Developer', roleId: 'developer', dept: 'Operations', team: 'IT Ops', status: 'suspended', lastActive: '3 days ago', joined: 'Feb 2024', agents: ['Infra Bot'], grad: grads[7] },
  { id: 'u15', name: 'Yuki Mori', email: 'yuki.mori@palladiumai.com', role: 'Analyst', roleId: 'analyst', dept: 'Finance', team: 'Treasury', status: 'active', lastActive: '2 hr ago', joined: 'Mar 2024', agents: ['Forecast AI'], grad: grads[4] },
  { id: 'u16', name: 'Iris Park', email: 'iris.park@palladiumai.com', role: 'Viewer', roleId: 'viewer', dept: 'Marketing', team: 'Content', status: 'offline', lastActive: 'yesterday', joined: 'Apr 2024', agents: [], grad: grads[5] },
];

MEMBERS.forEach(m => { m.initials = initials(m.name); });

export const INVITATIONS = [
  { id: 'i1', email: 'jordan.lee@palladiumai.com', role: 'Developer', dept: 'Engineering', invitedBy: 'Maya Chen', date: 'Aug 5, 2026', status: 'invited' },
  { id: 'i2', email: 'amelia.wong@palladiumai.com', role: 'Manager', dept: 'Operations', invitedBy: 'Liam Patel', date: 'Aug 4, 2026', status: 'invited' },
  { id: 'i3', email: 'tomas.rivera@palladiumai.com', role: 'Employee', dept: 'Sales', invitedBy: 'Sofia Rossi', date: 'Aug 3, 2026', status: 'invited' },
  { id: 'i4', email: 'priya.shah@palladiumai.com', role: 'Analyst', dept: 'Research', invitedBy: 'Zara Ali', date: 'Aug 2, 2026', status: 'invited' },
  { id: 'i5', email: 'felix.huber@palladiumai.com', role: 'Developer', dept: 'Engineering', invitedBy: 'Maya Chen', date: 'Aug 1, 2026', status: 'invited' },
  { id: 'i6', email: 'nora.johansen@palladiumai.com', role: 'Employee', dept: 'Customer Support', invitedBy: 'Ethan Costa', date: 'Jul 30, 2026', status: 'invited' },
  { id: 'i7', email: 'omar.farouk@palladiumai.com', role: 'Viewer', dept: 'Finance', invitedBy: 'Noah Kim', date: 'Jul 28, 2026', status: 'invited' },
];

export const AGENT_ASSIGNMENTS = [
  { id: 'a1', name: 'Atlas Coder', team: 'Platform', dept: 'Engineering', icon: Code2, grad: 'from-violet-500 to-indigo-500', status: 'active', tasks: 42 },
  { id: 'a2', name: 'Code Reviewer', team: 'Platform', dept: 'Engineering', icon: CheckCircle2, grad: 'from-violet-500 to-indigo-500', status: 'active', tasks: 28 },
  { id: 'a3', name: 'UI Builder', team: 'Frontend', dept: 'Engineering', icon: Layers, grad: 'from-violet-500 to-indigo-500', status: 'active', tasks: 19 },
  { id: 'a4', name: 'API Architect', team: 'Backend', dept: 'Engineering', icon: Database, grad: 'from-violet-500 to-indigo-500', status: 'active', tasks: 31 },
  { id: 'a5', name: 'Deploy Bot', team: 'DevOps', dept: 'Engineering', icon: GitPullRequest, grad: 'from-violet-500 to-indigo-500', status: 'away', tasks: 12 },
  { id: 'a6', name: 'Campaign Agent', team: 'Growth', dept: 'Marketing', icon: Megaphone, grad: 'from-fuchsia-500 to-pink-500', status: 'active', tasks: 24 },
  { id: 'a7', name: 'Copywriter AI', team: 'Content', dept: 'Marketing', icon: FileText, grad: 'from-fuchsia-500 to-pink-500', status: 'active', tasks: 37 },
  { id: 'a8', name: 'Sales Agent', team: 'Inside Sales', dept: 'Sales', icon: ShoppingCart, grad: 'from-emerald-500 to-teal-500', status: 'active', tasks: 56 },
  { id: 'a9', name: 'Lead Scout', team: 'Field Sales', dept: 'Sales', icon: UserPlus, grad: 'from-emerald-500 to-teal-500', status: 'active', tasks: 33 },
  { id: 'a10', name: 'Finance Agent', team: 'Accounting', dept: 'Finance', icon: Wallet, grad: 'from-amber-500 to-orange-500', status: 'active', tasks: 18 },
  { id: 'a11', name: 'Forecast AI', team: 'Treasury', dept: 'Finance', icon: BarChart3, grad: 'from-amber-500 to-orange-500', status: 'away', tasks: 9 },
  { id: 'a12', name: 'Ops Monitor', team: 'Logistics', dept: 'Operations', icon: Activity, grad: 'from-sky-500 to-blue-500', status: 'active', tasks: 41 },
  { id: 'a13', name: 'Infra Bot', team: 'IT Ops', dept: 'Operations', icon: Settings2, grad: 'from-sky-500 to-blue-500', status: 'active', tasks: 15 },
  { id: 'a14', name: 'Support Agent', team: 'Tier 1 Support', dept: 'Customer Support', icon: Headphones, grad: 'from-cyan-500 to-teal-500', status: 'active', tasks: 64 },
  { id: 'a15', name: 'Research Agent', team: 'AI Research', dept: 'Research', icon: FlaskConical, grad: 'from-violet-500 to-fuchsia-500', status: 'active', tasks: 22 },
  { id: 'a16', name: 'Data Miner', team: 'AI Research', dept: 'Research', icon: Database, grad: 'from-violet-500 to-fuchsia-500', status: 'active', tasks: 17 },
];

export const COLLABORATION = {
  online: MEMBERS.filter(m => m.status === 'active').slice(0, 6).map(m => ({ initials: m.initials, name: m.name, grad: m.grad, dept: m.dept })),
  activity: [
    { who: 'Maya Chen', action: 'merged pull request', target: 'platform-core#482', time: '3', icon: GitPullRequest, grad: 'from-violet-500 to-indigo-500' },
    { who: 'Sofia Rossi', action: 'closed task', target: 'Q3 outreach plan', time: '12', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-500' },
    { who: 'Liam Patel', action: 'commented on', target: 'Brand refresh brief', time: '24', icon: MessageSquare, grad: 'from-fuchsia-500 to-pink-500' },
    { who: 'Zara Ali', action: 'published', target: 'Market intel report', time: '40', icon: FileText, grad: 'from-violet-500 to-fuchsia-500' },
    { who: 'Kai Owens', action: 'deployed', target: 'v2.4.2 to prod', time: '58', icon: GitPullRequest, grad: 'from-sky-500 to-blue-500' },
  ],
  mentions: [
    { who: 'Ethan Costa', text: 'mentioned you in Support Agent tuning', time: '8', icon: AtSign, grad: 'from-cyan-500 to-sky-500' },
    { who: 'Noah Kim', text: 'tagged you on Q3 forecast review', time: '35', icon: AtSign, grad: 'from-amber-500 to-orange-500' },
    { who: 'Leo Tanaka', text: 'mentioned you in UI Builder spec', time: '52', icon: AtSign, grad: 'from-sky-500 to-blue-500' },
  ],
  comments: [
    { who: 'Sara Vik', text: 'API rate limits bumped to 10k/min', time: '14', icon: MessageSquare, grad: 'from-rose-500 to-red-500' },
    { who: 'Mia Rosa', text: 'Draft copy v3 is ready for review', time: '31', icon: MessageSquare, grad: 'from-fuchsia-500 to-pink-500' },
  ],
  assignments: [
    { who: 'Ava Müller', text: 'assigned Logistics dashboard to you', time: '6', icon: UserPlus, grad: 'from-sky-500 to-blue-500' },
    { who: 'Diego Soto', text: 'assigned Lead Scout pipeline', time: '22', icon: UserPlus, grad: 'from-emerald-500 to-teal-500' },
  ],
  approvals: [
    { who: 'Olivia Brooks', text: 'requested access to HR dataset', time: '4', icon: ThumbsUp, grad: 'from-rose-500 to-pink-500' },
    { who: 'Yuki Mori', text: 'needs approval on Treasury export', time: '47', icon: ThumbsUp, grad: 'from-amber-500 to-orange-500' },
  ],
};

export const ORG_SETTINGS = {
  name: 'PalladiumAI Holdings',
  logoGrad: 'from-violet-600 to-indigo-600',
  industry: 'Artificial Intelligence',
  size: '51–200 employees',
  timezone: 'Europe/London (UTC+0)',
  country: 'United Kingdom',
  defaultModel: 'Claude Sonnet 4.6',
  defaultPermissions: 'Manager preset',
  security: '2FA enforced · SSO via Google Workspace',
};

export const AUDIT = [
  { who: 'Maya Chen', action: 'invited', target: 'felix.huber@palladiumai.com', icon: UserPlus, grad: 'from-violet-500 to-indigo-500', time: '2 hours ago' },
  { who: 'Liam Patel', action: 'changed role to', target: 'Manager', icon: UserCog, grad: 'from-cyan-500 to-sky-500', time: '5 hours ago' },
  { who: 'Sofia Rossi', action: 'assigned agent', target: 'Lead Scout → Field Sales', icon: Bot, grad: 'from-emerald-500 to-teal-500', time: '8 hours ago' },
  { who: 'Zara Ali', action: 'updated permission', target: 'Analyst · Export Data', icon: KeyRound, grad: 'from-amber-500 to-orange-500', time: '1 day ago' },
  { who: 'Maya Chen', action: 'created team', target: 'Platform', icon: Network, grad: 'from-sky-500 to-blue-500', time: '2 days ago' },
  { who: 'Olivia Brooks', action: 'removed member', target: 'iris.park@palladiumai.com', icon: UserPlus, grad: 'from-rose-500 to-red-500', time: '3 days ago' },
];

export const RIGHT_SIDEBAR = {
  security: [
    { icon: ShieldCheck, grad: 'from-rose-500 to-red-500', text: '2FA enforcement active across all administrators.' },
    { icon: Lock, grad: 'from-amber-500 to-orange-500', text: '3 members have stale sessions older than 30 days.' },
    { icon: KeyRound, grad: 'from-sky-500 to-blue-500', text: '4 API keys expire within the next 7 days.' },
  ],
  usage: { total: '128', delta: '+8 this month', trend: [88, 92, 98, 104, 110, 116, 120, 124, 128] },
  recent: [
    { who: 'Maya Chen', target: 'invited a new developer', icon: UserPlus, grad: 'from-violet-500 to-indigo-500', time: '2h' },
    { who: 'Sofia Rossi', target: 'assigned Lead Scout agent', icon: Bot, grad: 'from-emerald-500 to-teal-500', time: '8h' },
    { who: 'Liam Patel', target: 'changed a role to Manager', icon: UserCog, grad: 'from-cyan-500 to-sky-500', time: '5h' },
    { who: 'Zara Ali', target: 'updated Analyst permissions', icon: KeyRound, grad: 'from-amber-500 to-orange-500', time: '1d' },
  ],
  recommendations: [
    { icon: UserPlus, grad: 'from-violet-500 to-indigo-500', text: 'Invite a second administrator for coverage.' },
    { icon: ShieldCheck, grad: 'from-rose-500 to-red-500', text: 'Enforce SSO for the Finance department.' },
    { icon: Bot, grad: 'from-emerald-500 to-teal-500', text: 'Assign a Support Agent to Tier 2.' },
  ],
  quickActions: [
    { icon: UserPlus, grad: 'from-violet-500 to-indigo-500', label: 'Invite' },
    { icon: Network, grad: 'from-sky-500 to-blue-500', label: 'New Team' },
    { icon: Building2, grad: 'from-fuchsia-500 to-purple-500', label: 'Department' },
    { icon: KeyRound, grad: 'from-amber-500 to-orange-500', label: 'API Keys' },
  ],
};

export const TABS = ['Overview', 'Members', 'Team Structure', 'Roles & Permissions', 'Invitations', 'AI Agents', 'Collaboration', 'Organisation', 'Audit'];