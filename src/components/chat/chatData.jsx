// Central mock data for the PalladiumAI Chat experience. Placeholder only.
import { MessageSquare, Code2, Telescope, Hammer, Brain, Globe, Bot, PenTool, Terminal, Image as ImageIcon, Video } from 'lucide-react';
import { Eye, FileText, ImagePlus, Video as VideoIcon, TerminalSquare, Mail, Calendar, Workflow, Webhook, Search, Sparkles } from 'lucide-react';

export const MODELS = [
  { id: 'gpt', name: 'GPT-5', letter: 'G', grad: 'from-emerald-400 to-teal-500', speed: 4, reasoning: 5, context: '128K', desc: 'OpenAI flagship — balanced reasoning, coding & chat.' },
  { id: 'claude', name: 'Claude', letter: 'C', grad: 'from-orange-400 to-amber-500', speed: 4, reasoning: 5, context: '200K', desc: 'Anthropic — long context, nuanced writing & code.' },
  { id: 'gemini', name: 'Gemini', letter: 'G', grad: 'from-blue-400 to-indigo-500', speed: 5, reasoning: 4, context: '1M', desc: 'Google — multimodal, very fast, huge context.' },
  { id: 'deepseek', name: 'DeepSeek', letter: 'D', grad: 'from-cyan-400 to-blue-500', speed: 4, reasoning: 4, context: '64K', desc: 'Cost-efficient deep reasoning model.' },
  { id: 'llama', name: 'Llama', letter: 'L', grad: 'from-purple-400 to-fuchsia-500', speed: 4, reasoning: 4, context: '128K', desc: 'Meta open-source — self-hostable & tunable.' },
  { id: 'mistral', name: 'Mistral', letter: 'M', grad: 'from-rose-400 to-orange-500', speed: 5, reasoning: 4, context: '64K', desc: 'Efficient European model, great at tools.' },
  { id: 'grok', name: 'Grok', letter: 'X', grad: 'from-zinc-300 to-zinc-500', speed: 4, reasoning: 4, context: '128K', desc: 'xAI — real-time knowledge & wit.' },
  { id: 'local', name: 'Local Models', letter: '⌘', grad: 'from-violet-400 to-indigo-500', speed: 3, reasoning: 3, context: '32K', desc: 'Run models privately on your own hardware.' },
];

export const MODES = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'research', label: 'Research', icon: Telescope },
  { id: 'build', label: 'Build', icon: Hammer },
  { id: 'deep', label: 'Deep Think', icon: Brain },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'agent', label: 'Agent Mode', icon: Bot },
  { id: 'canvas', label: 'Canvas', icon: PenTool },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
];

export const TOOLS = [
  { name: 'Web Search', icon: Search, on: true },
  { name: 'Vision', icon: Eye, on: true },
  { name: 'File Analysis', icon: FileText, on: true },
  { name: 'Image Generation', icon: ImagePlus, on: false },
  { name: 'Video Generation', icon: VideoIcon, on: false },
  { name: 'Code Interpreter', icon: Terminal, on: true },
  { name: 'Browser', icon: Globe, on: false },
  { name: 'Terminal', icon: TerminalSquare, on: false },
  { name: 'Email', icon: Mail, on: false },
  { name: 'Calendar', icon: Calendar, on: false },
  { name: 'Workflow Builder', icon: Workflow, on: false },
  { name: 'API Requests', icon: Webhook, on: false },
];

export const PROMPT_CATEGORIES = [
  { id: 'coding', label: 'Coding', prompts: ['Debug this stack trace', 'Refactor this function', 'Write unit tests', 'Explain this codebase'] },
  { id: 'writing', label: 'Writing', prompts: ['Draft a blog post intro', 'Rewrite for clarity', 'Summarize this article', 'Generate a tagline'] },
  { id: 'business', label: 'Business', prompts: ['Build a go-to-market plan', 'Write a status update', 'Create a meeting agenda', 'SWOT analysis'] },
  { id: 'marketing', label: 'Marketing', prompts: ['Plan a launch campaign', 'Write ad copy', 'SEO keyword research', 'Email sequence'] },
  { id: 'education', label: 'Education', prompts: ['Explain like I’m 5', 'Create a study guide', 'Quiz me on this topic', 'Summarize a lecture'] },
  { id: 'automation', label: 'Automation', prompts: ['Automate my inbox', 'Build a daily report', 'Create a Slack digest', 'Schedule social posts'] },
  { id: 'research', label: 'Research', prompts: ['Market sizing analysis', 'Competitor teardown', 'Literature review', 'Trend report'] },
  { id: 'development', label: 'Development', prompts: ['Scaffold a React app', 'Design a REST API', 'Write a Dockerfile', 'Plan a migration'] },
];

export const SLASH_COMMANDS = [
  { cmd: '/summarize', desc: 'Summarize a document or thread' },
  { cmd: '/translate', desc: 'Translate text to any language' },
  { cmd: '/explain', desc: 'Explain a concept or code' },
  { cmd: '/image', desc: 'Generate an image' },
  { cmd: '/research', desc: 'Deep research with web search' },
  { cmd: '/code', desc: 'Write or review code' },
  { cmd: '/plan', desc: 'Build a step-by-step plan' },
];

export const FOLDERS = ['Work', 'Marketing', 'Engineering', 'Personal'];

export const CONVERSATIONS = [
  { id: 'c1', name: 'Product launch plan', folder: 'Work', pinned: true, time: '2m' },
  { id: 'c2', name: 'Q3 metrics analysis', folder: 'Work', pinned: false, time: '1h' },
  { id: 'c3', name: 'Brand voice guidelines', folder: 'Marketing', pinned: true, time: '3h' },
  { id: 'c4', name: 'Website copy ideas', folder: 'Marketing', pinned: false, time: '5h' },
  { id: 'c5', name: 'API migration guide', folder: 'Engineering', pinned: false, time: '1d' },
  { id: 'c6', name: 'Postgres perf tuning', folder: 'Engineering', pinned: false, time: '2d' },
  { id: 'c7', name: 'Weekend recipe ideas', folder: 'Personal', pinned: true, time: '3d' },
  { id: 'c8', name: 'Reading list 2026', folder: 'Personal', pinned: false, time: '5d' },
];

export const PROJECTS = [
  { id: 'p1', name: 'Atlas Platform', color: 'from-violet-500 to-indigo-500', chats: 12 },
  { id: 'p2', name: 'Growth Engine', color: 'from-cyan-500 to-blue-500', chats: 7 },
  { id: 'p3', name: 'Design System', color: 'from-fuchsia-500 to-pink-500', chats: 4 },
];

export const RECENT_FILES = [
  { id: 'f1', name: 'roadmap-2026.pdf', type: 'PDF', size: '1.2 MB' },
  { id: 'f2', name: 'quarterly-data.csv', type: 'CSV', size: '840 KB' },
  { id: 'f3', name: 'design-spec.fig', type: 'FIG', size: '3.4 MB' },
  { id: 'f4', name: 'transcript.mp3', type: 'MP3', size: '6.1 MB' },
];

export const SAVED_PROMPTS = [
  { id: 's1', name: 'Executive summary', cat: 'Business' },
  { id: 's2', name: 'Code review pass', cat: 'Coding' },
  { id: 's3', name: 'Cold outreach v3', cat: 'Marketing' },
];

export const AGENTS = [
  { id: 'a1', name: 'Research Analyst', grad: 'from-violet-500 to-indigo-600', status: 'active' },
  { id: 'a2', name: 'Support Copilot', grad: 'from-cyan-500 to-blue-600', status: 'idle' },
  { id: 'a3', name: 'Code Reviewer', grad: 'from-emerald-500 to-teal-600', status: 'active' },
  { id: 'a4', name: 'Growth Writer', grad: 'from-fuchsia-500 to-pink-600', status: 'idle' },
];

export const FAVORITES = [
  { id: 'fv1', name: 'Investor pitch draft' },
  { id: 'fv2', name: 'Onboarding flow spec' },
];

export const SUGGESTED_PROMPTS = [
  { icon: Sparkles, title: 'Draft a product launch plan', sub: 'Strategy & timeline' },
  { icon: Code2, title: 'Review my API for security issues', sub: 'Code review' },
  { icon: Telescope, title: 'Research the AI analytics market', sub: 'Web research' },
  { icon: FileText, title: 'Summarize the attached report', sub: 'File analysis' },
];

export const SEED_MESSAGES = [
  { id: 'm1', role: 'user', text: 'Create a 30-day launch plan for our AI analytics product.' },
  { id: 'm2', role: 'ai', text: "Here's a focused **30-day launch plan**:\n\n**Week 1 — Positioning**\nDefine your ICP, core promise, and proof points. Interview five design partners.\n\n**Week 2 — Activation**\nShip onboarding, example dashboards, and lifecycle emails.\n\n**Week 3 — Demand**\nLaunch a waitlist drop, founder LinkedIn posts, and a teardown.\n\n**Week 4 — Close**\nOffice hours, pricing page, and case study draft.\n\nHere’s the plan as a table:\n\n```table\nWeek|Focus|Key Output\n1|Positioning|ICP & proof points\n2|Activation|Onboarding + dashboards\n3|Demand|Waitlist + content\n4|Close|Office hours + case study\n```\n\nAnd a sample milestone:\n```js\nconst plan = {\n  weeks: 4,\n  goal: '10 paid pilots',\n  owner: 'Growth',\n};\n```" },
];

export const CONTEXT = {
  summary: 'The user is building a 30-day go-to-market plan for an AI analytics product. Focus areas: positioning, activation, demand, and closing pilots.',
  project: { name: 'Atlas Platform', progress: 62, chats: 12 },
  files: [
    { name: 'roadmap-2026.pdf', size: '1.2 MB' },
    { name: 'ICP-notes.md', size: '14 KB' },
  ],
  runningAgents: [
    { name: 'Research Analyst', task: 'Scanning 12 sources', progress: 64 },
    { name: 'Growth Writer', task: 'Drafting blog outline', progress: 28 },
  ],
  memory: [
    'Prefers concise, structured answers',
    'Works in B2B SaaS, growth stage',
    'Timezone: Europe/London',
  ],
  webResults: [
    { title: 'AI analytics market to hit $48B by 2030', src: 'Gartner', url: '#' },
    { title: 'Top 10 product launch frameworks', src: 'Lenny’s Newsletter', url: '#' },
    { title: 'Pricing page teardowns that convert', src: 'FirstRound', url: '#' },
  ],
  referencedDocs: [
    { name: 'roadmap-2026.pdf', page: 4 },
    { name: 'pricing-strategy.docx', page: 1 },
  ],
  modelInfo: { name: 'GPT-5', context: '128K tokens', speed: 'Fast', strength: 'Reasoning' },
};