// Mock data for the PalladiumAI Agents experience. Placeholder only.
import { Globe, FileText, Mail, Calendar, Terminal, Eye, ImagePlus, Search, Webhook, Workflow, Cpu } from 'lucide-react';

export const CATEGORIES = ['All', 'Research', 'Support', 'Engineering', 'Marketing', 'Finance', 'Operations', 'Design', 'HR'];

export const DEPARTMENTS = ['Research', 'Support', 'Engineering', 'Marketing', 'Finance', 'Operations', 'Design', 'HR', 'Product'];

export const WIZARD_MODELS = [
  { id: 'gpt', name: 'GPT-5', letter: 'G', grad: 'from-emerald-400 to-teal-500', desc: 'Balanced reasoning, coding & chat', context: '128K' },
  { id: 'claude', name: 'Claude', letter: 'C', grad: 'from-orange-400 to-amber-500', desc: 'Long context, nuanced writing', context: '200K' },
  { id: 'gemini', name: 'Gemini', letter: 'G', grad: 'from-blue-400 to-indigo-500', desc: 'Fast, multimodal, huge context', context: '1M' },
  { id: 'deepseek', name: 'DeepSeek', letter: 'D', grad: 'from-cyan-400 to-blue-500', desc: 'Cost-efficient deep reasoning', context: '64K' },
  { id: 'llama', name: 'Llama', letter: 'L', grad: 'from-purple-400 to-fuchsia-500', desc: 'Open-source, self-hostable', context: '128K' },
];

export const WIZARD_TOOLS = [
  { id: 'browser', name: 'Browser', icon: Globe },
  { id: 'files', name: 'File Analysis', icon: FileText },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'terminal', name: 'Terminal', icon: Terminal },
  { id: 'vision', name: 'Vision', icon: Eye },
  { id: 'image', name: 'Image Generation', icon: ImagePlus },
  { id: 'web', name: 'Web Search', icon: Search },
  { id: 'api', name: 'API Calls', icon: Webhook },
  { id: 'workflow', name: 'Workflow Builder', icon: Workflow },
];

export const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600', 'from-cyan-500 to-blue-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600', 'from-fuchsia-500 to-pink-600', 'from-rose-500 to-red-600',
  'from-blue-500 to-cyan-600', 'from-lime-500 to-emerald-600',
];

export const AGENTS = [
  { id: 'a1', name: 'Research Analyst', letter: 'R', grad: 'from-violet-500 to-indigo-600', desc: 'Gathers intelligence across the web and synthesizes concise briefs.', status: 'Running', model: 'GPT-5', modelGrad: 'from-emerald-400 to-teal-500', caps: ['Web Search', 'File Analysis', 'Vision'], memory: true, lastRun: '2m ago', category: 'Research', featured: true, recent: true, score: 94, dept: 'Research', task: 'Scanning 12 sources on AI analytics market' },
  { id: 'a2', name: 'Support Copilot', letter: 'S', grad: 'from-cyan-500 to-blue-600', desc: 'Resolves customer tickets and drafts empathetic replies.', status: 'Running', model: 'Claude', modelGrad: 'from-orange-400 to-amber-500', caps: ['Email', 'Web Search', 'File Analysis'], memory: true, lastRun: '5m ago', category: 'Support', featured: true, recent: true, score: 98, dept: 'Support', task: 'Ticket #4812 — refund enquiry' },
  { id: 'a3', name: 'Code Reviewer', letter: 'C', grad: 'from-emerald-500 to-teal-600', desc: 'Reviews pull requests, suggests fixes, and enforces standards.', status: 'Idle', model: 'DeepSeek', modelGrad: 'from-cyan-400 to-blue-500', caps: ['Terminal', 'File Analysis', 'API Calls'], memory: true, lastRun: '1h ago', category: 'Engineering', featured: true, recent: false, score: 96, dept: 'Engineering', task: 'Idle — awaiting new PR' },
  { id: 'a4', name: 'Growth Writer', letter: 'G', grad: 'from-fuchsia-500 to-pink-600', desc: 'Drafts launch copy, blog posts, and social content.', status: 'Stopped', model: 'Gemini', modelGrad: 'from-blue-400 to-indigo-500', caps: ['Web Search', 'Image Generation'], memory: false, lastRun: '3h ago', category: 'Marketing', featured: false, recent: true, score: 91, dept: 'Marketing', task: 'Stopped' },
  { id: 'a5', name: 'Finance Scout', letter: 'F', grad: 'from-amber-500 to-orange-600', desc: 'Tracks spend, forecasts budgets, and flags anomalies.', status: 'Running', model: 'GPT-5', modelGrad: 'from-emerald-400 to-teal-500', caps: ['File Analysis', 'API Calls', 'Web Search'], memory: true, lastRun: 'now', category: 'Finance', featured: false, recent: false, score: 89, dept: 'Finance', task: 'Forecasting Q3 burn' },
  { id: 'a6', name: 'Ops Monitor', letter: 'O', grad: 'from-blue-500 to-cyan-600', desc: 'Watches uptime, deploys, and alerts on incidents.', status: 'Idle', model: 'Llama', modelGrad: 'from-purple-400 to-fuchsia-500', caps: ['Terminal', 'Browser', 'API Calls'], memory: true, lastRun: '1d ago', category: 'Operations', featured: false, recent: false, score: 87, dept: 'Operations', task: 'Idle — all systems green' },
  { id: 'a7', name: 'Design Critique', letter: 'D', grad: 'from-rose-500 to-red-600', desc: 'Reviews mockups for consistency, contrast, and clarity.', status: 'Stopped', model: 'Claude', modelGrad: 'from-orange-400 to-amber-500', caps: ['Vision', 'Image Generation'], memory: false, lastRun: '2d ago', category: 'Design', featured: false, recent: false, score: 84, dept: 'Design', task: 'Stopped' },
  { id: 'a8', name: 'Data Engineer', letter: 'D', grad: 'from-lime-500 to-emerald-600', desc: 'Builds pipelines, runs queries, and validates schemas.', status: 'Running', model: 'DeepSeek', modelGrad: 'from-cyan-400 to-blue-500', caps: ['Terminal', 'File Analysis', 'API Calls'], memory: true, lastRun: '12m ago', category: 'Engineering', featured: true, recent: true, score: 93, dept: 'Engineering', task: 'Backfilling events table' },
  { id: 'a9', name: 'Social Manager', letter: 'S', grad: 'from-violet-500 to-fuchsia-600', desc: 'Plans and schedules posts across channels.', status: 'Idle', model: 'Gemini', modelGrad: 'from-blue-400 to-indigo-500', caps: ['Web Search', 'Browser', 'Calendar'], memory: true, lastRun: '8m ago', category: 'Marketing', featured: false, recent: true, score: 88, dept: 'Marketing', task: 'Scheduling 5 posts' },
  { id: 'a10', name: 'Recruiter Bot', letter: 'R', grad: 'from-cyan-400 to-blue-500', desc: 'Screens candidates and books intro calls.', status: 'Idle', model: 'Mistral', modelGrad: 'from-rose-400 to-orange-500', caps: ['Email', 'Calendar'], memory: true, lastRun: '2d ago', category: 'HR', featured: false, recent: false, score: 82, dept: 'HR', task: 'Idle' },
];

export const STATUS_STYLE = {
  Running: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Idle: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-white/5' },
  Stopped: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
  Paused: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' },
};

// Agent detail data (mock)
export const PERF_SERIES = [
  { d: 'Mon', success: 88, latency: 3.1, tokens: 142 },
  { d: 'Tue', success: 91, latency: 2.8, tokens: 168 },
  { d: 'Wed', success: 86, latency: 3.4, tokens: 120 },
  { d: 'Thu', success: 94, latency: 2.4, tokens: 210 },
  { d: 'Fri', success: 96, latency: 2.1, tokens: 245 },
  { d: 'Sat', success: 92, latency: 2.6, tokens: 190 },
  { d: 'Sun', success: 94, latency: 2.4, tokens: 205 },
];

export const TOOL_USAGE = [
  { name: 'Web Search', calls: 312 },
  { name: 'File Analysis', calls: 184 },
  { name: 'Vision', calls: 96 },
  { name: 'API Calls', calls: 74 },
  { name: 'Terminal', calls: 41 },
];

export const RECENT_CONVERSATIONS = [
  { id: 'co1', title: 'Competitor teardown — Linear', msgs: 14, time: '2m ago', model: 'GPT-5' },
  { id: 'co2', title: 'AI analytics market sizing', msgs: 9, time: '1h ago', model: 'GPT-5' },
  { id: 'co3', title: 'Funding report Q3 draft', msgs: 6, time: '3h ago', model: 'GPT-5' },
  { id: 'co4', title: 'Pricing page audit', msgs: 11, time: '1d ago', model: 'GPT-5' },
];

export const LOGS = `[12:04:01] INFO  Agent initialized · model=gpt-5
[12:04:03] INFO  Loading memory · 428 facts
[12:05:11] INFO  Tool: web_search("AI analytics market 2026")
[12:05:14] INFO  Retrieved 12 sources
[12:06:02] WARN  Rate limit on source #7 — retrying
[12:06:09] INFO  Retry succeeded
[12:07:40] INFO  Synthesizing brief · 2.1k tokens
[12:08:02] INFO  Brief drafted · saved to workspace`;

export const STATS = [
  { label: 'Success rate', value: '94%', sub: '+3% vs last week', up: true },
  { label: 'Avg latency', value: '2.4s', sub: '-0.3s vs last week', up: true },
  { label: 'Tokens used', value: '1.2M', sub: 'this month', up: false },
  { label: 'Tasks completed', value: '184', sub: '+24 this week', up: true },
];

export const ACTIVITY = [
  { state: 'Completed', text: 'Finished competitive brief', time: '2m ago', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  { state: 'Running', text: 'Analyzing 12 sources', time: 'now', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  { state: 'Thinking', text: 'Planning research steps', time: '4m ago', color: 'text-violet-400', dot: 'bg-violet-400' },
  { state: 'Warning', text: 'Rate limit on 2 sources — retrying', time: '6m ago', color: 'text-amber-400', dot: 'bg-amber-400' },
  { state: 'Finished', text: 'Initialized agent session', time: '12m ago', color: 'text-emerald-400', dot: 'bg-emerald-400' },
];

export const MEM_USAGE = [
  { label: 'Long-term memory', value: 78, max: 512, unit: 'facts', color: 'from-violet-500 to-indigo-500' },
  { label: 'Short-term memory', value: 42, max: 128, unit: 'items', color: 'from-cyan-500 to-blue-500' },
  { label: 'Conversation history', value: 1.4, max: 4, unit: 'MB', color: 'from-emerald-500 to-teal-500' },
  { label: 'Knowledge base', value: 3.2, max: 10, unit: 'GB', color: 'from-amber-500 to-orange-500' },
];