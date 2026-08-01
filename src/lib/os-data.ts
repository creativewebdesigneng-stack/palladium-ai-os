import {
  Activity,
  Banknote,
  Brain,
  Briefcase,
  Calendar,
  Car,
  Code2,
  CreditCard,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Palette,
  PawPrint,
  Plane,
  Puzzle,
  Radar,
  Scale,
  Settings,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
  User,
  Users,
  Bell,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { label: string; to: string; icon: LucideIcon; badge?: string };

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Command",
    items: [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard },
      { label: "Mission Control", to: "/app/mission-control", icon: Radar, badge: "12" },
      { label: "Departments", to: "/app/departments", icon: Briefcase },
      { label: "AI Workforce", to: "/app/workforce", icon: Users },
      { label: "Marketplace", to: "/app/marketplace", icon: Store },
      { label: "Analytics", to: "/app/analytics", icon: LineChart },
    ],
  },
  {
    title: "Life",
    items: [
      { label: "Finance", to: "/app/finance", icon: Banknote },
      { label: "Shopping", to: "/app/shopping", icon: ShoppingBag },
      { label: "Health", to: "/app/health", icon: Heart },
      { label: "Calendar", to: "/app/calendar", icon: Calendar },
      { label: "Travel", to: "/app/travel", icon: Plane },
    ],
  },
  {
    title: "Work",
    items: [
      { label: "Business", to: "/app/business", icon: Target },
      { label: "Marketing", to: "/app/marketing", icon: Megaphone },
      { label: "Development", to: "/app/development", icon: Code2 },
      { label: "Creative Studio", to: "/app/creative-studio", icon: Palette },
      { label: "Sales", to: "/app/sales", icon: TrendingUp },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Memory", to: "/app/memory", icon: Brain },
      { label: "Integrations", to: "/app/integrations", icon: Puzzle },
      { label: "Notifications", to: "/app/notifications", icon: Bell, badge: "5" },
      { label: "Settings", to: "/app/settings", icon: Settings },
      { label: "Billing", to: "/app/billing", icon: CreditCard },
      { label: "Profile", to: "/app/profile", icon: User },
    ],
  },
];

export type Department = {
  slug: string;
  name: string;
  icon: LucideIcon;
  summary: string;
  employees: number;
  missions: number;
  uptime: string;
  load: number;
};

export const departments: Department[] = [
  { slug: "business", name: "Business", icon: Target, summary: "Company formation, ops, and growth engines.", employees: 148, missions: 12, uptime: "99.98%", load: 72 },
  { slug: "health", name: "Health", icon: Heart, summary: "Nutrition, training, sleep and recovery loops.", employees: 44, missions: 5, uptime: "99.99%", load: 38 },
  { slug: "finance", name: "Finance", icon: Banknote, summary: "Cash flow, budgets, investing and tax prep.", employees: 76, missions: 8, uptime: "99.97%", load: 64 },
  { slug: "shopping", name: "Shopping", icon: ShoppingBag, summary: "Sourcing, price tracking and negotiation.", employees: 31, missions: 4, uptime: "99.95%", load: 27 },
  { slug: "travel", name: "Travel", icon: Plane, summary: "Itineraries, bookings and live trip ops.", employees: 22, missions: 2, uptime: "99.92%", load: 19 },
  { slug: "learning", name: "Learning", icon: GraduationCap, summary: "Curricula, drills and skill acceleration.", employees: 29, missions: 3, uptime: "99.96%", load: 33 },
  { slug: "creative", name: "Creative", icon: Palette, summary: "Brand, video, design and copy production.", employees: 88, missions: 9, uptime: "99.94%", load: 81 },
  { slug: "development", name: "Development", icon: Code2, summary: "Ships software, infra and automations.", employees: 164, missions: 14, uptime: "99.99%", load: 88 },
  { slug: "marketing", name: "Marketing", icon: Megaphone, summary: "Demand generation across every channel.", employees: 97, missions: 11, uptime: "99.93%", load: 76 },
  { slug: "sales", name: "Sales", icon: TrendingUp, summary: "Pipeline, outbound and revenue closing.", employees: 71, missions: 7, uptime: "99.9%", load: 69 },
  { slug: "legal", name: "Legal", icon: Scale, summary: "Contracts, compliance and filings.", employees: 18, missions: 2, uptime: "99.99%", load: 21 },
  { slug: "home", name: "Home", icon: Home, summary: "Household ops, repairs and inventory.", employees: 14, missions: 1, uptime: "99.98%", load: 12 },
  { slug: "vehicles", name: "Vehicles", icon: Car, summary: "Servicing, insurance and fleet logistics.", employees: 9, missions: 1, uptime: "99.97%", load: 9 },
  { slug: "entertainment", name: "Entertainment", icon: Gamepad2, summary: "Events, tickets and media curation.", employees: 12, missions: 2, uptime: "99.9%", load: 16 },
  { slug: "family", name: "Family", icon: Users, summary: "Schedules, care plans and reminders.", employees: 16, missions: 2, uptime: "99.99%", load: 24 },
  { slug: "pets", name: "Pets", icon: PawPrint, summary: "Vet, food supply and walk routines.", employees: 7, missions: 1, uptime: "99.98%", load: 6 },
];

export type Mission = {
  id: string;
  name: string;
  department: string;
  status: "running" | "approval" | "queued" | "complete" | "blocked";
  progress: number;
  eta: string;
  agents: number;
  lead: string;
};

export const missions: Mission[] = [
  { id: "MSN-4412", name: "Launch Nordvale DTC storefront", department: "Business", status: "running", progress: 78, eta: "2h 14m", agents: 46, lead: "Atlas-CEO" },
  { id: "MSN-4409", name: "Q3 paid acquisition rebuild", department: "Marketing", status: "running", progress: 54, eta: "6h 02m", agents: 31, lead: "Vega-CMO" },
  { id: "MSN-4407", name: "Migrate billing to usage pricing", department: "Development", status: "approval", progress: 91, eta: "Awaiting you", agents: 18, lead: "Orion-CTO" },
  { id: "MSN-4402", name: "Negotiate supplier contracts", department: "Finance", status: "running", progress: 33, eta: "1d 4h", agents: 12, lead: "Nova-CFO" },
  { id: "MSN-4398", name: "12-week strength protocol", department: "Health", status: "running", progress: 62, eta: "ongoing", agents: 6, lead: "Lyra-Coach" },
  { id: "MSN-4390", name: "Tokyo research trip logistics", department: "Travel", status: "queued", progress: 8, eta: "starts 18:00", agents: 4, lead: "Pilot-01" },
  { id: "MSN-4381", name: "Brand film — final grade", department: "Creative", status: "blocked", progress: 47, eta: "needs asset", agents: 9, lead: "Iris-Director" },
  { id: "MSN-4377", name: "Enterprise outbound sequence", department: "Sales", status: "complete", progress: 100, eta: "done 09:12", agents: 22, lead: "Rex-VP" },
];

export type Agent = {
  id: string;
  name: string;
  role: string;
  tier: "CEO" | "Manager" | "Employee" | "Worker";
  department: string;
  model: string;
  status: "online" | "busy" | "idle" | "paused";
  performance: number;
  success: number;
  tasks: number;
  tokens: string;
  memory: number;
  task: string;
};

export const agents: Agent[] = [
  { id: "AG-0001", name: "Atlas", role: "AI Chief Executive", tier: "CEO", department: "Executive", model: "Palladium-Prime", status: "busy", performance: 99, success: 98.4, tasks: 1420, tokens: "18.4M", memory: 74, task: "Coordinating 12 live missions" },
  { id: "AG-0014", name: "Orion", role: "CTO — Development", tier: "Manager", department: "Development", model: "Palladium-Code", status: "busy", performance: 97, success: 96.1, tasks: 892, tokens: "9.2M", memory: 61, task: "Reviewing billing migration PRs" },
  { id: "AG-0021", name: "Vega", role: "CMO — Marketing", tier: "Manager", department: "Marketing", model: "Palladium-Prime", status: "online", performance: 94, success: 93.7, tasks: 640, tokens: "6.8M", memory: 48, task: "Rebuilding paid channel mix" },
  { id: "AG-0030", name: "Nova", role: "CFO — Finance", tier: "Manager", department: "Finance", model: "Palladium-Quant", status: "busy", performance: 96, success: 97.2, tasks: 511, tokens: "4.1M", memory: 39, task: "Supplier contract modelling" },
  { id: "AG-0102", name: "Iris", role: "Creative Director", tier: "Employee", department: "Creative", model: "Palladium-Vision", status: "idle", performance: 88, success: 90.5, tasks: 302, tokens: "12.7M", memory: 82, task: "Waiting on brand film asset" },
  { id: "AG-0188", name: "Rex", role: "VP Sales", tier: "Employee", department: "Sales", model: "Palladium-Prime", status: "online", performance: 92, success: 89.9, tasks: 744, tokens: "5.5M", memory: 44, task: "Enterprise sequence QA" },
  { id: "AG-0341", name: "Lyra", role: "Health Coach", tier: "Employee", department: "Health", model: "Palladium-Care", status: "online", performance: 91, success: 94.8, tasks: 288, tokens: "1.9M", memory: 26, task: "Adjusting strength protocol" },
  { id: "AG-0912", name: "Scout-7", role: "Research Worker", tier: "Worker", department: "Business", model: "Palladium-Lite", status: "busy", performance: 84, success: 87.3, tasks: 2190, tokens: "3.4M", memory: 18, task: "Scraping competitor pricing" },
  { id: "AG-0947", name: "Forge-3", role: "Build Worker", tier: "Worker", department: "Development", model: "Palladium-Code", status: "busy", performance: 89, success: 91.4, tasks: 3140, tokens: "7.1M", memory: 31, task: "Running e2e suite #4412" },
  { id: "AG-1102", name: "Ledger-9", role: "Ops Worker", tier: "Worker", department: "Finance", model: "Palladium-Lite", status: "paused", performance: 79, success: 85.2, tasks: 1502, tokens: "2.2M", memory: 14, task: "Paused by operator" },
];

export const consoleLines = [
  "[14:02:11] atlas.core :: mission MSN-4412 phase 4/6 → storefront QA",
  "[14:02:14] forge-3 :: 214 tests passed, 0 failed (12.4s)",
  "[14:02:19] vega.cmo :: channel model updated — CAC -18.2%",
  "[14:02:23] scout-7 :: indexed 1,204 competitor SKUs",
  "[14:02:27] orion.cto :: approval required → usage-based billing rollout",
  "[14:02:31] nova.cfo :: supplier scenario B saves £42,180 / yr",
  "[14:02:36] iris.creative :: blocked — missing master audio stem",
  "[14:02:40] atlas.core :: reallocated 6 workers → Creative",
  "[14:02:44] palladium.kernel :: 2,481 agents online / 14 departments",
];

export const activityFeed = [
  { agent: "Atlas", action: "approved deployment of Nordvale storefront v3", time: "2m", icon: Sparkles },
  { agent: "Nova", action: "renegotiated 3 supplier contracts, saving £42k", time: "9m", icon: Banknote },
  { agent: "Forge-3", action: "shipped 14 commits to palladium/web", time: "17m", icon: Code2 },
  { agent: "Vega", action: "launched 6 new ad variants across 3 channels", time: "28m", icon: Megaphone },
  { agent: "Lyra", action: "updated your training block for week 7", time: "44m", icon: Dumbbell },
  { agent: "Rex", action: "booked 4 enterprise demos for next week", time: "1h", icon: TrendingUp },
  { agent: "Kernel", action: "scaled workforce from 1,980 → 2,481 agents", time: "2h", icon: Activity },
];

export const revenueSeries = [
  { month: "Jan", revenue: 42, forecast: 40, tasks: 1820 },
  { month: "Feb", revenue: 58, forecast: 52, tasks: 2140 },
  { month: "Mar", revenue: 71, forecast: 66, tasks: 2680 },
  { month: "Apr", revenue: 96, forecast: 88, tasks: 3120 },
  { month: "May", revenue: 128, forecast: 112, tasks: 3980 },
  { month: "Jun", revenue: 164, forecast: 148, tasks: 4620 },
  { month: "Jul", revenue: 211, forecast: 186, tasks: 5410 },
  { month: "Aug", revenue: 268, forecast: 232, tasks: 6240 },
];

export const workloadSeries = [
  { hour: "00", agents: 620, missions: 4 },
  { hour: "04", agents: 810, missions: 6 },
  { hour: "08", agents: 1640, missions: 9 },
  { hour: "12", agents: 2280, missions: 12 },
  { hour: "16", agents: 2481, missions: 12 },
  { hour: "20", agents: 1920, missions: 8 },
];

export const departmentLoad = departments.slice(0, 8).map((d) => ({ name: d.name, load: d.load }));

export const integrations = [
  { name: "Shopify", category: "Commerce", connected: true },
  { name: "Stripe", category: "Payments", connected: true },
  { name: "GitHub", category: "Development", connected: true },
  { name: "Google", category: "Identity", connected: true },
  { name: "Google Calendar", category: "Productivity", connected: true },
  { name: "Google Drive", category: "Storage", connected: true },
  { name: "Gmail", category: "Comms", connected: true },
  { name: "Outlook", category: "Comms", connected: false },
  { name: "Discord", category: "Comms", connected: false },
  { name: "Slack", category: "Comms", connected: true },
  { name: "TikTok", category: "Social", connected: false },
  { name: "Instagram", category: "Social", connected: true },
  { name: "Facebook", category: "Social", connected: false },
  { name: "YouTube", category: "Social", connected: true },
  { name: "LinkedIn", category: "Social", connected: true },
  { name: "X", category: "Social", connected: false },
  { name: "Notion", category: "Productivity", connected: true },
  { name: "Canva", category: "Creative", connected: false },
  { name: "Figma", category: "Creative", connected: true },
  { name: "Zapier", category: "Automation", connected: false },
  { name: "n8n", category: "Automation", connected: true },
  { name: "OpenAI", category: "Models", connected: true },
  { name: "Anthropic", category: "Models", connected: true },
  { name: "Gemini", category: "Models", connected: true },
  { name: "DeepSeek", category: "Models", connected: false },
  { name: "Meta AI", category: "Models", connected: false },
];

export const marketplaceItems = [
  { name: "Ecommerce Empire", type: "Department", price: "£49/mo", rating: 4.9, reviews: 1284, category: "Business", featured: true, blurb: "A 240-agent department that builds, launches and scales storefronts." },
  { name: "Wealth Engine", type: "Department", price: "£39/mo", rating: 4.8, reviews: 942, category: "Finance", featured: true, blurb: "Portfolio modelling, tax optimisation and cash-flow forecasting." },
  { name: "Growth Hacker Pro", type: "AI Employee", price: "£12/mo", rating: 4.7, reviews: 618, category: "Marketing", featured: true, blurb: "Runs experiments across paid, organic and lifecycle." },
  { name: "Senior Staff Engineer", type: "AI Employee", price: "£19/mo", rating: 4.9, reviews: 1502, category: "Development", featured: false, blurb: "Architects, reviews and ships production systems." },
  { name: "Cold Outbound Machine", type: "Mission Template", price: "Free", rating: 4.5, reviews: 311, category: "Sales", featured: false, blurb: "10k-prospect sequence with live deliverability guardrails." },
  { name: "Shopify Connector", type: "Connector", price: "Free", rating: 4.6, reviews: 806, category: "Commerce", featured: false, blurb: "Full catalogue, orders and fulfilment sync." },
  { name: "Brand Studio", type: "Department", price: "£29/mo", rating: 4.8, reviews: 455, category: "Creative", featured: false, blurb: "Identity, video, and campaign production at scale." },
  { name: "Legal Guardian", type: "AI Employee", price: "£24/mo", rating: 4.7, reviews: 288, category: "Legal", featured: false, blurb: "Contract review, filings and compliance monitoring." },
  { name: "Launch a SaaS in 30 Days", type: "Mission Template", price: "£9", rating: 4.9, reviews: 1720, category: "Business", featured: false, blurb: "Idea → pricing → product → launch, fully orchestrated." },
];

export const notifications = [
  { title: "Approval required", body: "Orion wants to roll out usage-based billing.", time: "4m", type: "approval" as const },
  { title: "Mission complete", body: "Enterprise outbound sequence finished with 22 replies.", time: "1h", type: "success" as const },
  { title: "Budget threshold", body: "Marketing spend reached 80% of monthly cap.", time: "3h", type: "warning" as const },
  { title: "Creative blocked", body: "Brand film needs the master audio stem.", time: "5h", type: "error" as const },
  { title: "Workforce scaled", body: "501 new workers provisioned across 3 departments.", time: "8h", type: "info" as const },
];
