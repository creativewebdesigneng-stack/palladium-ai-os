import {
  FileText, FileSpreadsheet, Presentation, FileType, FileCode, FileJson,
  FileArchive, Image, Music, Video, File, Database, Brain, BookOpen, Search,
  Globe, HardDrive, Cloud, Github, GitBranch, Boxes, Network, Share2,
  Cpu, MemoryStick, Pin, Sparkles, Star, Clock, FolderOpen, Users, Lock,
  Globe2, Trash2, Upload, Download, MessageSquare, CheckCircle2, FileCheck,
  Activity, TrendingUp, Layers, Tag, Eye, Send, RefreshCw, Shield,
  FolderKanban, FileStack, Link2, Hash, Calendar, Building2, User, Briefcase,
  Workflow, Bot, FileSearch, Library, Layers3, Server, Zap, FileUp,
} from 'lucide-react';

// ─── Overview Metrics ─────────────────────────────────
export const OVERVIEW_METRICS = [
  { label: 'Total Files', value: '12,847', detail: '+124 this week', trend: [42, 44, 46, 48, 50, 52, 54, 56, 58], icon: FileStack, grad: 'from-violet-500 to-indigo-500' },
  { label: 'Knowledge Collections', value: '48', detail: '6 active', trend: [30, 32, 34, 36, 38, 40, 42, 45, 48], icon: Library, grad: 'from-fuchsia-500 to-pink-500' },
  { label: 'Documents Indexed', value: '9,432', detail: '73% of total', trend: [50, 55, 60, 65, 68, 72, 76, 80, 84], icon: FileCheck, grad: 'from-sky-500 to-blue-500' },
  { label: 'Storage Used', value: '847 GB', detail: 'of 2 TB', trend: [60, 62, 65, 68, 72, 75, 78, 82, 84], icon: HardDrive, grad: 'from-emerald-500 to-teal-500' },
  { label: 'Vector Embeddings', value: '2.4M', detail: '+18K today', trend: [1.2, 1.4, 1.6, 1.8, 2.0, 2.1, 2.2, 2.3, 2.4], icon: Brain, grad: 'from-purple-500 to-violet-500' },
  { label: 'Connected Drives', value: '11', detail: '2 syncing', trend: [6, 7, 8, 8, 9, 10, 10, 11, 11], icon: Cloud, grad: 'from-cyan-500 to-sky-500' },
  { label: 'Recently Updated', value: '328', detail: 'last 24h', trend: [200, 220, 240, 260, 280, 300, 310, 320, 328], icon: Clock, grad: 'from-amber-500 to-orange-500' },
  { label: 'AI Searches Today', value: '1,284', detail: '+12% vs yesterday', trend: [800, 850, 900, 950, 1000, 1100, 1150, 1200, 1284], icon: Search, grad: 'from-rose-500 to-red-500' },
];

// ─── Left Sidebar Folders ──────────────────────────────
export const SIDEBAR_FOLDERS = [
  { label: 'Recent', icon: Clock, count: 328, grad: 'from-sky-500 to-blue-500' },
  { label: 'Shared', icon: Share2, count: 142, grad: 'from-emerald-500 to-teal-500' },
  { label: 'Starred', icon: Star, count: 47, grad: 'from-amber-500 to-orange-500' },
  { label: 'Projects', icon: FolderKanban, count: 18, grad: 'from-violet-500 to-indigo-500' },
  { label: 'Knowledge Collections', icon: Library, count: 48, grad: 'from-fuchsia-500 to-pink-500' },
  { label: 'Templates', icon: Layers3, count: 32, grad: 'from-purple-500 to-violet-500' },
  { label: 'Images', icon: Image, count: 2840, grad: 'from-rose-500 to-pink-500' },
  { label: 'Videos', icon: Video, count: 412, grad: 'from-indigo-500 to-blue-500' },
  { label: 'Audio', icon: Music, count: 128, grad: 'from-cyan-500 to-sky-500' },
  { label: 'Documents', icon: FileText, count: 4820, grad: 'from-sky-500 to-cyan-500' },
  { label: 'PDFs', icon: FileText, count: 2140, grad: 'from-red-500 to-rose-500' },
  { label: 'Code', icon: FileCode, count: 940, grad: 'from-emerald-500 to-green-500' },
  { label: 'Databases', icon: Database, count: 24, grad: 'from-amber-500 to-yellow-500' },
  { label: 'Archives', icon: FileArchive, count: 86, grad: 'from-zinc-500 to-slate-500' },
  { label: 'Trash', icon: Trash2, count: 12, grad: 'from-zinc-600 to-zinc-500' },
];

// ─── File Type Config ──────────────────────────────────
export const FILE_TYPES = {
  pdf: { label: 'PDF', icon: FileText, grad: 'from-red-500 to-rose-500', color: 'text-red-400' },
  doc: { label: 'Word', icon: FileText, grad: 'from-blue-500 to-indigo-500', color: 'text-blue-400' },
  docx: { label: 'Word', icon: FileText, grad: 'from-blue-500 to-indigo-500', color: 'text-blue-400' },
  xls: { label: 'Excel', icon: FileSpreadsheet, grad: 'from-emerald-500 to-green-500', color: 'text-emerald-400' },
  xlsx: { label: 'Excel', icon: FileSpreadsheet, grad: 'from-emerald-500 to-green-500', color: 'text-emerald-400' },
  ppt: { label: 'PowerPoint', icon: Presentation, grad: 'from-orange-500 to-red-500', color: 'text-orange-400' },
  pptx: { label: 'PowerPoint', icon: Presentation, grad: 'from-orange-500 to-red-500', color: 'text-orange-400' },
  md: { label: 'Markdown', icon: FileType, grad: 'from-zinc-500 to-slate-500', color: 'text-zinc-400' },
  txt: { label: 'TXT', icon: FileText, grad: 'from-zinc-500 to-slate-500', color: 'text-zinc-400' },
  csv: { label: 'CSV', icon: FileSpreadsheet, grad: 'from-teal-500 to-cyan-500', color: 'text-teal-400' },
  json: { label: 'JSON', icon: FileJson, grad: 'from-amber-500 to-yellow-500', color: 'text-amber-400' },
  xml: { label: 'XML', icon: FileCode, grad: 'from-violet-500 to-purple-500', color: 'text-violet-400' },
  yaml: { label: 'YAML', icon: FileCode, grad: 'from-fuchsia-500 to-pink-500', color: 'text-fuchsia-400' },
  zip: { label: 'ZIP', icon: FileArchive, grad: 'from-zinc-500 to-slate-500', color: 'text-zinc-400' },
  png: { label: 'PNG', icon: Image, grad: 'from-rose-500 to-pink-500', color: 'text-rose-400' },
  jpg: { label: 'JPG', icon: Image, grad: 'from-rose-500 to-pink-500', color: 'text-rose-400' },
  svg: { label: 'SVG', icon: Image, grad: 'from-fuchsia-500 to-purple-500', color: 'text-fuchsia-400' },
  mp4: { label: 'MP4', icon: Video, grad: 'from-indigo-500 to-blue-500', color: 'text-indigo-400' },
  mp3: { label: 'MP3', icon: Music, grad: 'from-cyan-500 to-sky-500', color: 'text-cyan-400' },
  wav: { label: 'WAV', icon: Music, grad: 'from-cyan-500 to-sky-500', color: 'text-cyan-400' },
  js: { label: 'JavaScript', icon: FileCode, grad: 'from-yellow-500 to-amber-500', color: 'text-yellow-400' },
  jsx: { label: 'React', icon: FileCode, grad: 'from-sky-500 to-cyan-500', color: 'text-sky-400' },
  ts: { label: 'TypeScript', icon: FileCode, grad: 'from-blue-500 to-indigo-500', color: 'text-blue-400' },
  tsx: { label: 'TSX', icon: FileCode, grad: 'from-sky-500 to-blue-500', color: 'text-sky-400' },
  py: { label: 'Python', icon: FileCode, grad: 'from-emerald-500 to-teal-500', color: 'text-emerald-400' },
  sql: { label: 'SQL', icon: Database, grad: 'from-amber-500 to-orange-500', color: 'text-amber-400' },
  db: { label: 'Database', icon: Database, grad: 'from-amber-500 to-yellow-500', color: 'text-amber-400' },
};

export const SUPPORTED_TYPES = [
  { type: 'PDF', icon: FileText, grad: 'from-red-500 to-rose-500', count: 2140 },
  { type: 'Word', icon: FileText, grad: 'from-blue-500 to-indigo-500', count: 1820 },
  { type: 'Excel', icon: FileSpreadsheet, grad: 'from-emerald-500 to-green-500', count: 940 },
  { type: 'PowerPoint', icon: Presentation, grad: 'from-orange-500 to-red-500', count: 410 },
  { type: 'Markdown', icon: FileType, grad: 'from-zinc-500 to-slate-500', count: 1280 },
  { type: 'TXT', icon: FileText, grad: 'from-zinc-500 to-slate-500', count: 640 },
  { type: 'CSV', icon: FileSpreadsheet, grad: 'from-teal-500 to-cyan-500', count: 380 },
  { type: 'JSON', icon: FileJson, grad: 'from-amber-500 to-yellow-500', count: 520 },
  { type: 'XML', icon: FileCode, grad: 'from-violet-500 to-purple-500', count: 180 },
  { type: 'YAML', icon: FileCode, grad: 'from-fuchsia-500 to-pink-500', count: 120 },
  { type: 'ZIP', icon: FileArchive, grad: 'from-zinc-500 to-slate-500', count: 86 },
  { type: 'PNG', icon: Image, grad: 'from-rose-500 to-pink-500', count: 1840 },
  { type: 'JPG', icon: Image, grad: 'from-rose-500 to-pink-500', count: 920 },
  { type: 'SVG', icon: Image, grad: 'from-fuchsia-500 to-purple-500', count: 80 },
  { type: 'MP4', icon: Video, grad: 'from-indigo-500 to-blue-500', count: 280 },
  { type: 'MP3', icon: Music, grad: 'from-cyan-500 to-sky-500', count: 96 },
  { type: 'WAV', icon: Music, grad: 'from-cyan-500 to-sky-500', count: 32 },
  { type: 'Code Files', icon: FileCode, grad: 'from-emerald-500 to-green-500', count: 940 },
  { type: 'Databases', icon: Database, grad: 'from-amber-500 to-yellow-500', count: 24 },
];

// ─── Files ─────────────────────────────────────────────
export const FILES = [
  { id: 'f1', name: 'Q3 Financial Report.pdf', ext: 'pdf', owner: 'Maya Chen', size: '4.2 MB', modified: '2 hours ago', knowledge: 'indexed', status: 'ready', tags: ['Finance', 'Q3', 'Report'], starred: true, shared: 4, collection: 'Finance' },
  { id: 'f2', name: 'Product Roadmap 2026.docx', ext: 'docx', owner: 'Alex Rivera', size: '1.8 MB', modified: '5 hours ago', knowledge: 'indexed', status: 'ready', tags: ['Product', 'Roadmap', 'Planning'], starred: true, shared: 8, collection: 'Product Documentation' },
  { id: 'f3', name: 'Customer Research Data.xlsx', ext: 'xlsx', owner: 'Sam Park', size: '8.4 MB', modified: '1 day ago', knowledge: 'indexed', status: 'ready', tags: ['Research', 'Customer', 'Data'], starred: false, shared: 3, collection: 'Research' },
  { id: 'f4', name: 'Brand Guidelines.pptx', ext: 'pptx', owner: 'Jordan Lee', size: '12.6 MB', modified: '2 days ago', knowledge: 'indexed', status: 'ready', tags: ['Brand', 'Design', 'Marketing'], starred: false, shared: 12, collection: 'Marketing' },
  { id: 'f5', name: 'API Documentation.md', ext: 'md', owner: 'Alex Rivera', size: '128 KB', modified: '3 hours ago', knowledge: 'indexed', status: 'ready', tags: ['API', 'Docs', 'Developer'], starred: true, shared: 6, collection: 'Development' },
  { id: 'f6', name: 'user-analytics-export.csv', ext: 'csv', owner: 'Sam Park', size: '2.4 MB', modified: '6 hours ago', knowledge: 'pending', status: 'processing', tags: ['Analytics', 'Export'], starred: false, shared: 2, collection: 'Research' },
  { id: 'f7', name: 'config-schema.json', ext: 'json', owner: 'Alex Rivera', size: '48 KB', modified: '12 hours ago', knowledge: 'indexed', status: 'ready', tags: ['Config', 'Schema'], starred: false, shared: 1, collection: 'Development' },
  { id: 'f8', name: 'deployment-config.yaml', ext: 'yaml', owner: 'Jordan Lee', size: '12 KB', modified: '1 day ago', knowledge: 'indexed', status: 'ready', tags: ['DevOps', 'Config'], starred: false, shared: 3, collection: 'Development' },
  { id: 'f9', name: 'project-assets.zip', ext: 'zip', owner: 'Maya Chen', size: '124 MB', modified: '3 days ago', knowledge: 'pending', status: 'pending', tags: ['Assets', 'Archive'], starred: false, shared: 0, collection: 'Company Knowledge' },
  { id: 'f10', name: 'hero-banner.png', ext: 'png', owner: 'Jordan Lee', size: '3.2 MB', modified: '4 hours ago', knowledge: 'indexed', status: 'ready', tags: ['Design', 'Banner', 'Image'], starred: true, shared: 5, collection: 'Marketing' },
  { id: 'f11', name: 'demo-walkthrough.mp4', ext: 'mp4', owner: 'Sam Park', size: '84 MB', modified: '2 days ago', knowledge: 'indexed', status: 'ready', tags: ['Video', 'Demo'], starred: false, shared: 7, collection: 'Product Documentation' },
  { id: 'f12', name: 'podcast-interview.mp3', ext: 'mp3', owner: 'Maya Chen', size: '42 MB', modified: '5 days ago', knowledge: 'indexed', status: 'ready', tags: ['Audio', 'Podcast'], starred: false, shared: 0, collection: 'Marketing' },
  { id: 'f13', name: 'App.jsx', ext: 'jsx', owner: 'Alex Rivera', size: '8.2 KB', modified: '1 hour ago', knowledge: 'indexed', status: 'ready', tags: ['React', 'Frontend', 'Code'], starred: true, shared: 2, collection: 'Development' },
  { id: 'f14', name: 'database-migrations.sql', ext: 'sql', owner: 'Jordan Lee', size: '64 KB', modified: '8 hours ago', knowledge: 'indexed', status: 'ready', tags: ['SQL', 'Migration', 'Database'], starred: false, shared: 1, collection: 'Development' },
  { id: 'f15', name: 'logo-mark.svg', ext: 'svg', owner: 'Jordan Lee', size: '24 KB', modified: '1 week ago', knowledge: 'indexed', status: 'ready', tags: ['Logo', 'Brand'], starred: true, shared: 0, collection: 'Marketing' },
  { id: 'f16', name: 'team-meeting-notes.txt', ext: 'txt', owner: 'Sam Park', size: '18 KB', modified: '3 days ago', knowledge: 'pending', status: 'processing', tags: ['Notes', 'Meeting'], starred: false, shared: 4, collection: 'Company Knowledge' },
];

// ─── Knowledge Collections ─────────────────────────────
export const KNOWLEDGE_COLLECTIONS = [
  { name: 'Company Knowledge', icon: Building2, docs: 1842, updated: '2 hours ago', owner: 'Maya Chen', indexed: 92, search: true, grad: 'from-violet-500 to-indigo-500', color: 'text-violet-400' },
  { name: 'Product Documentation', icon: BookOpen, docs: 942, updated: '5 hours ago', owner: 'Alex Rivera', indexed: 98, search: true, grad: 'from-sky-500 to-blue-500', color: 'text-sky-400' },
  { name: 'Legal', icon: Shield, docs: 284, updated: '1 day ago', owner: 'Legal Team', indexed: 76, search: true, grad: 'from-amber-500 to-orange-500', color: 'text-amber-400' },
  { name: 'Marketing', icon: TrendingUp, docs: 612, updated: '4 hours ago', owner: 'Jordan Lee', indexed: 88, search: true, grad: 'from-fuchsia-500 to-pink-500', color: 'text-fuchsia-400' },
  { name: 'Sales', icon: Briefcase, docs: 420, updated: '3 hours ago', owner: 'Sales Team', indexed: 84, search: true, grad: 'from-emerald-500 to-teal-500', color: 'text-emerald-400' },
  { name: 'Customer Support', icon: MessageSquare, docs: 1240, updated: '1 hour ago', owner: 'Support Team', indexed: 95, search: true, grad: 'from-cyan-500 to-sky-500', color: 'text-cyan-400' },
  { name: 'Research', icon: Search, docs: 380, updated: '6 hours ago', owner: 'Sam Park', indexed: 72, search: false, grad: 'from-rose-500 to-red-500', color: 'text-rose-400' },
  { name: 'Development', icon: FileCode, docs: 640, updated: '1 hour ago', owner: 'Alex Rivera', indexed: 90, search: true, grad: 'from-purple-500 to-violet-500', color: 'text-purple-400' },
  { name: 'HR', icon: Users, docs: 186, updated: '2 days ago', owner: 'HR Team', indexed: 80, search: true, grad: 'from-indigo-500 to-blue-500', color: 'text-indigo-400' },
  { name: 'Finance', icon: FileSpreadsheet, docs: 248, updated: '3 hours ago', owner: 'Maya Chen', indexed: 86, search: true, grad: 'from-teal-500 to-cyan-500', color: 'text-teal-400' },
];

// ─── Document Viewer Details ───────────────────────────
export const DOCUMENT_DETAILS = {
  name: 'Q3 Financial Report.pdf',
  type: 'PDF Document',
  size: '4.2 MB',
  pages: 42,
  owner: 'Maya Chen',
  collection: 'Finance',
  knowledge: 'indexed',
  summary: 'Comprehensive Q3 2026 financial report covering revenue growth of 34% year-over-year, operational metrics, departmental budgets, and forward-looking projections for Q4. Highlights include a 42% increase in AI workforce deployments and expansion into three new markets.',
  keyTopics: ['Revenue Growth', 'Operating Expenses', 'AI Workforce ROI', 'Market Expansion', 'Budget Allocation', 'Quarterly Projections'],
  entities: [
    { type: 'Date', value: 'Q3 2026', icon: Calendar },
    { type: 'Date', value: 'October 15, 2026', icon: Calendar },
    { type: 'Person', value: 'Maya Chen', icon: User },
    { type: 'Company', value: 'PalladiumAI Inc.', icon: Building2 },
    { type: 'Currency', value: '$4.2M revenue', icon: TrendingUp },
    { type: 'Metric', value: '34% YoY growth', icon: TrendingUp },
  ],
  referencedProjects: ['PalladiumAI Platform', 'Market Expansion Q4', 'AI Workforce Initiative'],
  referencedAgents: ['Finance Agent', 'Research Agent', 'Planner Agent'],
  comments: [
    { who: 'Alex Rivera', text: 'The AI workforce ROI section needs more detail on cost savings.', time: '3h ago', avatar: 'AR' },
    { who: 'Sam Park', text: 'Can we add comparison with industry benchmarks?', time: '5h ago', avatar: 'SP' },
    { who: 'Maya Chen', text: 'Updated the projections — ready for review.', time: '2h ago', avatar: 'MC' },
  ],
  versions: [
    { version: 'v3.2', label: 'Current', who: 'Maya Chen', time: '2 hours ago', desc: 'Updated Q4 projections and added market expansion analysis', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-500' },
    { version: 'v3.1', label: 'Review', who: 'Alex Rivera', time: '1 day ago', desc: 'Added AI workforce ROI breakdown', icon: FileCheck, grad: 'from-sky-500 to-blue-500' },
    { version: 'v3.0', label: 'Draft', who: 'Maya Chen', time: '3 days ago', desc: 'Restructured sections and added executive summary', icon: FileText, grad: 'from-violet-500 to-indigo-500' },
    { version: 'v2.4', label: 'Archived', who: 'Finance Team', time: '1 week ago', desc: 'Initial Q3 data compilation', icon: FileArchive, grad: 'from-zinc-500 to-slate-500' },
  ],
};

// ─── AI Knowledge Panel ─────────────────────────────────
export const AI_KNOWLEDGE = {
  summary: 'This financial report details Q3 2026 performance with 34% revenue growth driven primarily by AI workforce deployments and market expansion. The company is on track to exceed annual targets.',
  keyFacts: [
    'Revenue reached $4.2M, a 34% increase year-over-year',
    'AI workforce deployments grew by 42%',
    'Operating expenses decreased by 12% due to automation',
    'Three new markets entered: EMEA, APAC, LATAM',
    'Q4 projections indicate 40%+ continued growth',
  ],
  importantDates: [
    { date: 'Oct 15, 2026', event: 'Q3 Report Published', icon: Calendar, grad: 'from-violet-500 to-indigo-500' },
    { date: 'Oct 01, 2026', event: 'Q3 Fiscal Close', icon: Calendar, grad: 'from-sky-500 to-blue-500' },
    { date: 'Jan 15, 2027', event: 'Q4 Projections Due', icon: Calendar, grad: 'from-amber-500 to-orange-500' },
  ],
  people: ['Maya Chen (Finance Lead)', 'Alex Rivera (Product)', 'Sam Park (Research)', 'Jordan Lee (Marketing)'],
  companies: ['PalladiumAI Inc.', 'TechVentures Partners', 'CloudScale Solutions', 'DataInsight Corp'],
  projects: ['PalladiumAI Platform', 'Market Expansion Q4', 'AI Workforce Initiative', 'Revenue Optimization'],
  faqs: [
    { q: 'What drove the revenue growth?', a: 'Primarily AI workforce deployments (42%) and new market expansion.' },
    { q: 'How were expenses reduced?', a: 'Automation reduced operating expenses by 12%.' },
    { q: 'What are Q4 projections?', a: '40%+ continued growth expected based on current trends.' },
  ],
  related: [
    { name: 'Product Roadmap 2026.docx', type: 'Document', icon: FileText, grad: 'from-blue-500 to-indigo-500', relevance: 94 },
    { name: 'Market Analysis Q3.xlsx', type: 'Spreadsheet', icon: FileSpreadsheet, grad: 'from-emerald-500 to-green-500', relevance: 88 },
    { name: 'Customer Research Data.xlsx', type: 'Spreadsheet', icon: FileSpreadsheet, grad: 'from-emerald-500 to-teal-500', relevance: 82 },
    { name: 'Budget Allocation.pdf', type: 'PDF', icon: FileText, grad: 'from-red-500 to-rose-500', relevance: 76 },
  ],
};

// ─── Vector Search Results ──────────────────────────────
export const VECTOR_RESULTS = [
  { name: 'Q3 Financial Report.pdf', type: 'pdf', collection: 'Finance', snippet: 'Revenue growth of 34% year-over-year driven by AI workforce deployments and market expansion into EMEA, APAC, and LATAM regions.', score: 98, tags: ['Finance', 'Q3', 'Revenue'] },
  { name: 'Product Roadmap 2026.docx', type: 'docx', collection: 'Product Documentation', snippet: 'The roadmap outlines expansion plans including AI-powered features, new market entries, and workforce automation initiatives.', score: 91, tags: ['Product', 'Roadmap'] },
  { name: 'AI Workforce Initiative.md', type: 'md', collection: 'Company Knowledge', snippet: 'Detailed analysis of AI workforce deployment ROI showing 42% growth and significant cost reductions through automation.', score: 87, tags: ['AI', 'Workforce', 'ROI'] },
  { name: 'Market Analysis Report.pdf', type: 'pdf', collection: 'Research', snippet: 'Comprehensive market analysis covering EMEA, APAC, and LATAM expansion opportunities and competitive landscape.', score: 84, tags: ['Research', 'Market'] },
  { name: 'Budget Allocation Q3.xlsx', type: 'xlsx', collection: 'Finance', snippet: 'Q3 budget breakdown by department with projections for Q4 including AI workforce investment allocations.', score: 79, tags: ['Finance', 'Budget'] },
  { name: 'Revenue Optimization Plan.pptx', type: 'pptx', collection: 'Marketing', snippet: 'Strategy presentation for revenue optimization through AI automation and market expansion initiatives.', score: 72, tags: ['Marketing', 'Revenue'] },
];

// ─── Connected Storage ─────────────────────────────────
export const CONNECTED_STORAGE = [
  { name: 'Google Drive', icon: HardDrive, status: 'connected', used: '124 GB', synced: 4280, lastSync: '5 min ago', grad: 'from-emerald-500 to-teal-500', syncing: true },
  { name: 'Dropbox', icon: Boxes, status: 'connected', used: '68 GB', synced: 1820, lastSync: '1 hour ago', grad: 'from-sky-500 to-blue-500', syncing: false },
  { name: 'OneDrive', icon: Cloud, status: 'connected', used: '92 GB', synced: 2640, lastSync: '12 min ago', grad: 'from-blue-500 to-indigo-500', syncing: false },
  { name: 'Box', icon: Boxes, status: 'connected', used: '34 GB', synced: 980, lastSync: '2 hours ago', grad: 'from-cyan-500 to-sky-500', syncing: false },
  { name: 'AWS S3', icon: Server, status: 'connected', used: '340 GB', synced: 8420, lastSync: '3 min ago', grad: 'from-amber-500 to-orange-500', syncing: true },
  { name: 'Cloudflare R2', icon: Globe, status: 'connected', used: '84 GB', synced: 2140, lastSync: '8 min ago', grad: 'from-orange-500 to-amber-500', syncing: false },
  { name: 'GitHub', icon: Github, status: 'connected', used: '12 GB', synced: 940, lastSync: '1 hour ago', grad: 'from-zinc-500 to-slate-500', syncing: false },
  { name: 'GitLab', icon: GitBranch, status: 'available', used: '0 GB', synced: 0, lastSync: 'Never', grad: 'from-orange-500 to-red-500', syncing: false },
  { name: 'Notion', icon: BookOpen, status: 'connected', used: '2.4 GB', synced: 420, lastSync: '20 min ago', grad: 'from-zinc-500 to-slate-500', syncing: false },
  { name: 'Confluence', icon: FileText, status: 'connected', used: '8.2 GB', synced: 1240, lastSync: '45 min ago', grad: 'from-blue-500 to-sky-500', syncing: false },
  { name: 'SharePoint', icon: Network, status: 'available', used: '0 GB', synced: 0, lastSync: 'Never', grad: 'from-sky-500 to-cyan-500', syncing: false },
  { name: 'NAS', icon: HardDrive, status: 'connected', used: '82 GB', synced: 3280, lastSync: '15 min ago', grad: 'from-violet-500 to-purple-500', syncing: false },
  { name: 'Local Storage', icon: HardDrive, status: 'connected', used: '12 GB', synced: 840, lastSync: 'Real-time', grad: 'from-emerald-500 to-green-500', syncing: false },
];

// ─── Knowledge Graph ────────────────────────────────────
export const GRAPH_NODES = [
  { id: 'p1', label: 'PalladiumAI Platform', type: 'Project', icon: FolderKanban, x: 50, y: 50, grad: 'from-violet-500 to-indigo-500' },
  { id: 'p2', label: 'Market Expansion', type: 'Project', icon: FolderKanban, x: 20, y: 25, grad: 'from-sky-500 to-blue-500' },
  { id: 'p3', label: 'AI Workforce', type: 'Project', icon: FolderKanban, x: 80, y: 25, grad: 'from-emerald-500 to-teal-500' },
  { id: 'f1', label: 'Q3 Report.pdf', type: 'File', icon: FileText, x: 15, y: 60, grad: 'from-red-500 to-rose-500' },
  { id: 'f2', label: 'Roadmap.docx', type: 'File', icon: FileText, x: 35, y: 75, grad: 'from-blue-500 to-indigo-500' },
  { id: 'f3', label: 'API Docs.md', type: 'File', icon: FileCode, x: 85, y: 65, grad: 'from-emerald-500 to-teal-500' },
  { id: 'a1', label: 'Finance Agent', type: 'Agent', icon: Bot, x: 65, y: 80, grad: 'from-amber-500 to-orange-500' },
  { id: 'a2', label: 'Research Agent', type: 'Agent', icon: Bot, x: 30, y: 85, grad: 'from-cyan-500 to-sky-500' },
  { id: 'c1', label: 'Finance', type: 'Collection', icon: Library, x: 50, y: 20, grad: 'from-teal-500 to-cyan-500' },
  { id: 'c2', label: 'Development', type: 'Collection', icon: Library, x: 75, y: 45, grad: 'from-purple-500 to-violet-500' },
];

export const GRAPH_EDGES = [
  { from: 'p1', to: 'p2' }, { from: 'p1', to: 'p3' }, { from: 'p2', to: 'f1' },
  { from: 'p2', to: 'c1' }, { from: 'p3', to: 'f3' }, { from: 'p3', to: 'c2' },
  { from: 'p1', to: 'f2' }, { from: 'a1', to: 'f1' }, { from: 'a1', to: 'c1' },
  { from: 'a2', to: 'f1' }, { from: 'a2', to: 'f2' }, { from: 'c1', to: 'f1' },
  { from: 'c2', to: 'f3' },
];

export const GRAPH_LEGEND = [
  { label: 'Projects', icon: FolderKanban, grad: 'from-violet-500 to-indigo-500' },
  { label: 'Files', icon: FileText, grad: 'from-sky-500 to-blue-500' },
  { label: 'Agents', icon: Bot, grad: 'from-emerald-500 to-teal-500' },
  { label: 'Collections', icon: Library, grad: 'from-fuchsia-500 to-pink-500' },
  { label: 'People', icon: User, grad: 'from-amber-500 to-orange-500' },
  { label: 'Companies', icon: Building2, grad: 'from-cyan-500 to-sky-500' },
  { label: 'Tasks', icon: CheckCircle2, grad: 'from-rose-500 to-red-500' },
  { label: 'Workflows', icon: Workflow, grad: 'from-purple-500 to-violet-500' },
];

// ─── AI Memory ──────────────────────────────────────────
export const AI_MEMORY = [
  { name: 'Long-Term Memory', icon: Brain, desc: 'Persistent across all sessions', enabled: true, size: '2.4 GB', entries: '1.2M', grad: 'from-violet-500 to-indigo-500' },
  { name: 'Short-Term Memory', icon: MemoryStick, desc: 'Session-scoped context', enabled: true, size: '128 MB', entries: '48K', grad: 'from-cyan-500 to-sky-500' },
  { name: 'Shared Memory', icon: Share2, desc: 'Cross-agent memory pool', enabled: true, size: '1.0 GB', entries: '340K', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Project Memory', icon: FolderKanban, desc: 'Per-project knowledge', enabled: true, size: '512 MB', entries: '82K', grad: 'from-fuchsia-500 to-pink-500' },
  { name: 'Agent Memory', icon: Bot, desc: 'Individual agent context', enabled: true, size: '256 MB', entries: '120K', grad: 'from-amber-500 to-orange-500' },
  { name: 'Pinned Knowledge', icon: Pin, desc: 'Manually pinned facts', enabled: false, size: '48 MB', entries: '2.4K', grad: 'from-rose-500 to-red-500' },
];

// ─── File Activity ──────────────────────────────────────
export const FILE_ACTIVITY = [
  { who: 'Maya Chen', what: 'uploaded', target: 'Q3 Financial Report.pdf', icon: Upload, time: '2h ago', grad: 'from-violet-500 to-indigo-500' },
  { who: 'AI System', what: 'indexed', target: 'Brand Guidelines.pptx', icon: Brain, time: '4h ago', grad: 'from-emerald-500 to-teal-500' },
  { who: 'Alex Rivera', what: 'updated collection', target: 'Product Documentation', icon: Library, time: '5h ago', grad: 'from-sky-500 to-blue-500' },
  { who: 'Research Agent', what: 'referenced file', target: 'Customer Research Data.xlsx', icon: Bot, time: '6h ago', grad: 'from-cyan-500 to-sky-500' },
  { who: 'Workflow', what: 'created document', target: 'Weekly Report.pdf', icon: Workflow, time: '8h ago', grad: 'from-fuchsia-500 to-pink-500' },
  { who: 'Sam Park', what: 'shared', target: 'demo-walkthrough.mp4', icon: Share2, time: '12h ago', grad: 'from-amber-500 to-orange-500' },
  { who: 'AI System', what: 'embedded vectors for', target: 'API Documentation.md', icon: Zap, time: '1d ago', grad: 'from-purple-500 to-violet-500' },
  { who: 'Jordan Lee', what: 'starred', target: 'App.jsx', icon: Star, time: '1d ago', grad: 'from-rose-500 to-red-500' },
];

// ─── Sharing ────────────────────────────────────────────
export const SHARING = {
  levels: [
    { level: 'Private', icon: Lock, desc: 'Only you can access', count: 8420, grad: 'from-zinc-500 to-slate-500', color: 'text-zinc-400' },
    { level: 'Shared', icon: Users, desc: 'Shared with team members', count: 3280, grad: 'from-sky-500 to-blue-500', color: 'text-sky-400' },
    { level: 'Public', icon: Globe2, desc: 'Accessible to everyone', count: 124, grad: 'from-emerald-500 to-teal-500', color: 'text-emerald-400' },
  ],
  teamAccess: [
    { name: 'Maya Chen', role: 'Finance Lead', access: 'Full Access', avatar: 'MC', grad: 'from-violet-500 to-indigo-500' },
    { name: 'Alex Rivera', role: 'Product Manager', access: 'Edit', avatar: 'AR', grad: 'from-sky-500 to-blue-500' },
    { name: 'Sam Park', role: 'Researcher', access: 'View', avatar: 'SP', grad: 'from-emerald-500 to-teal-500' },
    { name: 'Jordan Lee', role: 'Designer', access: 'Comment', avatar: 'JL', grad: 'from-fuchsia-500 to-pink-500' },
  ],
  permissions: [
    { level: 'Owner', icon: Shield, desc: 'Full control including delete', grad: 'from-violet-500 to-indigo-500' },
    { level: 'Editor', icon: FileCheck, desc: 'Can edit and share', grad: 'from-sky-500 to-blue-500' },
    { level: 'Commenter', icon: MessageSquare, desc: 'Can view and comment', grad: 'from-amber-500 to-orange-500' },
    { level: 'Viewer', icon: Eye, desc: 'Read-only access', grad: 'from-emerald-500 to-teal-500' },
  ],
};

// ─── Right Sidebar ──────────────────────────────────────
export const RIGHT_SIDEBAR = {
  notifications: [
    { title: 'AI indexed 12 new documents', detail: 'Finance collection', time: '5', icon: Brain, color: 'text-emerald-400', grad: 'from-emerald-500 to-teal-500' },
    { title: 'Storage sync completed', detail: 'Google Drive', time: '12', icon: RefreshCw, color: 'text-sky-400', grad: 'from-sky-500 to-blue-500' },
    { title: 'New shared file from Alex', detail: 'Roadmap.docx', time: '28', icon: Share2, color: 'text-violet-400', grad: 'from-violet-500 to-indigo-500' },
    { title: 'Vector embeddings ready', detail: '2,400 files', time: '45', icon: Zap, color: 'text-amber-400', grad: 'from-amber-500 to-orange-500' },
  ],
  recentUploads: [
    { name: 'Q3 Financial Report.pdf', type: 'pdf', time: '2h ago', icon: FileText, grad: 'from-red-500 to-rose-500' },
    { name: 'Product Roadmap.docx', type: 'docx', time: '5h ago', icon: FileText, grad: 'from-blue-500 to-indigo-500' },
    { name: 'hero-banner.png', type: 'png', time: '4h ago', icon: Image, grad: 'from-rose-500 to-pink-500' },
    { name: 'App.jsx', type: 'jsx', time: '1h ago', icon: FileCode, grad: 'from-sky-500 to-cyan-500' },
  ],
  recentSearches: [
    { query: 'Q3 revenue growth', time: '5m ago', results: 12 },
    { query: 'AI workforce ROI', time: '20m ago', results: 8 },
    { query: 'market expansion strategy', time: '1h ago', results: 24 },
    { query: 'API documentation', time: '3h ago', results: 6 },
  ],
  aiSuggestions: [
    { text: 'Index 4 new PDFs in Finance collection', icon: Brain, grad: 'from-violet-500 to-indigo-500' },
    { text: 'Create collection for Q4 Planning docs', icon: Library, grad: 'from-fuchsia-500 to-pink-500' },
    { text: 'Connect Notion workspace for sync', icon: BookOpen, grad: 'from-zinc-500 to-slate-500' },
    { text: 'Pin Q3 Report to Project Memory', icon: Pin, grad: 'from-rose-500 to-red-500' },
  ],
  storage: { used: 847, total: 2048, grad: 'from-violet-500 to-indigo-500' },
  quickActions: [
    { label: 'Upload File', icon: Upload, grad: 'from-violet-500 to-indigo-500' },
    { label: 'New Collection', icon: Library, grad: 'from-fuchsia-500 to-pink-500' },
    { label: 'AI Search', icon: Search, grad: 'from-sky-500 to-blue-500' },
    { label: 'Connect Drive', icon: Cloud, grad: 'from-emerald-500 to-teal-500' },
  ],
};

// ─── Status Styles ──────────────────────────────────────
export const KNOWLEDGE_STATUS = {
  indexed: { label: 'Indexed', dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  pending: { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-400', badge: 'bg-amber-400/10 text-amber-400' },
  processing: { label: 'Processing', dot: 'bg-sky-400', text: 'text-sky-400', badge: 'bg-sky-400/10 text-sky-400' },
  failed: { label: 'Failed', dot: 'bg-rose-400', text: 'text-rose-400', badge: 'bg-rose-400/10 text-rose-400' },
};

export const STORAGE_STATUS = {
  connected: { label: 'Connected', dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400' },
  available: { label: 'Available', dot: 'bg-zinc-500', text: 'text-zinc-400', badge: 'bg-zinc-400/10 text-zinc-400' },
  syncing: { label: 'Syncing', dot: 'bg-sky-400', text: 'text-sky-400', badge: 'bg-sky-400/10 text-sky-400' },
  error: { label: 'Error', dot: 'bg-rose-400', text: 'text-rose-400', badge: 'bg-rose-400/10 text-rose-400' },
};