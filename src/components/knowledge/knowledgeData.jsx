// Mock data for Knowledge Management. Placeholder only — backend ready.
import {
  Building2, Package, Users, FileCode, FlaskConical, ScrollText,
  FileText, Globe, LinkIcon, HardDrive, FileBox, Github, Database, Plug,
} from 'lucide-react';

export const KB_ICONS = {
  'Company Knowledge': { icon: Building2, grad: 'from-violet-500 to-indigo-500' },
  'Product Knowledge': { icon: Package, grad: 'from-emerald-500 to-teal-500' },
  'Customer Knowledge': { icon: Users, grad: 'from-fuchsia-500 to-pink-500' },
  'Technical Documentation': { icon: FileCode, grad: 'from-sky-500 to-cyan-500' },
  'Research': { icon: FlaskConical, grad: 'from-amber-500 to-orange-500' },
  'Policies': { icon: ScrollText, grad: 'from-rose-500 to-pink-500' },
};

export const STATUS_STYLE = {
  Ready: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Indexing: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  Syncing: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Error: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const SOURCE_TYPES = [
  { id: 'file', label: 'Files', icon: FileText, grad: 'from-sky-500 to-cyan-500', hint: 'PDF, DOCX, MD, TXT' },
  { id: 'website', label: 'Websites', icon: Globe, grad: 'from-emerald-500 to-teal-500', hint: 'Crawl a full site' },
  { id: 'url', label: 'URLs', icon: LinkIcon, grad: 'from-violet-500 to-indigo-500', hint: 'Single pages' },
  { id: 'gdrive', label: 'Google Drive', icon: HardDrive, grad: 'from-amber-500 to-orange-500', hint: 'Folders & docs' },
  { id: 'notion', label: 'Notion', icon: FileBox, grad: 'from-zinc-500 to-zinc-700', hint: 'Pages & databases' },
  { id: 'github', label: 'GitHub', icon: Github, grad: 'from-violet-500 to-fuchsia-500', hint: 'Repos & code' },
  { id: 'database', label: 'Databases', icon: Database, grad: 'from-rose-500 to-pink-500', hint: 'SQL / NoSQL' },
  { id: 'api', label: 'APIs', icon: Plug, grad: 'from-cyan-500 to-blue-500', hint: 'REST / GraphQL' },
];

export const KBs = [
  { id: 'kb-1', name: 'Company Knowledge', docs: 1240, web: 86, databases: 4, agents: 7, lastIndexed: '12 min ago', status: 'Ready', sources: ['file', 'url', 'notion', 'gdrive'] },
  { id: 'kb-2', name: 'Product Knowledge', docs: 642, web: 38, databases: 2, agents: 5, lastIndexed: '1 hr ago', status: 'Ready', sources: ['file', 'url', 'github'] },
  { id: 'kb-3', name: 'Customer Knowledge', docs: 3180, web: 12, databases: 6, agents: 4, lastIndexed: 'indexing…', status: 'Indexing', sources: ['database', 'api', 'file'] },
  { id: 'kb-4', name: 'Technical Documentation', docs: 2890, web: 145, databases: 1, agents: 9, lastIndexed: 'syncing…', status: 'Syncing', sources: ['file', 'github', 'url'] },
  { id: 'kb-5', name: 'Research', docs: 920, web: 210, databases: 0, agents: 3, lastIndexed: '2 days ago', status: 'Ready', sources: ['file', 'website'] },
  { id: 'kb-6', name: 'Policies', docs: 184, web: 6, databases: 1, agents: 2, lastIndexed: 'error', status: 'Error', sources: ['file', 'notion'] },
];

// AI search mock result keyed by a question template.
export const AI_SEARCH_EXAMPLES = [
  'What are our refund policies?',
  'How do agents authenticate to the API?',
  'Who is the owner of the Research project?',
  'What is our brand voice?',
];

export const AI_SEARCH_RESULT = {
  answer: 'Customers can request a full refund within 30 days of purchase for digital subscriptions, and 14 days for annual plans. Refunds are issued to the original payment method within 5–7 business days. Custom and enterprise contracts are non-refundable except where a termination clause applies. To request a refund, contact billing or open a ticket in the Customer Support portal.',
  confidence: 0.92,
  sources: [
    { title: 'Refund Policy v3.2', type: 'PDF', kb: 'Policies', snippet: '…full refund within 30 days of purchase for digital subscriptions…' },
    { title: 'Billing FAQ', type: 'Web', kb: 'Company Knowledge', snippet: '…refunds issued to the original payment method within 5–7 business days…' },
    { title: 'Enterprise Terms', type: 'DOCX', kb: 'Policies', snippet: '…non-refundable except where a termination clause applies…' },
  ],
  related: [
    'Cancellation Policy v2.0',
    'Subscription Downgrades',
    'Chargeback Disputes',
    'Enterprise SLA',
  ],
};