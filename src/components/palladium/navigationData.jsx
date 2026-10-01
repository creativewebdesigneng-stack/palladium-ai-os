import {
  Activity, BarChart3, Banknote, Bell, Blocks, BookOpen, Bot, Brain, BrainCircuit,
  BriefcaseBusiness, Building2, CalendarClock, Clapperboard, ClipboardCheck, Code2,
  Contact, Cpu, CreditCard, Database, Dumbbell, Factory, FileText, Files, FlaskConical,
  FolderKanban, Gamepad2, Globe, Hammer, Hand, HardHat, Home, Layers3, LifeBuoy,
  LineChart, Link2, ListChecks, Lock, Megaphone, MessageCircle, Mic2, Orbit, PhoneCall,
  Plug, Popcorn, Radar, Rocket, Scale, ScrollText, Search, Settings, Settings2, ShieldCheck,
  ShoppingBag, Sparkles, Store, Table2, TerminalSquare, Users, WandSparkles, Workflow,
  Wrench, Zap,
} from 'lucide-react'

export const PRIMARY_NAV = [
  { label: 'Home', path: '/dashboard', icon: Home, category: 'Command' },
  { label: 'AI Hub', path: '/ai-hub', icon: Blocks, category: 'Command' },
  { label: 'Mission Control', path: '/mission-control', icon: Radar, category: 'Command' },
  { label: 'Projects', path: '/projects', icon: FolderKanban, category: 'Command' },
  { label: 'AI Workforce', path: '/workforce', icon: Users, category: 'Command' },
  { label: 'Agents', path: '/agents', icon: Bot, category: 'Command' },
  { label: 'Marketplace', path: '/marketplace', icon: Store, category: 'Command' },
  { label: 'Integrations', path: '/integrations', icon: Plug, category: 'Command' },
]

export const SYSTEM_GROUPS = [
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: BrainCircuit,
    description: 'Models, agents, memory and knowledge',
    items: [
      { label: 'Autonomous OS', path: '/autonomous-os', icon: BrainCircuit },
      { label: 'Agent Runtime', path: '/agent-runtime', icon: Cpu },
      { label: 'Agent Workspaces', path: '/agent-workspaces', icon: Layers3 },
      { label: 'Agent Builder', path: '/agent-builder', icon: Hammer },
      { label: 'Model Arena', path: '/model-arena', icon: FlaskConical },
      { label: 'AI Model Hub', path: '/ai-model-hub', icon: Orbit },
      { label: 'Models', path: '/models', icon: Cpu },
      { label: 'AI Workbench', path: '/ai-workbench', icon: Sparkles },
      { label: 'MCP Hub', path: '/mcp-hub', icon: Link2 },
      { label: 'AI Tools', path: '/ai-tools', icon: Wrench },
      { label: 'Skills', path: '/skills', icon: WandSparkles },
      { label: 'Tools Framework', path: '/tools-framework', icon: Blocks },
      { label: 'Memory', path: '/memory', icon: Brain },
      { label: 'Knowledge', path: '/knowledge', icon: BookOpen },
      { label: 'Recall Notes', path: '/recall-notes', icon: FileText },
      { label: 'Research', path: '/research', icon: Search },
      { label: 'News Research', path: '/news-research', icon: Search },
      { label: 'Discovery', path: '/discovery', icon: Radar },
      { label: 'Shared Intelligence', path: '/shared-intelligence', icon: Users },
      { label: 'Decision Studio', path: '/decision-studio', icon: BrainCircuit },
      { label: 'Chat', path: '/chat', icon: MessageCircle },
    ],
  },
  {
    id: 'create',
    label: 'Create',
    icon: WandSparkles,
    description: 'Web, media, cinema, 3D and creator tools',
    items: [
      { label: 'Website Studio', path: '/website-studio', icon: Globe },
      { label: 'Builder', path: '/builder', icon: Hammer },
      { label: 'AI Builder', path: '/ai-builder', icon: Sparkles },
      { label: 'HTML Studio', path: '/html-studio', icon: Code2 },
      { label: 'Media Studio', path: '/media-studio', icon: Clapperboard },
      { label: 'Voice Studio', path: '/voice-studio', icon: Mic2 },
      { label: 'Cinema Studio', path: '/cinema-studio', icon: Popcorn },
      { label: '3D Studio', path: '/three-d-studio', icon: Blocks },
      { label: 'Game Foundry', path: '/game-foundry', icon: Gamepad2 },
      { label: 'Creator Hub', path: '/creator-hub', icon: Rocket },
      { label: 'Creator Marketplace', path: '/creator-marketplace', icon: ShoppingBag },
      { label: 'Trusted Social Video', path: '/trusted-social-video', icon: Clapperboard },
      { label: 'Templates', path: '/templates', icon: Layers3 },
      { label: 'Prompts', path: '/prompts', icon: WandSparkles },
      { label: 'Files', path: '/files', icon: Files },
      { label: 'Documents', path: '/documents', icon: FileText },
      { label: 'Files Analysis', path: '/files-analysis', icon: Search },
    ],
  },
  {
    id: 'operate',
    label: 'Operate',
    icon: Activity,
    description: 'Tasks, workflows, automation and execution',
    items: [
      { label: 'Fast Track', path: '/fast-track', icon: Zap },
      { label: 'Work OS', path: '/work-os', icon: Layers3 },
      { label: 'Smart Tables', path: '/smart-tables', icon: Table2 },
      { label: 'Tasks', path: '/tasks', icon: ListChecks },
      { label: 'Workflows', path: '/workflows', icon: Workflow },
      { label: 'Automation', path: '/automation', icon: Workflow },
      { label: 'Automations', path: '/automations', icon: Workflow },
      { label: 'Computer Control', path: '/computer-control', icon: Cpu },
      { label: 'Sync Center', path: '/sync-center', icon: Database },
      { label: 'Deployments', path: '/deployments', icon: Rocket },
      { label: 'Browser Preview', path: '/browser-preview', icon: Globe },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: BriefcaseBusiness,
    description: 'Company, finance, commerce and industry',
    items: [
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      { label: 'Product Analytics', path: '/product-analytics', icon: LineChart },
      { label: 'Business Intelligence', path: '/business-intelligence', icon: LineChart },
      { label: 'Finance Hub', path: '/finance', icon: Banknote },
      { label: 'Trading Hub', path: '/trading-hub', icon: LineChart },
      { label: 'Quant Studio', path: '/quant-studio', icon: LineChart },
      { label: 'Company Hub', path: '/company-hub', icon: Building2 },
      { label: 'Industry Hub', path: '/industry-hub', icon: Factory },
      { label: 'Construction & Industrial', path: '/construction-industrial-hub', icon: HardHat },
      { label: 'Retail Hub', path: '/retail-hub', icon: Store },
      { label: 'Commerce Studio', path: '/commerce-studio', icon: Store },
      { label: 'Dropshipping Hub', path: '/dropshipping-hub', icon: Rocket },
      { label: 'Shopify Connect', path: '/shopify-connect', icon: ShoppingBag },
      { label: 'CRM', path: '/crm', icon: Contact },
      { label: 'CRM Studio', path: '/crm-studio', icon: Settings2 },
      { label: 'WhatsApp CRM', path: '/whatsapp-crm', icon: MessageCircle },
      { label: 'Marketing', path: '/marketing', icon: Megaphone },
      { label: 'SEO Studio', path: '/seo-studio', icon: Search },
      { label: 'Social Operations', path: '/social-operations', icon: CalendarClock },
      { label: 'Legal Hub', path: '/legal-hub', icon: Scale },
      { label: 'Compliance Sentinel', path: '/compliance-sentinel', icon: ShieldCheck },
      { label: 'Health & Fitness', path: '/health-fitness', icon: Dumbbell },
      { label: 'Fitness Studio', path: '/fitness-studio', icon: Dumbbell },
      { label: 'Human Frontier', path: '/human-frontier', icon: Hand },
    ],
  },
  {
    id: 'developer',
    label: 'Developer & web',
    icon: Code2,
    description: 'Code, web intelligence and platform tooling',
    items: [
      { label: 'Developer Workspace', path: '/developer-workspace', icon: Code2 },
      { label: 'Developer Portal', path: '/developer-portal', icon: BookOpen },
      { label: 'Developer', path: '/developer', icon: Code2 },
      { label: 'Code Explorer', path: '/code-explorer', icon: Code2 },
      { label: 'Version Control', path: '/version-control', icon: Link2 },
      { label: 'Terminal', path: '/terminal', icon: TerminalSquare },
      { label: 'AI Web', path: '/web', icon: Globe },
      { label: 'Web Intelligence', path: '/web-intelligence', icon: Search },
    ],
  },
  {
    id: 'account',
    label: 'Workspace & account',
    icon: Settings,
    description: 'Organisation, communication and account settings',
    items: [
      { label: 'Organisation', path: '/organisation', icon: Building2 },
      { label: 'Team', path: '/team', icon: Users },
      { label: 'Billing', path: '/billing', icon: CreditCard },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Phone & Voice', path: '/phone-communications', icon: PhoneCall },
      { label: 'Support', path: '/support', icon: LifeBuoy },
      { label: 'Help', path: '/help', icon: LifeBuoy },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

export const ADMIN_NAV = [
  { label: 'Admin Dashboard', path: '/admin', icon: ShieldCheck, category: 'Administration' },
  { label: 'Acceptance', path: '/admin/acceptance', icon: ClipboardCheck, category: 'Administration' },
  { label: 'Users', path: '/admin/users', icon: Users, category: 'Administration' },
  { label: 'Organisations', path: '/admin/organisations', icon: Building2, category: 'Administration' },
  { label: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard, category: 'Administration' },
  { label: 'Platform Analytics', path: '/admin/platform-analytics', icon: BarChart3, category: 'Administration' },
  { label: 'Security', path: '/admin/security', icon: Lock, category: 'Administration' },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText, category: 'Administration' },
  { label: 'System', path: '/admin/system-settings', icon: Cpu, category: 'Administration' },
  { label: 'Integrations', path: '/admin/integrations', icon: Plug, category: 'Administration' },
  { label: 'Marketplace Review', path: '/admin/marketplace', icon: Store, category: 'Administration' },
  { label: 'Monitoring', path: '/admin/monitoring', icon: Activity, category: 'Administration' },
]

function withCategories() {
  return SYSTEM_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, category: group.label, groupId: group.id })),
  )
}

export const ALL_NAV_ITEMS = (() => {
  const byPath = new Map()
  for (const item of [...PRIMARY_NAV, ...withCategories(), ...ADMIN_NAV]) {
    if (!byPath.has(item.path)) byPath.set(item.path, item)
  }
  return [...byPath.values()]
})()

export function findNavigationItem(pathname = '') {
  return [...ALL_NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(item.path + '/'))
}

export function groupIsActive(group, pathname = '') {
  return group.items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'))
}
