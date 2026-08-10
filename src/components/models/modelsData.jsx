import {
  Activity, Boxes, Cloud, Cpu, DollarSign, Gauge, HardDrive, Layers, Plug, Server, Sparkles, Star, Zap,
} from 'lucide-react';

// ---------- Overview metrics ----------
export const OVERVIEW_METRICS = [
  { label: 'Connected Providers', value: '6', detail: '+2 this week', icon: Plug, grad: 'from-violet-500/20 to-indigo-500/10' },
  { label: 'Available Models', value: '48', detail: '12 new', icon: Layers, grad: 'from-cyan-500/20 to-blue-500/10' },
  { label: 'Monthly Requests', value: '1.2M', detail: '+18.4%', icon: Activity, grad: 'from-emerald-500/20 to-teal-500/10' },
  { label: 'Avg Response Time', value: '412ms', detail: '-34ms', icon: Gauge, grad: 'from-amber-500/20 to-orange-500/10' },
  { label: 'Estimated Cost', value: '$2,184', detail: '+6.1%', icon: DollarSign, grad: 'from-rose-500/20 to-pink-500/10' },
  { label: 'Local Models', value: '7', detail: '2 running', icon: HardDrive, grad: 'from-sky-500/20 to-indigo-500/10' },
  { label: 'Cloud Models', value: '38', detail: 'premium', icon: Cloud, grad: 'from-violet-500/20 to-fuchsia-500/10' },
  { label: 'Custom Models', value: '3', detail: 'fine-tuned', icon: Boxes, grad: 'from-lime-500/20 to-emerald-500/10' },
];

// ---------- Providers ----------
export const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', short: 'GPT', models: 14, speed: 'Fast', cost: '$$', connected: true, lastSync: '2m ago', grad: 'from-emerald-500 to-teal-400', logo: 'AI' },
  { id: 'anthropic', name: 'Anthropic', short: 'Claude', models: 8, speed: 'Medium', cost: '$$', connected: true, lastSync: '5m ago', grad: 'from-orange-500 to-amber-400', logo: 'CL' },
  { id: 'google', name: 'Google Gemini', short: 'Gemini', models: 9, speed: 'Fast', cost: '$', connected: true, lastSync: '1m ago', grad: 'from-blue-500 to-sky-400', logo: 'GG' },
  { id: 'mistral', name: 'Mistral', short: 'Mistral', models: 6, speed: 'Fast', cost: '$', connected: true, lastSync: '12m ago', grad: 'from-orange-400 to-red-400', logo: 'MI' },
  { id: 'meta', name: 'Meta Llama', short: 'Llama', models: 5, speed: 'Medium', cost: 'Free', connected: true, lastSync: '30m ago', grad: 'from-blue-600 to-indigo-500', logo: 'LL' },
  { id: 'deepseek', name: 'DeepSeek', short: 'DeepSeek', models: 4, speed: 'Medium', cost: '$', connected: true, lastSync: '8m ago', grad: 'from-violet-500 to-blue-400', logo: 'DS' },
  { id: 'xai', name: 'xAI', short: 'Grok', models: 3, speed: 'Fast', cost: '$$', connected: false, lastSync: '—', grad: 'from-zinc-400 to-zinc-600', logo: 'GR' },
  { id: 'cohere', name: 'Cohere', short: 'Cohere', models: 5, speed: 'Fast', cost: '$', connected: false, lastSync: '—', grad: 'from-cyan-500 to-blue-400', logo: 'CO' },
  { id: 'openrouter', name: 'OpenRouter', short: 'Auto', models: 200, speed: 'Auto', cost: '$', connected: false, lastSync: '—', grad: 'from-violet-500 to-purple-400', logo: 'OR' },
  { id: 'ollama', name: 'Ollama', short: 'Local', models: 12, speed: 'Local', cost: 'Free', connected: true, lastSync: 'now', grad: 'from-emerald-600 to-teal-500', logo: 'OL' },
  { id: 'azure', name: 'Azure OpenAI', short: 'Azure', models: 14, speed: 'Fast', cost: '$$', connected: false, lastSync: '—', grad: 'from-sky-500 to-blue-500', logo: 'AZ' },
  { id: 'bedrock', name: 'AWS Bedrock', short: 'Bedrock', models: 22, speed: 'Fast', cost: '$$', connected: false, lastSync: '—', grad: 'from-orange-500 to-amber-500', logo: 'AW' },
  { id: 'groq', name: 'Groq', short: 'Groq', models: 6, speed: 'Ultra', cost: '$', connected: false, lastSync: '—', grad: 'from-rose-500 to-red-500', logo: 'GQ' },
  { id: 'perplexity', name: 'Perplexity', short: 'Sonar', models: 4, speed: 'Fast', cost: '$', connected: false, lastSync: '—', grad: 'from-teal-500 to-cyan-500', logo: 'PP' },
  { id: 'together', name: 'Together AI', short: 'Together', models: 50, speed: 'Fast', cost: '$', connected: false, lastSync: '—', grad: 'from-indigo-500 to-violet-500', logo: 'TG' },
  { id: 'huggingface', name: 'HuggingFace', short: 'HF', models: 300, speed: 'Varies', cost: 'Free', connected: false, lastSync: '—', grad: 'from-yellow-400 to-amber-500', logo: 'HF' },
];

export const SIDEBAR_PROVIDERS = PROVIDERS.map(p => ({ id: p.id, name: p.name, short: p.short, connected: p.connected }));

// ---------- Models ----------
export const MODELS = [
  { id: 'gpt5', name: 'GPT-5', provider: 'OpenAI', context: '256K', speed: 4.5, quality: 5, reasoning: 5, coding: 5, vision: true, voice: true, image: false, tools: true, streaming: true, priceIn: 5, priceOut: 15, uses: ['Coding', 'Reasoning', 'Agents', 'Complex analysis'], status: 'Stable', grad: 'from-emerald-500 to-teal-400', featured: true },
  { id: 'gpt5-mini', name: 'GPT-5 mini', provider: 'OpenAI', context: '128K', speed: 5, quality: 4, reasoning: 4, coding: 4, vision: true, voice: true, image: false, tools: true, streaming: true, priceIn: 0.15, priceOut: 0.6, uses: ['Chat', 'Fast tasks', 'Cost-efficient'], status: 'Stable', grad: 'from-emerald-500 to-teal-400' },
  { id: 'claude-sonnet-46', name: 'Claude Sonnet 4.6', provider: 'Anthropic', context: '200K', speed: 4, quality: 5, reasoning: 5, coding: 5, vision: true, voice: false, image: false, tools: true, streaming: true, priceIn: 3, priceOut: 15, uses: ['Writing', 'Analysis', 'Coding', 'Long docs'], status: 'Stable', grad: 'from-orange-500 to-amber-400', featured: true },
  { id: 'claude-opus-48', name: 'Claude Opus 4.8', provider: 'Anthropic', context: '200K', speed: 3, quality: 5, reasoning: 5, coding: 5, vision: true, voice: false, image: false, tools: true, streaming: true, priceIn: 15, priceOut: 75, uses: ['Deep reasoning', 'Research', 'Complex writing'], status: 'Preview', grad: 'from-orange-600 to-red-400', featured: true },
  { id: 'gemini-25-pro', name: 'Gemini 2.5 Pro', provider: 'Google Gemini', context: '2M', speed: 4.5, quality: 5, reasoning: 5, coding: 4.5, vision: true, voice: true, image: true, tools: true, streaming: true, priceIn: 1.25, priceOut: 5, uses: ['Research', 'Multimodal', 'Long context', 'Vision'], status: 'Stable', grad: 'from-blue-500 to-sky-400', featured: true },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google Gemini', context: '1M', speed: 5, quality: 4, reasoning: 4, coding: 4, vision: true, voice: true, image: false, tools: true, streaming: true, priceIn: 0.075, priceOut: 0.3, uses: ['Fast chat', 'Web search', 'Cost-efficient'], status: 'Stable', grad: 'from-blue-500 to-cyan-400' },
  { id: 'mistral-large2', name: 'Mistral Large 2', provider: 'Mistral', context: '128K', speed: 4.5, quality: 4, reasoning: 4.5, coding: 4.5, vision: false, voice: false, image: false, tools: true, streaming: true, priceIn: 2, priceOut: 6, uses: ['Coding', 'Multilingual', 'Function calling'], status: 'Stable', grad: 'from-orange-400 to-red-400' },
  { id: 'llama-33-70b', name: 'Llama 3.3 70B', provider: 'Meta Llama', context: '128K', speed: 4, quality: 4, reasoning: 4, coding: 4, vision: false, voice: false, image: false, tools: true, streaming: true, priceIn: 0.59, priceOut: 0.79, uses: ['Open source', 'Self-host', 'Research'], status: 'Stable', grad: 'from-blue-600 to-indigo-500' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', context: '128K', speed: 3.5, quality: 4.5, reasoning: 5, coding: 4.5, vision: false, voice: false, image: false, tools: true, streaming: true, priceIn: 0.55, priceOut: 2.19, uses: ['Reasoning', 'Math', 'Coding'], status: 'Stable', grad: 'from-violet-500 to-blue-400', featured: true },
  { id: 'grok-4', name: 'Grok 4', provider: 'xAI', context: '256K', speed: 4.5, quality: 4.5, reasoning: 4.5, coding: 4, vision: true, voice: false, image: true, tools: true, streaming: true, priceIn: 5, priceOut: 15, uses: ['Real-time', 'Humor', 'X integration'], status: 'Stable', grad: 'from-zinc-400 to-zinc-600' },
  { id: 'cohere-command-r', name: 'Command R+', provider: 'Cohere', context: '128K', speed: 4, quality: 4, reasoning: 4, coding: 3.5, vision: false, voice: false, image: false, tools: true, streaming: true, priceIn: 2.5, priceOut: 10, uses: ['RAG', 'Enterprise', 'Citations'], status: 'Stable', grad: 'from-cyan-500 to-blue-400' },
  { id: 'llama-local-8b', name: 'Llama 3.1 8B (Local)', provider: 'Ollama', context: '32K', speed: 4, quality: 3.5, reasoning: 3.5, coding: 3.5, vision: false, voice: false, image: false, tools: true, streaming: true, priceIn: 0, priceOut: 0, uses: ['Private', 'Offline', 'Edge'], status: 'Installed', grad: 'from-emerald-600 to-teal-500' },
];

// ---------- Default model assignments ----------
export const DEFAULT_MODELS = [
  { task: 'General Chat', model: 'GPT-5', icon: Sparkles },
  { task: 'Coding', model: 'Claude Sonnet 4.6', icon: Cpu },
  { task: 'Research', model: 'Gemini 2.5 Pro', icon: Activity },
  { task: 'Writing', model: 'Claude Opus 4.8', icon: Sparkles },
  { task: 'Image Generation', model: 'Gemini 2.5 Pro', icon: Layers },
  { task: 'Voice', model: 'GPT-5', icon: Zap },
  { task: 'Agent Planning', model: 'Claude Sonnet 4.6', icon: Cpu },
  { task: 'Business Analysis', model: 'GPT-5', icon: Activity },
  { task: 'Workflow Automation', model: 'Claude Sonnet 4.6', icon: Server },
];

// ---------- Agent model assignments ----------
export const AGENT_ASSIGNMENTS = [
  { agent: 'Research Analyst', icon: 'RA', currentModel: 'Gemini 2.5 Pro', fallback: 'GPT-5', provider: 'Google Gemini', status: 'Active', grad: 'from-blue-500 to-sky-400' },
  { agent: 'Developer Agent', icon: 'DA', currentModel: 'Claude Sonnet 4.6', fallback: 'GPT-5', provider: 'Anthropic', status: 'Active', grad: 'from-orange-500 to-amber-400' },
  { agent: 'Content Writer', icon: 'CW', currentModel: 'Claude Opus 4.8', fallback: 'Claude Sonnet 4.6', provider: 'Anthropic', status: 'Active', grad: 'from-violet-500 to-fuchsia-400' },
  { agent: 'Data Analyst', icon: 'DA', currentModel: 'GPT-5', fallback: 'DeepSeek R1', provider: 'OpenAI', status: 'Active', grad: 'from-emerald-500 to-teal-400' },
  { agent: 'Support Agent', icon: 'SA', currentModel: 'GPT-5 mini', fallback: 'Gemini 3 Flash', provider: 'OpenAI', status: 'Idle', grad: 'from-cyan-500 to-blue-400' },
  { agent: 'Ops Agent', icon: 'OA', currentModel: 'Claude Sonnet 4.6', fallback: 'Mistral Large 2', provider: 'Anthropic', status: 'Active', grad: 'from-rose-500 to-pink-400' },
];

// ---------- Local models ----------
export const LOCAL_RUNTIMES = [
  { name: 'Ollama', status: 'Running', models: 7, memory: 14.2, gpu: 62, cpu: 28, grad: 'from-emerald-600 to-teal-500', icon: HardDrive },
  { name: 'LM Studio', status: 'Stopped', models: 3, memory: 0, gpu: 0, cpu: 0, grad: 'from-violet-500 to-indigo-500', icon: Server },
  { name: 'Custom GGUF', status: 'Running', models: 2, memory: 6.8, gpu: 41, cpu: 15, grad: 'from-amber-500 to-orange-500', icon: Cpu },
];

// ---------- API keys ----------
export const API_KEYS = [
  { provider: 'OpenAI', status: 'Active', lastUsed: '2m ago', requests: '482K', usage: '72%', limit: '5M req/mo', grad: 'from-emerald-500 to-teal-400' },
  { provider: 'Anthropic', status: 'Active', lastUsed: '5m ago', requests: '318K', usage: '54%', limit: '3M req/mo', grad: 'from-orange-500 to-amber-400' },
  { provider: 'Google Gemini', status: 'Active', lastUsed: '1m ago', requests: '256K', usage: '38%', limit: '4M req/mo', grad: 'from-blue-500 to-sky-400' },
  { provider: 'Mistral', status: 'Active', lastUsed: '12m ago', requests: '88K', usage: '19%', limit: '2M req/mo', grad: 'from-orange-400 to-red-400' },
  { provider: 'DeepSeek', status: 'Active', lastUsed: '8m ago', requests: '142K', usage: '31%', limit: '1M req/mo', grad: 'from-violet-500 to-blue-400' },
  { provider: 'Ollama', status: 'Local', lastUsed: 'now', requests: '12K', usage: '—', limit: 'Unlimited', grad: 'from-emerald-600 to-teal-500' },
];

// ---------- Marketplace categories ----------
export const MARKETPLACE_TABS = ['Featured', 'Trending', 'Newest', 'Fastest', 'Best Coding', 'Best Research', 'Free Models', 'Enterprise'];

export const MARKETPLACE_MODELS = [
  { name: 'GPT-5', provider: 'OpenAI', tag: 'Trending', desc: 'Flagship reasoning & coding model', grad: 'from-emerald-500 to-teal-400', badge: 'Premium' },
  { name: 'Claude Opus 4.8', provider: 'Anthropic', tag: 'Best Writing', desc: 'Deepest reasoning, long-form writing', grad: 'from-orange-600 to-red-400', badge: 'Premium' },
  { name: 'Gemini 2.5 Pro', provider: 'Google Gemini', tag: 'Best Research', desc: '2M context, multimodal, web search', grad: 'from-blue-500 to-sky-400', badge: 'Premium' },
  { name: 'DeepSeek R1', provider: 'DeepSeek', tag: 'Reasoning', desc: 'Open reasoning, math & code', grad: 'from-violet-500 to-blue-400', badge: 'Affordable' },
  { name: 'Llama 3.3 70B', provider: 'Meta Llama', tag: 'Free Models', desc: 'Open weights, self-hostable', grad: 'from-blue-600 to-indigo-500', badge: 'Free' },
  { name: 'GPT-5 mini', provider: 'OpenAI', tag: 'Fastest', desc: 'Ultra-fast, cost-efficient', grad: 'from-emerald-500 to-teal-400', badge: 'Affordable' },
  { name: 'Grok 4', provider: 'xAI', tag: 'Newest', desc: 'Real-time, X integration', grad: 'from-zinc-400 to-zinc-600', badge: 'Premium' },
  { name: 'Command R+', provider: 'Cohere', tag: 'Enterprise', desc: 'RAG with citations, enterprise-grade', grad: 'from-cyan-500 to-blue-400', badge: 'Enterprise' },
];

// ---------- Recommendations ----------
export const RECOMMENDATIONS = [
  { title: 'Use GPT-5 for coding', desc: 'Best balance of speed and code quality across your repos.', icon: Cpu, grad: 'from-emerald-500 to-teal-400' },
  { title: 'Use Claude for writing', desc: 'Opus 4.8 delivers the most natural long-form prose.', icon: Sparkles, grad: 'from-orange-500 to-amber-400' },
  { title: 'Use Gemini for research', desc: '2M context + web search ideal for deep research.', icon: Activity, grad: 'from-blue-500 to-sky-400' },
  { title: 'Use Ollama for local privacy', desc: 'Keep sensitive data on-device with Llama 3.1 8B.', icon: HardDrive, grad: 'from-emerald-600 to-teal-500' },
];

// ---------- Right panel ----------
export const RIGHT_ACTIVITY = [
  { text: 'Connected to Google Gemini', time: '1m ago', grad: 'from-blue-500 to-sky-400' },
  { text: 'GPT-5 handled 12K requests', time: '8m ago', grad: 'from-emerald-500 to-teal-400' },
  { text: 'Rotated Anthropic API key', time: '1h ago', grad: 'from-orange-500 to-amber-400' },
  { text: 'Installed Llama 3.1 8B locally', time: '3h ago', grad: 'from-emerald-600 to-teal-500' },
  { text: 'Claude Opus 4.8 set as default for Writing', time: '5h ago', grad: 'from-orange-600 to-red-400' },
];

export const RIGHT_NOTIFICATIONS = [
  { text: 'OpenAI usage at 72% of monthly limit', kind: 'warn' },
  { text: 'New model available: Grok 4', kind: 'info' },
  { text: 'DeepSeek R1 latency spike detected', kind: 'warn' },
  { text: 'Anthropic invoice ready', kind: 'info' },
];

export const QUICK_ACTIONS = [
  { label: 'Connect Provider', icon: Plug },
  { label: 'Add API Key', icon: Cpu },
  { label: 'Compare Models', icon: Layers },
  { label: 'Browse Marketplace', icon: Star },
];

// ---------- Benchmark data (for details drawer) ----------
export const BENCHMARKS = {
  'MMLU-Pro': 88, 'GPQA': 84, 'HumanEval': 96, 'MATH': 92, 'MUSR': 79, 'ARC-AGI': 63,
};

// ---------- Example prompts ----------
export const EXAMPLE_PROMPTS = [
  'Summarise this 200-page PDF into an executive brief.',
  'Build a React + Tailwind dashboard from this spec.',
  'Research the latest advances in transformer architectures.',
  'Draft a product launch announcement in our brand voice.',
];

// ---------- Best use cases ----------
export const BEST_USE_CASES = ['Complex reasoning', 'Multi-step coding', 'Long-context analysis', 'Agentic workflows', 'Multimodal understanding'];