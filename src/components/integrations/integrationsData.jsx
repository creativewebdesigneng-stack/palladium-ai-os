import {
  Brain, Sparkles, Bot, MessageSquare, Zap, Code2, Database, HardDrive, Megaphone, ShoppingCart, DollarSign, Headphones, BarChart3, Workflow, Shield, Share2, CreditCard, FolderKanban, Users, Plug, Cloud, Webhook, Lock, Key, FileCode, Globe, Server, GitBranch, Send, Bell, Mail, Calendar, FileText, Table, ShoppingBag, Linkedin, Facebook, Instagram, Twitter, Youtube, Github, Slack, MessagesSquare, Phone, Wifi, Boxes, Layers, Cpu, Network, Terminal, Settings, Activity, CheckCircle2, AlertTriangle, XCircle, Clock, PauseCircle, RefreshCw, Plus, Search, TrendingUp, Star, ArrowRight, ShieldCheck, KeyRound, Eye, Download, Upload, Trash2, MoreHorizontal, ExternalLink, Building2, Store, Banknote, Receipt, Briefcase, FileSpreadsheet, BookOpen, ListChecks, Mailbox, Radio, MessageCircle
} from 'lucide-react';

/* ===== Status ===== */
export const STATUS = {
  connected:    { label: 'Connected',        dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400', ring: 'ring-emerald-400/20' },
  disconnected: { label: 'Disconnected',     dot: 'bg-zinc-500',    badge: 'bg-zinc-500/10 text-zinc-400',       ring: 'ring-zinc-500/20' },
  attention:    { label: 'Needs Attention',  dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-400',     ring: 'ring-amber-400/20' },
  expired:      { label: 'Expired',          dot: 'bg-orange-400',  badge: 'bg-orange-400/10 text-orange-400',    ring: 'ring-orange-400/20' },
  error:        { label: 'Error',             dot: 'bg-red-400',     badge: 'bg-red-400/10 text-red-400',          ring: 'ring-red-400/20' },
  pending:      { label: 'Pending',           dot: 'bg-sky-400',     badge: 'bg-sky-400/10 text-sky-400',          ring: 'ring-sky-400/20' },
  disabled:     { label: 'Disabled',          dot: 'bg-zinc-600',    badge: 'bg-zinc-600/10 text-zinc-500',        ring: 'ring-zinc-600/20' },
};

/* ===== Tabs ===== */
export const TABS = ['Overview','All Integrations','AI Providers','Business','Developer','Communication','Storage','Databases','Automation','Custom APIs','Connected','Marketplace'];

/* ===== Categories ===== */
export const CATEGORIES = [
  { name: 'AI & Models',        icon: Brain,        grad: 'from-violet-500 to-indigo-500' },
  { name: 'Business',           icon: Briefcase,    grad: 'from-sky-500 to-blue-500' },
  { name: 'Communication',      icon: MessageSquare,grad: 'from-emerald-500 to-teal-500' },
  { name: 'Productivity',       icon: ListChecks,   grad: 'from-amber-500 to-orange-500' },
  { name: 'Developer Tools',    icon: Code2,        grad: 'from-zinc-500 to-slate-600' },
  { name: 'Cloud',              icon: Cloud,        grad: 'from-cyan-500 to-sky-500' },
  { name: 'Databases',          icon: Database,     grad: 'from-green-500 to-emerald-500' },
  { name: 'Storage',            icon: HardDrive,   grad: 'from-fuchsia-500 to-purple-500' },
  { name: 'Marketing',          icon: Megaphone,    grad: 'from-pink-500 to-rose-500' },
  { name: 'Sales',              icon: ShoppingCart, grad: 'from-blue-500 to-indigo-500' },
  { name: 'Finance',            icon: DollarSign,   grad: 'from-emerald-500 to-green-600' },
  { name: 'Customer Support',   icon: Headphones,   grad: 'from-orange-500 to-red-500' },
  { name: 'Analytics',          icon: BarChart3,    grad: 'from-indigo-500 to-purple-500' },
  { name: 'Automation',         icon: Workflow,     grad: 'from-violet-500 to-purple-500' },
  { name: 'Security',           icon: Shield,       grad: 'from-red-500 to-rose-600' },
  { name: 'Social Media',       icon: Share2,       grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Payments',           icon: CreditCard,   grad: 'from-emerald-500 to-teal-600' },
  { name: 'Project Management', icon: FolderKanban, grad: 'from-amber-500 to-yellow-500' },
  { name: 'CRM',               icon: Users,         grad: 'from-blue-500 to-cyan-500' },
  { name: 'File Management',    icon: FileText,     grad: 'from-teal-500 to-cyan-500' },
  { name: 'Custom APIs',        icon: Plug,         grad: 'from-violet-600 to-fuchsia-600' },
];

/* ===== Overview Metrics ===== */
export const OVERVIEW = [
  { label: 'Connected Integrations',   value: 24,         delta: '+3',      grad: 'from-violet-500 to-indigo-500', icon: Plug,      trend: [3,4,4,5,6,7,8,8,9,10] },
  { label: 'Available Integrations',    value: 142,        delta: '+12',     grad: 'from-sky-500 to-blue-500',       icon: Boxes,    trend: [80,90,95,100,110,118,122,130,135,142] },
  { label: 'Active Connections',        value: 19,         delta: '+2',      grad: 'from-emerald-500 to-teal-500',   icon: Activity, trend: [10,12,13,14,15,16,17,18,19,19] },
  { label: 'API Requests Today',        value: '48.2K',    delta: '+18%',    grad: 'from-amber-500 to-orange-500',   icon: Send,     trend: [20,25,30,28,35,40,42,45,48,48] },
  { label: 'Failed Requests',           value: 142,        delta: '-23',     grad: 'from-red-500 to-rose-500',       icon: XCircle,  trend: [40,38,35,30,28,25,20,18,15,14] },
  { label: 'Connected AI Providers',    value: 8,          delta: '+1',      grad: 'from-purple-500 to-violet-500',  icon: Brain,    trend: [4,5,5,6,6,7,7,7,8,8] },
  { label: 'Connected Business Apps',   value: 9,          delta: '+2',      grad: 'from-blue-500 to-cyan-500',      icon: Briefcase,trend: [5,6,6,7,7,8,8,9,9,9] },
  { label: 'Connected Developer Tools', value: 7,         delta: '+1',      grad: 'from-zinc-500 to-slate-600',      icon: Code2,    trend: [3,4,4,5,5,6,6,7,7,7] },
];

/* ===== Integration helper ===== */
function make(id, name, category, grad, icon, status, models, capabilities, desc, metrics, connectedDate, lastUsed) {
  return { id, name, category, grad, icon, status, models: models || [], capabilities: capabilities || [], desc, metrics: metrics || {}, connectedDate, lastUsed };
}

/* ===== AI Providers ===== */
export const AI_PROVIDERS = [
  make('openai','OpenAI','AI & Models','from-emerald-500 to-teal-500',Sparkles,'connected',['GPT-5','GPT-5 mini','o3','DALL·E 4','Whisper','Embeddings'],['Text Generation','Image Generation','Audio Transcription','Function Calling','Vision','Code'],'Frontier multimodal models for agents and workflows.',{ requests: 12420, success: 99.4, latency: 420 },'2025-12-04','2 min ago'),
  make('anthropic','Anthropic','AI & Models','from-orange-500 to-amber-500',Brain,'connected',['Claude Opus 4.8','Claude Sonnet 5','Claude Haiku'],['Text Generation','Long Context','Vision','Tool Use','Computer Use'],'Claude family — safe, helpful and honest reasoning.',{ requests: 8210, success: 99.1, latency: 510 },'2025-11-22','5 min ago'),
  make('gemini','Google Gemini','AI & Models','from-blue-500 to-sky-500',Sparkles,'connected',['Gemini 3 Flash','Gemini 3.1 Pro','Gemini 2.5'],['Text Generation','Web Search','Vision','Video','Code'],`Google's multimodal AI with built-in web grounding.`,{ requests: 6440, success: 98.7, latency: 380 },'2025-12-10','1 min ago'),
  make('mistral','Mistral AI','AI & Models','from-amber-500 to-orange-500',Bot,'connected',['Mistral Large','Codestral','Pixtral','Embed'],['Text Generation','Code','Vision','Function Calling'],'Open-weight and commercial European models.',{ requests: 2180, success: 99.0, latency: 350 },'2025-10-15','12 min ago'),
  make('meta','Meta','AI & Models','from-blue-500 to-indigo-500',Brain,'connected',['Llama 4','Llama 4 Scout','Llama 4 Maverick'],['Text Generation','Code','Vision','Tool Use'],'Open-source Llama models for self-hosting.',{ requests: 1560, success: 99.3, latency: 290 },'2025-09-20','1h ago'),
  make('deepseek','DeepSeek','AI & Models','from-violet-500 to-purple-500',Sparkles,'connected',['DeepSeek V3','DeepSeek R1','DeepSeek Coder'],['Text Generation','Reasoning','Code'],'Cost-efficient reasoning and coding models.',{ requests: 3320, success: 98.2, latency: 460 },'2025-11-02','3h ago'),
  make('xai','xAI','AI & Models','from-zinc-500 to-slate-600',Sparkles,'pending',['Grok 4','Grok 4 Heavy'],['Text Generation','Reasoning','Vision','Web Search'],'Real-time knowledge and humorous reasoning.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('cohere','Cohere','AI & Models','from-cyan-500 to-blue-500',Bot,'connected',['Command A','Command R+','Embed v3','Rerank'],['Text Generation','Embeddings','Reranking','RAG'],'Enterprise-grade language and retrieval models.',{ requests: 1820, success: 99.5, latency: 240 },'2025-08-14','20 min ago'),
  make('groq','Groq','AI & Models','from-orange-500 to-red-500',Zap,'connected',['Llama 4 Scout','Mixtral','Gemma 3'],['Ultra-fast Inference','Text Generation','Vision'],'LPU-powered ultra-low-latency inference.',{ requests: 5210, success: 99.8, latency: 90 },'2025-12-01','30s ago'),
  make('openrouter','OpenRouter','AI & Models','from-violet-500 to-indigo-500',Network,'connected',['300+ Models'],['Unified Routing','Auto Fallback','Model Routing'],'Single API for hundreds of models.',{ requests: 2980, success: 98.9, latency: 420 },'2025-07-19','8 min ago'),
  make('ollama','Ollama','AI & Models','from-zinc-500 to-neutral-600',Terminal,'connected',['Llama 4','Qwen 3','Mistral','Phi 4'],['Local Inference','Model Library','Offline'],'Run open models locally with one command.',{ requests: 410, success: 100, latency: 180 },'2025-06-30','2h ago'),
  make('lmstudio','LM Studio','AI & Models','from-indigo-500 to-purple-500',Cpu,'disconnected',['Local Models'],['Local Inference','OpenAI API','Model Discovery'],'Discover, download and run local LLMs.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('hf','Hugging Face','AI & Models','from-amber-500 to-yellow-500',Sparkles,'connected',['400K+ Models'],['Inference API','Datasets','Spaces','Embeddings'],'The platform for open ML models.',{ requests: 1450, success: 98.4, latency: 510 },'2025-10-08','15 min ago'),
  make('azureoai','Azure OpenAI','AI & Models','from-sky-500 to-blue-500',Cloud,'connected',['GPT-5','o3','DALL·E 4','Whisper'],['Enterprise Inference','Fine-tuning','Data Residency'],'Enterprise OpenAI with regional compliance.',{ requests: 3120, success: 99.6, latency: 430 },'2025-09-12','4 min ago'),
  make('bedrock','AWS Bedrock','AI & Models','from-orange-500 to-amber-500',Cloud,'attention',['Claude','Llama','Titan','Mistral'],['Managed Inference','Guardrails','Knowledge Bases'],'Serverless multi-model inference on AWS.',{ requests: 2870, success: 97.2, latency: 480 },'2025-08-25','6 min ago'),
];

/* ===== Business ===== */
export const BUSINESS = [
  make('salesforce','Salesforce','Business','from-sky-500 to-blue-500',Briefcase,'connected',[],['Read Records','Create Leads','Update Opportunities','Manage Pipeline'],'CRM platform for sales and customer data.',{ requests: 1820, success: 99.2, latency: 620 },'2025-10-02','1h ago'),
  make('hubspot','HubSpot','Business','from-orange-500 to-red-500',Briefcase,'connected',[],['Marketing Automation','CRM','Email','Analytics'],'Inbound marketing, sales and service suite.',{ requests: 980, success: 99.5, latency: 410 },'2025-09-18','3h ago'),
  make('dynamics','Microsoft Dynamics','Business','from-blue-500 to-indigo-500',Briefcase,'disconnected',[],['CRM','ERP','Customer Insights'],`Microsoft's intelligent business applications.`,{ requests: 0, success: 0, latency: 0 },null,null),
  make('quickbooks','QuickBooks','Finance','from-emerald-500 to-green-500',Receipt,'connected',[],['Read Invoices','Create Expenses','Reports'],'Small business accounting and payroll.',{ requests: 420, success: 99.8, latency: 350 },'2025-11-10','5h ago'),
  make('xero','Xero','Finance','from-sky-500 to-cyan-500',Banknote,'connected',[],['Read Invoices','Bank Feeds','Reports'],'Cloud accounting for small businesses.',{ requests: 310, success: 99.6, latency: 380 },'2025-10-22','8h ago'),
  make('shopify','Shopify','Business','from-green-500 to-emerald-500',Store,'connected',[],['Products','Orders','Customers','Fulfilment'],'E-commerce platform and storefront.',{ requests: 2210, success: 99.1, latency: 540 },'2025-07-14','20 min ago'),
  make('stripe','Stripe','Payments','from-violet-500 to-indigo-500',CreditCard,'connected',[],['Payments','Subscriptions','Invoices','Webhooks'],'Online payment processing and billing.',{ requests: 3680, success: 99.9, latency: 280 },'2025-06-01','2 min ago'),
  make('paypal','PayPal','Payments','from-blue-500 to-sky-500',CreditCard,'disconnected',[],['Payments','Refunds','Payouts'],'Global digital payments and wallet.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('zendesk','Zendesk','Customer Support','from-emerald-500 to-teal-500',Headphones,'connected',[],['Tickets','Chat','Knowledge Base','Reports'],'Customer service and support ticketing.',{ requests: 1140, success: 99.3, latency: 460 },'2025-08-30','1h ago'),
  make('intercom','Intercom','Customer Support','from-blue-500 to-indigo-500',MessagesSquare,'connected',[],['Tickets','Live Chat','Messages','Inbox'],'Customer messaging and support platform.',{ requests: 860, success: 99.4, latency: 420 },'2025-09-05','2h ago'),
  make('servicenow','ServiceNow','Business','from-green-500 to-teal-500',Briefcase,'pending',[],['Incidents','Change','CMDB','Workflows'],'Enterprise IT service management.',{ requests: 0, success: 0, latency: 0 },null,null),
];

/* ===== Communication ===== */
export const COMMUNICATION = [
  make('slack','Slack','Communication','from-violet-500 to-fuchsia-500',Slack,'connected',[],['Send Messages','Read Messages','Create Notifications','Channels'],'Team messaging and collaboration.',{ requests: 4120, success: 99.7, latency: 220 },'2025-05-12','1 min ago'),
  make('discord','Discord','Communication','from-indigo-500 to-purple-500',MessageCircle,'connected',[],['Send Messages','Read Messages','Voice','Webhooks'],'Community chat with servers and channels.',{ requests: 680, success: 99.1, latency: 260 },'2025-08-20','30 min ago'),
  make('teams','Microsoft Teams','Communication','from-blue-500 to-indigo-500',Users,'connected',[],['Send Messages','Read Messages','Meetings','Files'],'Enterprise collaboration and meetings.',{ requests: 1920, success: 99.4, latency: 340 },'2025-07-08','15 min ago'),
  make('gmail','Gmail','Communication','from-red-500 to-rose-500',Mail,'connected',[],['Read Emails','Send Emails','Labels','Attachments'],'Google email with AI-powered drafting.',{ requests: 3210, success: 99.8, latency: 310 },'2025-04-18','5 min ago'),
  make('outlook','Outlook','Communication','from-blue-500 to-sky-500',Mail,'connected',[],['Read Emails','Send Emails','Calendar','Contacts'],'Microsoft email and calendar.',{ requests: 1840, success: 99.2, latency: 380 },'2025-06-22','40 min ago'),
  make('twilio','Twilio','Communication','from-red-500 to-orange-500',Phone,'disconnected',[],['SMS','Voice','WhatsApp','Verify'],'Programmable communications API.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('whatsapp','WhatsApp','Communication','from-green-500 to-emerald-500',MessageSquare,'connected',[],['Send Messages','Read Messages','Templates','Media'],'Business messaging at scale.',{ requests: 920, success: 99.5, latency: 290 },'2025-09-14','1h ago'),
  make('telegram','Telegram','Communication','from-sky-500 to-blue-500',Send,'connected',[],['Send Messages','Read Messages','Bots','Channels'],'Cloud messaging with bot API.',{ requests: 410, success: 99.9, latency: 180 },'2025-10-10','2h ago'),
];

/* ===== Productivity ===== */
export const PRODUCTIVITY = [
  make('notion','Notion','Productivity','from-zinc-500 to-slate-600',FileText,'connected',[],['Read Pages','Create Pages','Databases','Comments'],'All-in-one workspace and docs.',{ requests: 1620, success: 99.4, latency: 380 },'2025-07-01','10 min ago'),
  make('gworkspace','Google Workspace','Productivity','from-amber-500 to-red-500',Layers,'connected',[],['Docs','Sheets','Slides','Drive'],'Google productivity suite.',{ requests: 2410, success: 99.7, latency: 320 },'2025-05-20','5 min ago'),
  make('gcal','Google Calendar','Productivity','from-blue-500 to-sky-500',Calendar,'connected',[],['Create Events','Read Events','Free/Busy','Reminders'],'Calendar scheduling and events.',{ requests: 880, success: 99.6, latency: 260 },'2025-06-15','3h ago'),
  make('gdrive','Google Drive','Storage','from-amber-500 to-yellow-500',HardDrive,'connected',[],['Upload','Download','Share','Search'],'Cloud file storage and sharing.',{ requests: 3120, success: 99.8, latency: 240 },'2025-04-10','2 min ago'),
  make('m365','Microsoft 365','Productivity','from-blue-500 to-indigo-500',Layers,'connected',[],['Word','Excel','PowerPoint','OneNote'],'Microsoft productivity suite.',{ requests: 1980, success: 99.1, latency: 410 },'2025-06-08','1h ago'),
  make('dropbox','Dropbox','Storage','from-sky-500 to-blue-500',HardDrive,'connected',[],['Upload','Download','Share','Sync'],'File storage and sharing.',{ requests: 1120, success: 99.5, latency: 300 },'2025-08-12','3h ago'),
  make('onedrive','OneDrive','Storage','from-blue-500 to-cyan-500',HardDrive,'connected',[],['Upload','Download','Share','Sync'],'Microsoft cloud storage.',{ requests: 980, success: 99.3, latency: 350 },'2025-07-22','5h ago'),
  make('box','Box','Storage','from-sky-500 to-indigo-500',HardDrive,'disconnected',[],['Upload','Download','Share','Sign'],'Enterprise content management.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('airtable','Airtable','Productivity','from-amber-500 to-orange-500',Table,'connected',[],['Bases','Records','Views','Automations'],'Flexible relational database spreadsheets.',{ requests: 720, success: 99.6, latency: 330 },'2025-09-02','2h ago'),
  make('clickup','ClickUp','Project Management','from-violet-500 to-fuchsia-500',ListChecks,'connected',[],['Tasks','Docs','Goals','Time'],'Project management platform.',{ requests: 1240, success: 99.2, latency: 410 },'2025-08-05','1h ago'),
  make('asana','Asana','Project Management','from-rose-500 to-pink-500',ListChecks,'disconnected',[],['Tasks','Projects','Goals','Portfolios'],'Work management and tracking.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('monday','Monday.com','Project Management','from-amber-500 to-orange-500',ListChecks,'disconnected',[],['Boards','Items','Automations','Dashboards'],'Visual work OS.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('jira','Jira','Project Management','from-blue-500 to-indigo-500',FolderKanban,'connected',[],['Issues','Sprints','Boards','Releases'],'Agile project tracking.',{ requests: 2180, success: 99.0, latency: 460 },'2025-05-28','20 min ago'),
  make('linear','Linear','Project Management','from-violet-500 to-purple-500',GitBranch,'connected',[],['Issues','Projects','Cycles','Roadmaps'],'Streamlined issue tracking.',{ requests: 1420, success: 99.7, latency: 220 },'2025-09-20','15 min ago'),
];

/* ===== Developer Tools ===== */
export const DEVELOPER = [
  make('github','GitHub','Developer Tools','from-zinc-500 to-slate-700',Github,'connected',[],['Repositories','Issues','Pull Requests','Actions','Code Search'],'Code hosting and CI/CD.',{ requests: 4210, success: 99.6, latency: 290 },'2025-03-14','30s ago'),
  make('gitlab','GitLab','Developer Tools','from-orange-500 to-red-500',GitBranch,'connected',[],['Repositories','Merge Requests','Pipelines','Issues'],'DevOps platform with CI/CD.',{ requests: 980, success: 99.3, latency: 360 },'2025-07-18','1h ago'),
  make('bitbucket','Bitbucket','Developer Tools','from-blue-500 to-sky-500',GitBranch,'disconnected',[],['Repositories','Pull Requests','Pipelines'],'Git solution for Atlassian teams.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('docker','Docker','Developer Tools','from-sky-500 to-blue-500',Boxes,'connected',[],['Containers','Images','Registries','Compose'],'Container platform for builds.',{ requests: 620, success: 99.8, latency: 200 },'2025-08-10','3h ago'),
  make('vercel','Vercel','Developer Tools','from-zinc-500 to-neutral-600',Terminal,'connected',[],['Deployments','Builds','Logs','Edge Functions'],'Frontend deployment platform.',{ requests: 1140, success: 99.9, latency: 180 },'2025-06-25','10 min ago'),
  make('cloudflare','Cloudflare','Cloud','from-orange-500 to-amber-500',Globe,'connected',[],['DNS','Workers','R2','Pages','Cache'],'Edge network and security.',{ requests: 2810, success: 99.7, latency: 120 },'2025-05-02','5 min ago'),
  make('aws','AWS','Cloud','from-orange-500 to-amber-500',Cloud,'connected',[],['S3','Lambda','EC2','Bedrock','RDS'],'Amazon Web Services.',{ requests: 3420, success: 99.2, latency: 320 },'2025-02-18','2 min ago'),
  make('azure','Azure','Cloud','from-sky-500 to-blue-500',Cloud,'connected',[],['Functions','Storage','OpenAI','Cosmos DB'],'Microsoft Azure cloud.',{ requests: 1980, success: 99.4, latency: 360 },'2025-04-05','8 min ago'),
  make('gcloud','Google Cloud','Cloud','from-blue-500 to-sky-500',Cloud,'connected',[],['Functions','Storage','Vertex AI','BigQuery'],'Google Cloud Platform.',{ requests: 1620, success: 99.1, latency: 340 },'2025-04-12','15 min ago'),
  make('supabase','Supabase','Developer Tools','from-emerald-500 to-green-500',Database,'connected',[],['Database','Auth','Storage','Realtime','Edge'],'Open-source Firebase alternative.',{ requests: 1240, success: 99.8, latency: 210 },'2025-07-30','1h ago'),
  make('firebase','Firebase','Developer Tools','from-amber-500 to-yellow-500',Database,'disconnected',[],['Firestore','Auth','Functions','Hosting'],'Google app development platform.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('postman','Postman','Developer Tools','from-orange-500 to-amber-500',Terminal,'disconnected',[],['Collections','Environments','Tests','Mock Servers'],'API development and testing.',{ requests: 0, success: 0, latency: 0 },null,null),
];

/* ===== Databases ===== */
export const DATABASES = [
  make('postgres','PostgreSQL','Databases','from-blue-500 to-indigo-500',Database,'connected',[],['Connect','Test','View Schema','Query'],'Powerful open-source relational DB.',{ requests: 5120, success: 99.9, latency: 80 },'2025-03-01','10s ago'),
  make('mysql','MySQL','Databases','from-sky-500 to-cyan-500',Database,'connected',[],['Connect','Test','View Schema','Query'],'Popular relational database.',{ requests: 2810, success: 99.8, latency: 70 },'2025-04-20','1 min ago'),
  make('mongo','MongoDB','Databases','from-green-500 to-emerald-500',Database,'connected',[],['Connect','Test','View Schema','Aggregate'],'Document database for modern apps.',{ requests: 1980, success: 99.7, latency: 90 },'2025-05-10','30s ago'),
  make('redis','Redis','Databases','from-red-500 to-rose-500',Database,'connected',[],['Connect','Test','Cache','Pub/Sub'],'In-memory data store.',{ requests: 8210, success: 99.9, latency: 15 },'2025-02-14','1s ago'),
  make('supabasedb','Supabase DB','Databases','from-emerald-500 to-green-500',Database,'connected',[],['Connect','Test','View Schema','Realtime'],'Managed Postgres with realtime.',{ requests: 1240, success: 99.8, latency: 85 },'2025-07-30','2 min ago'),
  make('firebase-db','Firebase Firestore','Databases','from-amber-500 to-yellow-500',Database,'disconnected',[],['Connect','Test','Query','Realtime'],'NoSQL document database.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('planetscale','PlanetScale','Databases','from-violet-500 to-purple-500',Database,'disconnected',[],['Connect','Test','Branch','Deploy'],'Serverless MySQL platform.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('neon','Neon','Databases','from-cyan-500 to-sky-500',Database,'connected',[],['Connect','Test','Branch','Scale'],'Serverless Postgres platform.',{ requests: 680, success: 99.6, latency: 95 },'2025-09-12','5 min ago'),
  make('rds','Amazon RDS','Databases','from-amber-500 to-orange-500',Database,'attention',[],['Connect','Test','Backup','Replicate'],'Managed relational database service.',{ requests: 1420, success: 97.4, latency: 110 },'2025-06-18','12 min ago'),
];

/* ===== Storage ===== */
export const STORAGE = [
  make('gdrive2','Google Drive','Storage','from-amber-500 to-yellow-500',HardDrive,'connected',[],['Upload','Download','Share','Search'],'Cloud file storage.',{ requests: 3120, success: 99.8, latency: 240 },'2025-04-10','2 min ago'),
  make('dropbox2','Dropbox','Storage','from-sky-500 to-blue-500',HardDrive,'connected',[],['Upload','Download','Share','Sync'],'File storage and sharing.',{ requests: 1120, success: 99.5, latency: 300 },'2025-08-12','3h ago'),
  make('onedrive2','OneDrive','Storage','from-blue-500 to-cyan-500',HardDrive,'connected',[],['Upload','Download','Share','Sync'],'Microsoft cloud storage.',{ requests: 980, success: 99.3, latency: 350 },'2025-07-22','5h ago'),
  make('s3','Amazon S3','Storage','from-orange-500 to-amber-500',HardDrive,'connected',[],['Upload','Download','Buckets','Lifecycle'],'Object storage at scale.',{ requests: 4210, success: 99.9, latency: 180 },'2025-02-20','1 min ago'),
  make('r2','Cloudflare R2','Storage','from-orange-500 to-amber-500',HardDrive,'connected',[],['Upload','Download','Buckets','Egress-free'],'Zero-egress object storage.',{ requests: 1820, success: 99.8, latency: 110 },'2025-05-02','4 min ago'),
  make('blob','Azure Blob Storage','Storage','from-sky-500 to-blue-500',HardDrive,'connected',[],['Upload','Download','Containers','Tiers'],'Microsoft object storage.',{ requests: 1240, success: 99.6, latency: 220 },'2025-04-05','20 min ago'),
  make('box2','Box','Storage','from-sky-500 to-indigo-500',HardDrive,'disconnected',[],['Upload','Download','Share','Sign'],'Enterprise content management.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('nas','NAS','Storage','from-zinc-500 to-slate-600',Server,'connected',[],['Mount','Read','Write','Backup'],'Network-attached storage.',{ requests: 420, success: 99.2, latency: 60 },'2025-08-01','1h ago'),
  make('local','Local Storage','Storage','from-violet-500 to-purple-500',HardDrive,'connected',[],['Read','Write','Mount'],'On-premise local filesystem.',{ requests: 210, success: 100, latency: 10 },'2025-01-10','30s ago'),
];

/* ===== Social Media ===== */
export const SOCIAL = [
  make('facebook','Facebook','Social Media','from-blue-500 to-indigo-500',Facebook,'connected',[],['Publish','Read Posts','Schedule','Analytics'],'Social network and pages.',{ requests: 820, success: 99.1, latency: 420 },'2025-08-20','1h ago'),
  make('instagram','Instagram','Social Media','from-fuchsia-500 to-pink-500',Instagram,'connected',[],['Publish','Read Posts','Schedule','Monitor Mentions'],'Photo and video social platform.',{ requests: 1120, success: 98.8, latency: 450 },'2025-07-14','20 min ago'),
  make('linkedin','LinkedIn','Social Media','from-blue-500 to-sky-500',Linkedin,'connected',[],['Publish','Read Posts','Analytics','Lead Gen'],'Professional networking.',{ requests: 680, success: 99.4, latency: 380 },'2025-06-12','2h ago'),
  make('x','X','Social Media','from-zinc-500 to-slate-600',Twitter,'disconnected',[],['Publish','Read Posts','Monitor Mentions'],'Real-time social posts.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('tiktok','TikTok','Social Media','from-zinc-500 to-neutral-700',Sparkles,'connected',[],['Publish','Read','Schedule','Analytics'],'Short-form video platform.',{ requests: 540, success: 97.5, latency: 520 },'2025-09-10','3h ago'),
  make('youtube','YouTube','Social Media','from-red-500 to-rose-500',Youtube,'connected',[],['Upload','Publish','Analytics','Comments'],'Video sharing platform.',{ requests: 410, success: 99.2, latency: 480 },'2025-05-18','5h ago'),
  make('reddit','Reddit','Social Media','from-orange-500 to-red-500',MessagesSquare,'disconnected',[],['Read','Post','Monitor','Moderate'],'Community discussion forums.',{ requests: 0, success: 0, latency: 0 },null,null),
];

/* ===== Automation ===== */
export const AUTOMATION = [
  make('zapier','Zapier','Automation','from-orange-500 to-red-500',Zap,'connected',[],['Workflows','Triggers','Actions','5000+ Apps'],'Connect 5000+ apps with no code.',{ requests: 1820, success: 99.4, latency: 320 },'2025-06-14','30 min ago'),
  make('make','Make','Automation','from-violet-500 to-purple-500',Workflow,'connected',[],['Scenarios','Triggers','Actions','Routing'],'Visual automation platform.',{ requests: 980, success: 99.1, latency: 410 },'2025-07-20','1h ago'),
  make('n8n','n8n','Automation','from-pink-500 to-rose-500',Workflow,'connected',[],['Workflows','Triggers','Actions','Self-host'],'Open-source workflow automation.',{ requests: 620, success: 99.6, latency: 180 },'2025-08-02','2h ago'),
  make('ifttt','IFTTT','Automation','from-sky-500 to-blue-500',Zap,'disconnected',[],['Applets','Triggers','Actions'],'Simple if-this-then-that automation.',{ requests: 0, success: 0, latency: 0 },null,null),
  make('pipedream','Pipedream','Automation','from-zinc-500 to-slate-600',Workflow,'connected',[],['Workflows','Sources','Code','Triggers'],'Developer-focused automation.',{ requests: 410, success: 99.7, latency: 240 },'2025-09-18','3h ago'),
];

/* ===== All integrations combined ===== */
export const ALL_INTEGRATIONS = [
  ...AI_PROVIDERS, ...BUSINESS, ...COMMUNICATION, ...PRODUCTIVITY, ...DEVELOPER, ...DATABASES, ...STORAGE, ...SOCIAL, ...AUTOMATION,
];

/* ===== Custom API form fields ===== */
export const AUTH_TYPES = ['API Key','Bearer Token','OAuth 2.0','Basic Authentication','No Auth'];
export const CUSTOM_API_DEFAULTS = { name: '', desc: '', baseUrl: '', authType: 'API Key', headers: '', docsUrl: '' };

/* ===== Marketplace ===== */
export const MARKETPLACE_CATS = ['Popular','Trending','New','AI','Business','Developer','Marketing','Productivity','Enterprise'];
export const MARKETPLACE_ITEMS = [
  make('perplexity','Perplexity AI','AI & Models','from-violet-500 to-indigo-500',Search,'disconnected',['Sonar','Sonar Pro'],['Answer Engine','Web Search','Citations'],'AI answer engine with citations.',{},null,null),
  make('together','Together AI','AI & Models','from-indigo-500 to-purple-500',Sparkles,'disconnected',['Llama','Qwen','DeepSeek'],['Inference','Fine-tuning','Embeddings'],'Open-source model hosting.',{},null,null),
  make('figure','Figure','AI & Models','from-zinc-500 to-slate-600',Bot,'disconnected',['Figure 02'],['Robotics','Vision','Manipulation'],'Humanoid robotics platform.',{},null,null),
  make('elevenlabs','ElevenLabs','AI & Models','from-zinc-500 to-neutral-700',Radio,'disconnected',['TTS','Voice Cloner'],['Text-to-Speech','Voice Cloning','Dubbing'],'Realistic AI voice generation.',{},null,null),
  make('runway','Runway','AI & Models','from-orange-500 to-amber-500',Sparkles,'disconnected',['Gen-4'],['Video Generation','Image','Editing'],'AI video and image generation.',{},null,null),
  make('sentry','Sentry','Developer Tools','from-violet-500 to-purple-500',ShieldCheck,'disconnected',[],['Error Tracking','Releases','Performance'],'Error monitoring and tracing.',{},null,null),
  make('mailchimp','Mailchimp','Marketing','from-amber-500 to-yellow-500',Mailbox,'disconnected',[],['Email Campaigns','Audience','Automation'],'Email marketing platform.',{},null,null),
  make('klaviyo','Klaviyo','Marketing','from-green-500 to-emerald-500',Mailbox,'disconnected',[],['Email','SMS','Segmentation','Analytics'],'Marketing automation for ecommerce.',{},null,null),
  make('gorgias','Gorgias','Customer Support','from-emerald-500 to-teal-500',Headphones,'disconnected',[],['Tickets','Chat','Automation'],'Ecommerce helpdesk.',{},null,null),
  make('calendly','Calendly','Productivity','from-blue-500 to-indigo-500',Calendar,'disconnected',[],['Scheduling','Meetings','Routing'],'Automated scheduling.',{},null,null),
  make('attio','Attio','CRM','from-violet-500 to-fuchsia-500',Users,'disconnected',[],['Records','Lists','Workflows'],'Modern CRM workspace.',{},null,null),
  make('polar','Polar','Developer Tools','from-violet-500 to-purple-500',Star,'disconnected',[],['Issues','Releases','Funding'],'GitHub funding and issues.',{},null,null),
];

/* ===== Permissions ===== */
export const PERMISSIONS = [
  { name: 'Read',      icon: Eye,      grad: 'from-sky-500 to-blue-500',       sensitive: false },
  { name: 'Write',     icon: FileCode,grad: 'from-violet-500 to-indigo-500',   sensitive: false },
  { name: 'Create',    icon: Plus,    grad: 'from-emerald-500 to-teal-500',    sensitive: false },
  { name: 'Update',    icon: RefreshCw,grad:'from-amber-500 to-orange-500',     sensitive: false },
  { name: 'Delete',    icon: Trash2, grad: 'from-red-500 to-rose-500',         sensitive: true  },
  { name: 'Send',      icon: Send,   grad: 'from-cyan-500 to-sky-500',         sensitive: true  },
  { name: 'Publish',   icon: Megaphone,grad:'from-fuchsia-500 to-pink-500',    sensitive: true  },
  { name: 'Download',  icon: Download,grad:'from-blue-500 to-indigo-500',      sensitive: false },
  { name: 'Upload',    icon: Upload, grad: 'from-teal-500 to-cyan-500',        sensitive: false },
  { name: 'Execute',   icon: Terminal,grad:'from-orange-500 to-red-500',       sensitive: true  },
  { name: 'Manage',    icon: Settings,grad:'from-zinc-500 to-slate-600',       sensitive: true  },
];

/* ===== Agent Access ===== */
export const AGENT_ACCESS = [
  { agent: 'Marketing Agent',   avatar: 'MA', grad: 'from-fuchsia-500 to-pink-500',   integration: 'instagram',  enabled: true,  perms: ['Publish','Read Posts','Analytics'] },
  { agent: 'Sales Agent',       avatar: 'SA', grad: 'from-blue-500 to-indigo-500',     integration: 'salesforce',enabled: true,  perms: ['Read','Create','Update'] },
  { agent: 'Support Agent',     avatar: 'SP', grad: 'from-emerald-500 to-teal-500',   integration: 'zendesk',    enabled: true,  perms: ['Read','Create','Update'] },
  { agent: 'Developer Agent',   avatar: 'DA', grad: 'from-zinc-500 to-slate-600',      integration: 'github',     enabled: true,  perms: ['Repositories','Pull Requests','Issues'] },
  { agent: 'Finance Agent',     avatar: 'FA', grad: 'from-emerald-500 to-green-500',  integration: 'stripe',     enabled: true,  perms: ['Read','Send','Reports'] },
  { agent: 'Research Agent',    avatar: 'RA', grad: 'from-violet-500 to-purple-500',  integration: 'gemini',     enabled: true,  perms: ['Web Search','Read','Citations'] },
  { agent: 'Ops Agent',          avatar: 'OA', grad: 'from-amber-500 to-orange-500',    integration: 'slack',      enabled: true,  perms: ['Send Messages','Read Messages','Notifications'] },
  { agent: 'Data Agent',         avatar: 'DT', grad: 'from-cyan-500 to-sky-500',       integration: 'postgres',   enabled: false, perms: ['Read','Query'] },
];

/* ===== Workflow Access ===== */
export const WORKFLOW_ACCESS = [
  { workflow: 'Lead Enrichment Pipeline',     integration: 'salesforce', lastRun: '5 min ago',  status: 'connected',  requests: 1240, errors: 0 },
  { workflow: 'Daily Social Publishing',      integration: 'instagram',   lastRun: '1h ago',     status: 'connected',  requests: 820,  errors: 3 },
  { workflow: 'Support Triage',               integration: 'zendesk',      lastRun: '12 min ago', status: 'connected',  requests: 2100, errors: 1 },
  { workflow: 'Code Review Bot',              integration: 'github',      lastRun: '3 min ago',  status: 'connected',  requests: 680,  errors: 0 },
  { workflow: 'Payment Monitoring',          integration: 'stripe',       lastRun: '2 min ago',  status: 'connected',  requests: 3400, errors: 0 },
  { workflow: 'Research Digest',              integration: 'gemini',       lastRun: '4h ago',     status: 'attention',  requests: 120,  errors: 8 },
  { workflow: 'Team Notifications',           integration: 'slack',        lastRun: '30s ago',    status: 'connected',  requests: 5200, errors: 0 },
  { workflow: 'Data Warehouse Sync',          integration: 'postgres',    lastRun: '8 min ago',  status: 'connected',  requests: 18000,errors: 2 },
];

/* ===== Recent Activity ===== */
export const RECENT_ACTIVITY = [
  { who: 'System',   what: 'connected integration',     target: 'GitHub',                time: '2m', icon: Plug,      grad: 'from-zinc-500 to-slate-700', color: 'text-emerald-400' },
  { who: 'Marketing Agent', what: 'accessed',           target: 'Instagram',             time: '6m', icon: Instagram, grad: 'from-fuchsia-500 to-pink-500', color: 'text-violet-400' },
  { who: 'Research Workflow', what: 'queried',          target: 'Google Search',         time: '12m',icon: Search,    grad: 'from-blue-500 to-sky-500', color: 'text-sky-400' },
  { who: 'Finance Agent', what: 'accessed',              target: 'Stripe',                time: '18m',icon: CreditCard,grad: 'from-violet-500 to-indigo-500', color: 'text-emerald-400' },
  { who: 'Slack',   what: 'notification sent',           target: '#ops-team',             time: '22m',icon: Slack,     grad: 'from-violet-500 to-fuchsia-500', color: 'text-cyan-400' },
  { who: 'System',  what: 'uploaded document to',       target: 'Google Drive',          time: '35m',icon: HardDrive, grad: 'from-amber-500 to-yellow-500', color: 'text-amber-400' },
  { who: 'Database',what: 'schema synchronised',        target: 'PostgreSQL',            time: '48m',icon: Database,  grad: 'from-blue-500 to-indigo-500', color: 'text-blue-400' },
  { who: 'Developer Agent', what: 'opened pull request on',target: 'GitHub',              time: '1h', icon: Github,    grad: 'from-zinc-500 to-slate-700', color: 'text-zinc-300' },
  { who: 'Bedrock', what: 'token expired, needs attention',target: 'AWS Bedrock',         time: '2h', icon: AlertTriangle,grad:'from-orange-500 to-amber-500', color: 'text-amber-400' },
];

/* ===== Security ===== */
export const SECURITY = {
  summary: [
    { label: 'Encrypted Credentials', value: '24',     icon: Lock,      grad: 'from-emerald-500 to-teal-500' },
    { label: 'OAuth Connections',     value: '11',     icon: Key,       grad: 'from-violet-500 to-indigo-500' },
    { label: 'API Keys',               value: '18',     icon: KeyRound,  grad: 'from-amber-500 to-orange-500' },
    { label: 'Access Tokens',          value: '7',     icon: Shield,    grad: 'from-sky-500 to-blue-500' },
  ],
  credentials: [
    { name: 'OpenAI API Key',       masked: 'sk-••••••••••••••••••••3a9f', type: 'API Key',      added: 'Dec 2025', lastRotated: '2 months ago' },
    { name: 'Anthropic API Key',    masked: 'sk-ant-••••••••••••••••7c2', type: 'API Key',      added: 'Nov 2025', lastRotated: '3 months ago' },
    { name: 'GitHub OAuth Token',   masked: 'gho_•••••••••••••••••f1a',  type: 'OAuth 2.0',    added: 'Mar 2025', lastRotated: '5 months ago' },
    { name: 'Stripe Secret Key',    masked: 'sk_live_••••••••••••••9b8', type: 'Secret Key',   added: 'Jun 2025', lastRotated: '1 month ago' },
    { name: 'Slack Bot Token',      masked: 'xoxb-•••••••••••••••••4d2', type: 'OAuth 2.0',    added: 'May 2025', lastRotated: '2 months ago' },
    { name: 'Postgres Connection',  masked: 'postgres://••••••:•••@db',  type: 'Connection',  added: 'Mar 2025', lastRotated: '4 months ago' },
  ],
  lastCheck: '14 min ago',
  alerts: [
    { level: 'warning', text: 'AWS Bedrock token expires in 3 days', icon: AlertTriangle, grad: 'from-amber-500 to-orange-500' },
    { level: 'info',    text: 'GitHub OAuth token rotated successfully', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-500' },
    { level: 'error',   text: 'RDS connection showing elevated latency', icon: XCircle,      grad: 'from-red-500 to-rose-500' },
  ],
};

/* ===== API Usage ===== */
export const API_USAGE = {
  trend:        [32,38,42,40,48,52,49,58,62,60,68,72],
  success:      [31,37,41,39,47,51,48,57,61,59,67,71],
  failed:       [1,1,1,1,1,1,1,1,1,1,1,1],
  latency:      [420,410,430,400,380,390,360,350,340,345,330,320],
  byIntegration:[
    { name: 'Slack',      value: 5200, grad: 'from-violet-500 to-fuchsia-500' },
    { name: 'GitHub',     value: 4210, grad: 'from-zinc-500 to-slate-700' },
    { name: 'OpenAI',     value: 12420,grad: 'from-emerald-500 to-teal-500' },
    { name: 'Stripe',     value: 3680, grad: 'from-violet-500 to-indigo-500' },
    { name: 'PostgreSQL', value: 5120, grad: 'from-blue-500 to-indigo-500' },
    { name: 'Redis',      value: 8210, grad: 'from-red-500 to-rose-500' },
  ],
  byAgent: [
    { name: 'Research Agent', value: 8400, grad: 'from-violet-500 to-purple-500' },
    { name: 'Developer Agent', value: 4200, grad: 'from-zinc-500 to-slate-600' },
    { name: 'Marketing Agent', value: 3100, grad: 'from-fuchsia-500 to-pink-500' },
    { name: 'Finance Agent',   value: 2600, grad: 'from-emerald-500 to-green-500' },
    { name: 'Support Agent',   value: 2100, grad: 'from-teal-500 to-cyan-500' },
  ],
  byWorkflow: [
    { name: 'Data Warehouse Sync',  value: 18000, grad: 'from-blue-500 to-indigo-500' },
    { name: 'Team Notifications',   value: 5200,  grad: 'from-violet-500 to-fuchsia-500' },
    { name: 'Lead Enrichment',      value: 1240,  grad: 'from-sky-500 to-blue-500' },
    { name: 'Research Digest',      value: 120,   grad: 'from-amber-500 to-orange-500' },
  ],
};

/* ===== Recommended ===== */
export const RECOMMENDED = [
  { text: 'Connect GitHub to allow your Developer Agent to manage repositories.', integration: 'github',     icon: Github,     grad: 'from-zinc-500 to-slate-700' },
  { text: 'Connect Slack to allow agents to send team notifications.',            integration: 'slack',      icon: Slack,      grad: 'from-violet-500 to-fuchsia-500' },
  { text: 'Connect Google Drive to give your Research Agent access to company documents.', integration: 'gdrive', icon: HardDrive, grad: 'from-amber-500 to-yellow-500' },
  { text: 'Connect Stripe to allow Finance Agents to monitor payments.',          integration: 'stripe',     icon: CreditCard, grad: 'from-violet-500 to-indigo-500' },
  { text: 'Connect Notion to let agents read and create knowledge pages.',        integration: 'notion',     icon: FileText,   grad: 'from-zinc-500 to-slate-600' },
];

/* ===== Right Sidebar ===== */
export const RIGHT_SIDEBAR = {
  security: [
    { level: 'warning', text: 'AWS Bedrock token expires in 3 days', icon: AlertTriangle, grad: 'from-amber-500 to-orange-500' },
    { level: 'error',   text: 'RDS connection elevated latency',      icon: XCircle,       grad: 'from-red-500 to-rose-500' },
    { level: 'info',    text: '14 credentials encrypted & secure',     icon: ShieldCheck,   grad: 'from-emerald-500 to-teal-500' },
  ],
  recent: RECENT_ACTIVITY.slice(0, 6),
  usage: { trend: API_USAGE.trend, total: '48.2K', delta: '+18%' },
  recommendations: RECOMMENDED.slice(0, 4),
  quickActions: [
    { label: 'Connect AI Provider', icon: Brain,       grad: 'from-violet-500 to-indigo-500' },
    { label: 'Connect App',          icon: Briefcase,   grad: 'from-sky-500 to-blue-500' },
    { label: 'Create Custom API',    icon: Plug,        grad: 'from-fuchsia-500 to-pink-500' },
    { label: 'Manage API Keys',      icon: KeyRound,    grad: 'from-amber-500 to-orange-500' },
    { label: 'View Audit Logs',      icon: FileText,    grad: 'from-zinc-500 to-slate-600' },
    { label: 'Test Connections',     icon: Activity,    grad: 'from-emerald-500 to-teal-500' },
  ],
};