import {
  Workflow, Activity, CheckCircle2, XCircle, Clock, Save, Zap, TrendingUp,
  Play, Split, Repeat, Variable, GitBranch, Bot, UserCheck, Bell, FileText,
  Database, Plug, Code, Code2, Timer, CalendarClock, Brain, BookOpen, Search,
  Globe, Mail, MessageSquare, Mic, Image, Video, File, CreditCard, HardDrive, BarChart3,
  Webhook, Upload, Terminal, Github, RefreshCw, MousePointerClick,
  Megaphone, DollarSign, Headphones, Palette, PenTool, ShieldCheck, ShieldAlert,
  Server, Hash, Box, Wallet, Phone, Cloud, Square, Layers, Table, Flame, Triangle, Boxes,
  Filter, Shuffle, Infinity, GitMerge, Settings, Lock, Eye, User, Flag, Send,
  Cpu, MemoryStick, Wrench, Gauge, AlertTriangle, AlertCircle, ListOrdered, HeartPulse, Sparkles,
  Rocket, ArrowRight, Pause, StopCircle, CircleDot, Radio,
  CheckSquare, HelpCircle, Scan, Languages, Wifi, Hexagon, Network, Share2, GitPullRequest,
} from 'lucide-react';

// ─── Overview Metrics ─────────────────────────────────
export const OVERVIEW_METRICS = [
  { label: 'Total Workflows', value: '47', detail: '+3 this week', trend: [20,24,22,28,30,34,38,42,47], icon: Workflow, grad: 'from-violet-500 to-indigo-500' },
  { label: 'Running Workflows', value: '12', detail: '8 active now', trend: [5,7,6,8,9,10,11,12,12], icon: Activity, grad: 'from-emerald-500 to-teal-500' },
  { label: 'Successful Runs', value: '18,402', detail: '94.2% success', trend: [12,14,15,16,16,17,18,18,18], icon: CheckCircle2, grad: 'from-sky-500 to-blue-500' },
  { label: 'Failed Runs', value: '1,128', detail: '5.8% failure', trend: [3,2.5,2.8,2.2,2,1.8,1.5,1.3,1.1], icon: XCircle, grad: 'from-rose-500 to-red-500' },
  { label: 'Average Runtime', value: '2.4s', detail: '-0.3s vs last week', trend: [3.2,3.0,2.9,2.8,2.7,2.6,2.5,2.4,2.4], icon: Clock, grad: 'from-amber-500 to-orange-500' },
  { label: 'Automations Saved', value: '1,240', detail: '+84 this month', trend: [8,10,12,14,16,18,20,22,24], icon: Save, grad: 'from-fuchsia-500 to-pink-500' },
  { label: 'Active Triggers', value: '38', detail: '12 workflows', trend: [18,22,25,28,30,33,35,37,38], icon: Zap, grad: 'from-cyan-500 to-sky-500' },
  { label: 'Monthly Executions', value: '52.8K', detail: '+18% vs last month', trend: [30,35,38,40,44,47,49,51,52], icon: TrendingUp, grad: 'from-purple-500 to-violet-500' },
];

// ─── Toolbox Categories ────────────────────────────────
export const TOOLBOX = [
  { label: 'Triggers', icon: Zap, grad: 'from-emerald-500 to-teal-500', items: ['Webhook','Schedule','Email Received','Form Submitted','File Uploaded','API Request','Slack Message','Discord Message','GitHub Push','Database Change','CRM Update','Manual Trigger'] },
  { label: 'Actions', icon: Play, grad: 'from-violet-500 to-indigo-500', items: ['Send Email','Create Record','Update Record','Delete Record','HTTP Request','Transform Data','Run Script'] },
  { label: 'Conditions', icon: Split, grad: 'from-amber-500 to-orange-500', items: ['If','Else','Switch','Compare','Contains','Equals','Greater Than','Less Than','Exists','Regex'] },
  { label: 'Loops', icon: Repeat, grad: 'from-cyan-500 to-sky-500', items: ['For Each','Repeat','Until','Batch Processing','Parallel Execution'] },
  { label: 'Variables', icon: Variable, grad: 'from-fuchsia-500 to-pink-500', items: ['Set Variable','Get Variable','Append','Clear','Merge'] },
  { label: 'Logic', icon: GitBranch, grad: 'from-blue-500 to-indigo-500', items: ['AND','OR','NOT','XOR','Filter','Map','Reduce'] },
  { label: 'AI Agents', icon: Bot, grad: 'from-violet-500 to-purple-500', items: ['Planner','Research','Developer','Marketing','Sales','Finance','Support','Designer','Writer','QA','Security','Custom'] },
  { label: 'Human Approval', icon: UserCheck, grad: 'from-rose-500 to-pink-500', items: ['Approval Node','Reject Node','Assign Reviewer','Deadline','Escalation','Comments'] },
  { label: 'Notifications', icon: Bell, grad: 'from-amber-500 to-yellow-500', items: ['Email','SMS','Push','Slack','Discord','Teams','Webhook'] },
  { label: 'Files', icon: FileText, grad: 'from-teal-500 to-cyan-500', items: ['Upload','Download','Read','Write','Delete','Copy','Move'] },
  { label: 'Databases', icon: Database, grad: 'from-sky-500 to-blue-500', items: ['PostgreSQL','MongoDB','MySQL','Redis','Supabase','Firebase'] },
  { label: 'Integrations', icon: Plug, grad: 'from-indigo-500 to-violet-500', items: ['OpenAI','Claude','Gemini','GitHub','Slack','Notion','Stripe'] },
  { label: 'API Calls', icon: Code, grad: 'from-emerald-500 to-green-500', items: ['GET','POST','PUT','PATCH','DELETE','GraphQL','REST'] },
  { label: 'Code Blocks', icon: Code2, grad: 'from-zinc-500 to-slate-500', items: ['JavaScript','Python','TypeScript','Shell','SQL'] },
  { label: 'Timers', icon: Timer, grad: 'from-orange-500 to-red-500', items: ['Delay','Wait','Timeout','Countdown','Interval'] },
  { label: 'Schedules', icon: CalendarClock, grad: 'from-purple-500 to-fuchsia-500', items: ['Cron','Interval','One-time','Recurring','Business Hours'] },
  { label: 'Memory', icon: Brain, grad: 'from-pink-500 to-rose-500', items: ['Short-Term','Long-Term','Project','Shared','Vector Search'] },
  { label: 'Knowledge Base', icon: BookOpen, grad: 'from-cyan-500 to-teal-500', items: ['Search','Ingest','Query','Embed','Retrieve'] },
  { label: 'Search', icon: Search, grad: 'from-blue-500 to-cyan-500', items: ['Web Search','Image Search','Vector Search','Semantic','Full-Text'] },
  { label: 'Browser', icon: Globe, grad: 'from-emerald-500 to-teal-500', items: ['Navigate','Scrape','Screenshot','Click','Extract'] },
  { label: 'Email', icon: Mail, grad: 'from-rose-500 to-red-500', items: ['Send','Receive','Parse','Reply','Forward'] },
  { label: 'SMS', icon: MessageSquare, grad: 'from-violet-500 to-purple-500', items: ['Send SMS','Receive SMS','Parse','Auto-Reply'] },
  { label: 'Voice', icon: Mic, grad: 'from-fuchsia-500 to-pink-500', items: ['Transcribe','Synthesize','Call','Record'] },
  { label: 'Image', icon: Image, grad: 'from-amber-500 to-orange-500', items: ['Generate','Edit','Analyze','Resize','OCR'] },
  { label: 'Video', icon: Video, grad: 'from-indigo-500 to-blue-500', items: ['Generate','Edit','Transcode','Analyze'] },
  { label: 'Documents', icon: File, grad: 'from-slate-500 to-zinc-500', items: ['PDF','Word','Excel','Markdown','Parse'] },
  { label: 'Payments', icon: CreditCard, grad: 'from-emerald-500 to-green-500', items: ['Charge','Refund','Subscribe','Invoice'] },
  { label: 'Storage', icon: HardDrive, grad: 'from-teal-500 to-cyan-500', items: ['S3','GCS','Azure Blob','Local'] },
  { label: 'Analytics', icon: BarChart3, grad: 'from-purple-500 to-indigo-500', items: ['Track','Report','Dashboard','Export'] },
];

// ─── Triggers ──────────────────────────────────────────
export const TRIGGERS = [
  { name: 'Webhook', icon: Webhook, desc: 'Trigger on HTTP request', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Schedule', icon: CalendarClock, desc: 'Run on cron schedule', grad: 'from-purple-500 to-fuchsia-500' },
  { name: 'Email Received', icon: Mail, desc: 'Trigger on new email', grad: 'from-rose-500 to-red-500' },
  { name: 'Form Submitted', icon: FileText, desc: 'Trigger on form entry', grad: 'from-sky-500 to-blue-500' },
  { name: 'File Uploaded', icon: Upload, desc: 'Trigger on file upload', grad: 'from-teal-500 to-cyan-500' },
  { name: 'API Request', icon: Terminal, desc: 'Trigger on API call', grad: 'from-emerald-500 to-green-500' },
  { name: 'Slack Message', icon: MessageSquare, desc: 'Trigger on Slack msg', grad: 'from-violet-500 to-purple-500' },
  { name: 'Discord Message', icon: MessageSquare, desc: 'Trigger on Discord msg', grad: 'from-indigo-500 to-blue-500' },
  { name: 'GitHub Push', icon: Github, desc: 'Trigger on git push', grad: 'from-zinc-500 to-slate-500' },
  { name: 'Database Change', icon: Database, desc: 'Trigger on DB event', grad: 'from-cyan-500 to-sky-500' },
  { name: 'CRM Update', icon: RefreshCw, desc: 'Trigger on CRM change', grad: 'from-amber-500 to-orange-500' },
  { name: 'Manual Trigger', icon: MousePointerClick, desc: 'Run on demand', grad: 'from-fuchsia-500 to-pink-500' },
];

// ─── AI Agent Blocks ───────────────────────────────────
export const AI_AGENTS = [
  { name: 'Planner Agent', icon: Brain, model: 'GPT-4o', status: 'running', memory: true, tools: 8, grad: 'from-violet-500 to-indigo-500' },
  { name: 'Research Agent', icon: Search, model: 'Claude 3.5', status: 'idle', memory: true, tools: 12, grad: 'from-sky-500 to-blue-500' },
  { name: 'Developer Agent', icon: Code, model: 'GPT-4o', status: 'running', memory: true, tools: 15, grad: 'from-emerald-500 to-teal-500' },
  { name: 'Marketing Agent', icon: Megaphone, model: 'Gemini 1.5', status: 'idle', memory: false, tools: 6, grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Sales Agent', icon: TrendingUp, model: 'GPT-4o', status: 'paused', memory: true, tools: 9, grad: 'from-amber-500 to-orange-500' },
  { name: 'Finance Agent', icon: DollarSign, model: 'Claude 3.5', status: 'running', memory: true, tools: 7, grad: 'from-emerald-500 to-green-500' },
  { name: 'Support Agent', icon: Headphones, model: 'GPT-4o', status: 'running', memory: true, tools: 11, grad: 'from-cyan-500 to-sky-500' },
  { name: 'Designer Agent', icon: Palette, model: 'Gemini 1.5', status: 'idle', memory: false, tools: 5, grad: 'from-rose-500 to-pink-500' },
  { name: 'Writer Agent', icon: PenTool, model: 'Claude 3.5', status: 'running', memory: true, tools: 4, grad: 'from-purple-500 to-fuchsia-500' },
  { name: 'QA Agent', icon: ShieldCheck, model: 'GPT-4o', status: 'idle', memory: true, tools: 10, grad: 'from-blue-500 to-indigo-500' },
  { name: 'Security Agent', icon: ShieldAlert, model: 'Claude 3.5', status: 'running', memory: true, tools: 14, grad: 'from-red-500 to-rose-500' },
  { name: 'Custom Agent', icon: Bot, model: 'Custom', status: 'idle', memory: false, tools: 0, grad: 'from-slate-500 to-zinc-500' },
];

// ─── Integrations ───────────────────────────────────────
export const INTEGRATIONS = [
  { name: 'OpenAI', icon: Sparkles, grad: 'from-emerald-500 to-teal-500', status: 'connected' },
  { name: 'Claude', icon: Brain, grad: 'from-amber-500 to-orange-500', status: 'connected' },
  { name: 'Gemini', icon: Zap, grad: 'from-blue-500 to-sky-500', status: 'connected' },
  { name: 'Ollama', icon: Server, grad: 'from-zinc-500 to-slate-500', status: 'connected' },
  { name: 'GitHub', icon: Github, grad: 'from-slate-500 to-zinc-500', status: 'connected' },
  { name: 'GitLab', icon: GitBranch, grad: 'from-orange-500 to-red-500', status: 'available' },
  { name: 'Slack', icon: Hash, grad: 'from-purple-500 to-violet-500', status: 'connected' },
  { name: 'Discord', icon: MessageSquare, grad: 'from-indigo-500 to-blue-500', status: 'available' },
  { name: 'Notion', icon: FileText, grad: 'from-zinc-500 to-slate-500', status: 'connected' },
  { name: 'Google Drive', icon: HardDrive, grad: 'from-amber-500 to-yellow-500', status: 'connected' },
  { name: 'Dropbox', icon: Box, grad: 'from-sky-500 to-blue-500', status: 'available' },
  { name: 'Stripe', icon: CreditCard, grad: 'from-indigo-500 to-violet-500', status: 'connected' },
  { name: 'PayPal', icon: Wallet, grad: 'from-blue-500 to-sky-500', status: 'available' },
  { name: 'Twilio', icon: Phone, grad: 'from-red-500 to-rose-500', status: 'connected' },
  { name: 'HubSpot', icon: BarChart3, grad: 'from-orange-500 to-amber-500', status: 'available' },
  { name: 'Salesforce', icon: Cloud, grad: 'from-sky-500 to-blue-500', status: 'available' },
  { name: 'Jira', icon: Square, grad: 'from-blue-500 to-indigo-500', status: 'connected' },
  { name: 'Linear', icon: Layers, grad: 'from-violet-500 to-purple-500', status: 'connected' },
  { name: 'Airtable', icon: Table, grad: 'from-amber-500 to-yellow-500', status: 'available' },
  { name: 'Supabase', icon: Database, grad: 'from-emerald-500 to-green-500', status: 'connected' },
  { name: 'Firebase', icon: Flame, grad: 'from-amber-500 to-orange-500', status: 'available' },
  { name: 'AWS', icon: Cloud, grad: 'from-orange-500 to-amber-500', status: 'connected' },
  { name: 'Azure', icon: Cloud, grad: 'from-sky-500 to-blue-500', status: 'available' },
  { name: 'Vercel', icon: Triangle, grad: 'from-zinc-500 to-slate-500', status: 'connected' },
  { name: 'Cloudflare', icon: Globe, grad: 'from-amber-500 to-orange-500', status: 'connected' },
];

// ─── Conditions ────────────────────────────────────────
export const CONDITIONS = [
  { name: 'If', icon: Split, desc: 'Conditional branch', grad: 'from-amber-500 to-orange-500' },
  { name: 'Else', icon: GitBranch, desc: 'Alternative branch', grad: 'from-orange-500 to-red-500' },
  { name: 'Switch', icon: Shuffle, desc: 'Multi-way branch', grad: 'from-amber-500 to-yellow-500' },
  { name: 'Compare', icon: GitMerge, desc: 'Compare values', grad: 'from-yellow-500 to-amber-500' },
  { name: 'Contains', icon: Filter, desc: 'String contains check', grad: 'from-amber-500 to-orange-500' },
  { name: 'Equals', icon: CheckSquare, desc: 'Exact equality', grad: 'from-orange-500 to-amber-500' },
  { name: 'Greater Than', icon: TrendingUp, desc: 'Numeric comparison', grad: 'from-amber-500 to-red-500' },
  { name: 'Less Than', icon: TrendingUp, desc: 'Numeric comparison', grad: 'from-red-500 to-rose-500' },
  { name: 'Exists', icon: Eye, desc: 'Null/undefined check', grad: 'from-yellow-500 to-orange-500' },
  { name: 'Regex', icon: Search, desc: 'Pattern matching', grad: 'from-orange-500 to-amber-500' },
];

// ─── Loops ─────────────────────────────────────────────
export const LOOPS = [
  { name: 'For Each', icon: Repeat, desc: 'Iterate over array', grad: 'from-cyan-500 to-sky-500' },
  { name: 'Repeat', icon: RefreshCw, desc: 'Fixed count loop', grad: 'from-sky-500 to-blue-500' },
  { name: 'Until', icon: Infinity, desc: 'Loop until condition', grad: 'from-blue-500 to-indigo-500' },
  { name: 'Batch Processing', icon: Layers, desc: 'Process in batches', grad: 'from-indigo-500 to-violet-500' },
  { name: 'Parallel Execution', icon: Shuffle, desc: 'Run concurrently', grad: 'from-violet-500 to-purple-500' },
];

// ─── AI Memory ──────────────────────────────────────────
export const AI_MEMORY = [
  { name: 'Short-Term Memory', icon: MemoryStick, desc: 'Session-scoped context', enabled: true, size: '128 MB', grad: 'from-violet-500 to-indigo-500' },
  { name: 'Long-Term Memory', icon: Brain, desc: 'Persistent across sessions', enabled: true, size: '2.4 GB', grad: 'from-purple-500 to-fuchsia-500' },
  { name: 'Project Memory', icon: FolderIcon(), desc: 'Shared within project', enabled: true, size: '512 MB', grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Shared Memory', icon: Share2, desc: 'Cross-agent memory pool', enabled: false, size: '1.0 GB', grad: 'from-pink-500 to-rose-500' },
  { name: 'Knowledge Base', icon: BookOpen, desc: 'Vector-indexed documents', enabled: true, size: '4.8 GB', grad: 'from-cyan-500 to-teal-500' },
  { name: 'Vector Search', icon: Search, desc: 'Semantic similarity query', enabled: true, size: '—', grad: 'from-sky-500 to-blue-500' },
];

function FolderIcon() { return Database; }

// ─── Human Approvals ───────────────────────────────────
export const HUMAN_APPROVALS = [
  { name: 'Approval Node', icon: UserCheck, desc: 'Pause for human review', status: 'waiting', reviewer: 'Maya Chen', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Reject Node', icon: XCircle, desc: 'Send to rejection flow', status: 'ready', reviewer: '—', grad: 'from-rose-500 to-red-500' },
  { name: 'Assign Reviewer', icon: User, desc: 'Route to team member', status: 'assigned', reviewer: 'Alex Rivera', grad: 'from-sky-500 to-blue-500' },
  { name: 'Deadline', icon: Clock, desc: 'Auto-escalate after 24h', status: 'active', reviewer: '—', grad: 'from-amber-500 to-orange-500' },
  { name: 'Escalation', icon: AlertTriangle, desc: 'Escalate to manager', status: 'ready', reviewer: '—', grad: 'from-orange-500 to-red-500' },
  { name: 'Comments', icon: MessageSquare, desc: 'Add review notes', status: 'ready', reviewer: '—', grad: 'from-violet-500 to-purple-500' },
];

// ─── Monitoring ────────────────────────────────────────
export const MONITORING = [
  { label: 'CPU Usage', value: 42, unit: '%', icon: Cpu, grad: 'from-violet-500 to-indigo-500', trend: [30,35,40,38,42,45,42,40,42] },
  { label: 'Memory Usage', value: 68, unit: '%', icon: MemoryStick, grad: 'from-cyan-500 to-sky-500', trend: [55,60,65,70,68,66,69,68,68] },
  { label: 'API Requests', value: '12.4K', unit: '/min', icon: Server, grad: 'from-emerald-500 to-teal-500', trend: [8,9,10,11,12,11,12,12,12] },
  { label: 'Execution Queue', value: 24, unit: 'jobs', icon: ListOrdered, grad: 'from-amber-500 to-orange-500', trend: [15,18,20,22,24,26,25,24,24] },
  { label: 'Errors', value: 3, unit: 'today', icon: AlertCircle, grad: 'from-rose-500 to-red-500', trend: [8,6,5,4,3,2,3,3,3] },
  { label: 'Warnings', value: 12, unit: 'today', icon: AlertTriangle, grad: 'from-amber-500 to-yellow-500', trend: [20,18,15,14,13,12,12,12,12] },
  { label: 'Performance', value: 94, unit: '%', icon: Gauge, grad: 'from-emerald-500 to-green-500', trend: [88,90,91,93,94,93,94,94,94] },
];

// ─── Workflow Templates ────────────────────────────────
export const WORKFLOW_TEMPLATES = [
  { name: 'Lead Generation', icon: TrendingUp, desc: 'Capture & enrich leads automatically', runs: '4.2K', rating: 4.8, grad: 'from-violet-500 to-indigo-500', tags: ['Sales','CRM','Enrichment'] },
  { name: 'Customer Support', icon: Headphones, desc: 'Auto-route & respond to tickets', runs: '8.1K', rating: 4.9, grad: 'from-cyan-500 to-sky-500', tags: ['Support','AI','Routing'] },
  { name: 'Website Builder', icon: Globe, desc: 'Generate sites from prompts', runs: '2.7K', rating: 4.7, grad: 'from-emerald-500 to-teal-500', tags: ['Dev','AI','Code'] },
  { name: 'Research Pipeline', icon: Search, desc: 'Deep research with citations', runs: '3.5K', rating: 4.8, grad: 'from-amber-500 to-orange-500', tags: ['Research','Web','AI'] },
  { name: 'Content Factory', icon: PenTool, desc: 'Batch content generation', runs: '6.3K', rating: 4.6, grad: 'from-fuchsia-500 to-pink-500', tags: ['Content','AI','SEO'] },
  { name: 'Marketing Campaign', icon: Megaphone, desc: 'Multi-channel campaign automation', runs: '5.1K', rating: 4.7, grad: 'from-rose-500 to-pink-500', tags: ['Marketing','Email','Social'] },
  { name: 'Invoice Processing', icon: DollarSign, desc: 'OCR & approve invoices', runs: '1.9K', rating: 4.5, grad: 'from-emerald-500 to-green-500', tags: ['Finance','OCR','Approval'] },
  { name: 'HR Onboarding', icon: UserCheck, desc: 'Automate new hire workflows', runs: '890', rating: 4.6, grad: 'from-sky-500 to-blue-500', tags: ['HR','Email','Docs'] },
  { name: 'Bug Triage', icon: ShieldAlert, desc: 'Auto-classify & assign bugs', runs: '3.8K', rating: 4.7, grad: 'from-red-500 to-rose-500', tags: ['Dev','QA','GitHub'] },
  { name: 'Software Deployment', icon: Rocket, desc: 'CI/CD pipeline automation', runs: '2.1K', rating: 4.8, grad: 'from-purple-500 to-fuchsia-500', tags: ['DevOps','Deploy','CI/CD'] },
  { name: 'AI Chatbot', icon: Bot, desc: 'Deploy intelligent chatbot', runs: '9.4K', rating: 4.9, grad: 'from-indigo-500 to-blue-500', tags: ['AI','Chat','Support'] },
  { name: 'Sales Outreach', icon: Send, desc: 'Personalized cold outreach', runs: '4.7K', rating: 4.6, grad: 'from-amber-500 to-orange-500', tags: ['Sales','Email','AI'] },
];

// ─── Recent Workflows ───────────────────────────────────
export const RECENT_WORKFLOWS = [
  { name: 'Lead Enrichment Pipeline', status: 'running', creator: 'Maya Chen', edited: '2 min ago', runs: 1240, grad: 'from-violet-500 to-indigo-500', icon: TrendingUp },
  { name: 'Support Ticket Router', status: 'running', creator: 'Alex Rivera', edited: '1 hour ago', runs: 3420, grad: 'from-cyan-500 to-sky-500', icon: Headphones },
  { name: 'Content Generation Engine', status: 'paused', creator: 'Sam Park', edited: '3 hours ago', runs: 890, grad: 'from-fuchsia-500 to-pink-500', icon: PenTool },
  { name: 'Deploy & Notify', status: 'running', creator: 'Jordan Lee', edited: '5 hours ago', runs: 520, grad: 'from-purple-500 to-fuchsia-500', icon: Rocket },
  { name: 'Invoice Approval Flow', status: 'draft', creator: 'Maya Chen', edited: '1 day ago', runs: 0, grad: 'from-emerald-500 to-green-500', icon: DollarSign },
  { name: 'Bug Auto-Triage', status: 'running', creator: 'Alex Rivera', edited: '2 days ago', runs: 2180, grad: 'from-red-500 to-rose-500', icon: ShieldAlert },
];

// ─── Run History ────────────────────────────────────────
export const RUN_HISTORY = [
  { id: 'RUN-4821', workflow: 'Lead Enrichment Pipeline', started: '10:42 AM', finished: '10:42 AM', duration: '2.1s', status: 'success', errors: 0, outputs: 12 },
  { id: 'RUN-4820', workflow: 'Support Ticket Router', started: '10:38 AM', finished: '10:39 AM', duration: '24.3s', status: 'success', errors: 0, outputs: 8 },
  { id: 'RUN-4819', workflow: 'Content Generation Engine', started: '10:31 AM', finished: '10:31 AM', duration: '8.7s', status: 'failed', errors: 2, outputs: 0 },
  { id: 'RUN-4818', workflow: 'Deploy & Notify', started: '10:24 AM', finished: '10:25 AM', duration: '41.2s', status: 'success', errors: 0, outputs: 5 },
  { id: 'RUN-4817', workflow: 'Bug Auto-Triage', started: '10:18 AM', finished: '10:18 AM', duration: '1.4s', status: 'success', errors: 0, outputs: 24 },
  { id: 'RUN-4816', workflow: 'Lead Enrichment Pipeline', started: '10:12 AM', finished: '10:12 AM', duration: '2.8s', status: 'warning', errors: 0, outputs: 10 },
  { id: 'RUN-4815', workflow: 'Support Ticket Router', started: '10:05 AM', finished: '10:05 AM', duration: '18.9s', status: 'success', errors: 0, outputs: 6 },
  { id: 'RUN-4814', workflow: 'Content Generation Engine', started: '09:58 AM', finished: '09:58 AM', duration: '7.2s', status: 'failed', errors: 1, outputs: 0 },
];

// ─── Canvas Nodes ───────────────────────────────────────
export const CANVAS_NODES = [
  { id: 'n1', type: 'trigger', label: 'Webhook', sub: 'POST /api/lead', icon: Webhook, x: 40, y: 180, status: 'active', grad: 'from-emerald-500 to-teal-500' },
  { id: 'n2', type: 'agent', label: 'Planner Agent', sub: 'GPT-4o', icon: Brain, x: 280, y: 100, status: 'running', grad: 'from-violet-500 to-indigo-500' },
  { id: 'n3', type: 'agent', label: 'Research Agent', sub: 'Claude 3.5', icon: Search, x: 280, y: 260, status: 'idle', grad: 'from-sky-500 to-blue-500' },
  { id: 'n4', type: 'condition', label: 'If: Data Found', sub: 'email != null', icon: Split, x: 540, y: 180, status: 'waiting', grad: 'from-amber-500 to-orange-500' },
  { id: 'n5', type: 'database', label: 'Save to CRM', sub: 'HubSpot', icon: Database, x: 780, y: 100, status: 'pending', grad: 'from-cyan-500 to-sky-500' },
  { id: 'n6', type: 'approval', label: 'Human Approval', sub: 'Maya Chen', icon: UserCheck, x: 780, y: 260, status: 'waiting', grad: 'from-fuchsia-500 to-pink-500' },
  { id: 'n7', type: 'notification', label: 'Slack Notify', sub: '#sales-team', icon: Bell, x: 1020, y: 180, status: 'pending', grad: 'from-rose-500 to-red-500' },
];

export const CANVAS_CONNECTIONS = [
  { from: 'n1', to: 'n2' },
  { from: 'n1', to: 'n3' },
  { from: 'n2', to: 'n4' },
  { from: 'n3', to: 'n4' },
  { from: 'n4', to: 'n5' },
  { from: 'n4', to: 'n6' },
  { from: 'n5', to: 'n7' },
  { from: 'n6', to: 'n7' },
];

// ─── Node Settings Fields ───────────────────────────────
export const NODE_SETTINGS = {
  name: 'Planner Agent',
  type: 'AI Agent',
  description: 'Analyzes incoming lead data and creates an execution plan',
  inputs: ['lead_data', 'webhook_payload'],
  outputs: ['execution_plan', 'priority_score'],
  variables: ['{lead_score}', '{company_name}', '{intent}'],
  retry: { attempts: 3, delay: '5s', backoff: 'exponential' },
  timeout: '30s',
  errorHandling: 'Continue to next node',
  logging: 'Verbose',
  permissions: ['read:crm', 'write:slack'],
};

// ─── Right Sidebar ──────────────────────────────────────
export const SIDEBAR = {
  notifications: [
    { text: 'Lead Enrichment Pipeline completed successfully', time: '2m', kind: 'success' },
    { text: 'Content Generation Engine failed — check logs', time: '8m', kind: 'error' },
    { text: 'Maya approved workflow “Invoice Flow”', time: '1h', kind: 'info' },
    { text: 'New template available: Sales Outreach', time: '3h', kind: 'update' },
  ],
  recommendations: [
    { text: 'Add error handling to Research Agent', grad: 'from-amber-500 to-orange-500', icon: AlertTriangle },
    { text: 'Planner Agent could use Long-Term Memory', grad: 'from-violet-500 to-indigo-500', icon: Brain },
    { text: 'Optimize Support Router with batch processing', grad: 'from-cyan-500 to-sky-500', icon: Layers },
    { text: 'Add human approval before Slack Notify', grad: 'from-rose-500 to-pink-500', icon: UserCheck },
  ],
  executionQueue: [
    { name: 'Lead Enrichment #4822', status: 'running', progress: 72 },
    { name: 'Support Router #1204', status: 'queued', progress: 0 },
    { name: 'Bug Triage #891', status: 'running', progress: 45 },
    { name: 'Deploy & Notify #203', status: 'queued', progress: 0 },
  ],
  upcomingSchedules: [
    { name: 'Weekly Report', time: 'Today 5:00 PM', icon: CalendarClock, grad: 'from-purple-500 to-fuchsia-500' },
    { name: 'Nightly Backup', time: 'Today 11:00 PM', icon: HardDrive, grad: 'from-cyan-500 to-sky-500' },
    { name: 'Lead Sync', time: 'Tomorrow 9:00 AM', icon: RefreshCw, grad: 'from-emerald-500 to-teal-500' },
    { name: 'Content Digest', time: 'Mon 8:00 AM', icon: Mail, grad: 'from-rose-500 to-red-500' },
  ],
  recentActivity: [
    { text: 'Created workflow “Lead Enrichment”', time: '2m ago' },
    { text: 'Published “Support Router” v2.4', time: '1h ago' },
    { text: 'Imported template “Bug Triage”', time: '3h ago' },
    { text: 'Connected Slack integration', time: '5h ago' },
    { text: 'Added Human Approval node', time: '1d ago' },
  ],
  workflowHealth: [
    { name: 'Lead Enrichment', score: 98, status: 'healthy', grad: 'from-emerald-500 to-teal-500' },
    { name: 'Support Router', score: 94, status: 'healthy', grad: 'from-sky-500 to-blue-500' },
    { name: 'Content Engine', score: 67, status: 'warning', grad: 'from-amber-500 to-orange-500' },
    { name: 'Deploy & Notify', score: 89, status: 'healthy', grad: 'from-violet-500 to-indigo-500' },
    { name: 'Invoice Flow', score: 45, status: 'critical', grad: 'from-rose-500 to-red-500' },
  ],
};

// ─── Status styles ──────────────────────────────────────
export const STATUS_STYLE = {
  running:  { label: 'Running',  dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  active:   { label: 'Active',   dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  idle:     { label: 'Idle',     dot: 'bg-zinc-500',    text: 'text-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400' },
  paused:   { label: 'Paused',   dot: 'bg-amber-400',   text: 'text-amber-400',   badge: 'bg-amber-400/10 text-amber-400' },
  waiting:  { label: 'Waiting',  dot: 'bg-sky-400',     text: 'text-sky-400',     badge: 'bg-sky-400/10 text-sky-400' },
  pending:  { label: 'Pending',  dot: 'bg-zinc-500',    text: 'text-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400' },
  ready:    { label: 'Ready',    dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  assigned: { label: 'Assigned', dot: 'bg-sky-400',     text: 'text-sky-400',     badge: 'bg-sky-400/10 text-sky-400' },
  draft:    { label: 'Draft',    dot: 'bg-zinc-500',    text: 'text-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400' },
  connected:{ label: 'Connected',dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  available:{ label: 'Available',dot: 'bg-zinc-500',    text: 'text-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400' },
  success:  { label: 'Success', dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  failed:   { label: 'Failed',   dot: 'bg-rose-400',    text: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400' },
  warning:  { label: 'Warning',  dot: 'bg-amber-400',   text: 'text-amber-400',   badge: 'bg-amber-400/10 text-amber-400' },
  queued:   { label: 'Queued',   dot: 'bg-zinc-500',    text: 'text-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400' },
  healthy:  { label: 'Healthy',  dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  critical: { label: 'Critical', dot: 'bg-rose-400',    text: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400' },
};

export { Infinity as InfinityIcon };