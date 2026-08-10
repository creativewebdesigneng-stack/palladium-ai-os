// Unified mock data for the PalladiumAI Main AI Marketplace.
// All items are illustrative mock data — not real listings.

export const DISCLAIMER = 'Listings shown are illustrative mock data and do not represent real marketplace items.';

export const CATEGORIES = [
  { id: 'agents', label: 'AI Agents', icon: 'Bot' },
  { id: 'tools', label: 'AI Tools', icon: 'Wrench' },
  { id: 'models', label: 'AI Models', icon: 'Cpu' },
  { id: 'workflows', label: 'Workflows', icon: 'Workflow' },
  { id: 'templates', label: 'Templates', icon: 'LayoutTemplate' },
  { id: 'plugins', label: 'Plugins', icon: 'Plug' },
  { id: 'integrations', label: 'Integrations', icon: 'Layers' },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid' },
];

export const COLLECTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'trending', label: 'Trending' },
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'New' },
  { id: 'free', label: 'Free' },
  { id: 'enterprise', label: 'Enterprise' },
];

const GRADS = {
  violet: 'from-violet-500 to-indigo-500',
  sky: 'from-cyan-500 to-sky-500',
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500',
  fuchsia: 'from-fuchsia-500 to-pink-500',
  blue: 'from-blue-500 to-indigo-500',
  rose: 'from-rose-500 to-pink-500',
  slate: 'from-slate-500 to-zinc-500',
};

export const ITEMS = [
  { id: 'i1', name: 'Atlas Revenue Intelligence', type: 'agents', creator: 'c1', desc: 'Autonomous revenue forecasting, pipeline analysis and deal coaching across your CRM.', tags: ['featured','trending','popular','enterprise'], rating: 4.9, reviews: 842, downloads: '124k', price: '£29/mo', free: false, verified: true, updated: 'Aug 6', grad: GRADS.violet, capabilities: ['Forecasting','Pipeline analysis','Deal coaching'], models: 'GPT-5, Claude' },
  { id: 'i2', name: 'Forge Code Reviewer', type: 'agents', creator: 'c2', desc: 'AI code review with security, performance and style checks.', tags: ['trending','popular','new','free'], rating: 4.9, reviews: 2010, downloads: '132k', price: 'Free', free: true, verified: true, updated: 'Aug 5', grad: GRADS.emerald, capabilities: ['Code review','Security checks','PR automation'], models: 'Claude, GPT-5' },
  { id: 'i3', name: 'Compass Research Agent', type: 'agents', creator: 'c4', desc: 'Deep research with citations across 10k+ sources.', tags: ['trending','new','enterprise'], rating: 4.9, reviews: 712, downloads: '49k', price: '£12/mo', free: false, verified: true, updated: 'Aug 4', grad: GRADS.sky, capabilities: ['Web search','Citations','Reports'], models: 'Gemini, GPT-5' },
  { id: 'i4', name: 'Sentinel SOC Analyst', type: 'agents', creator: 'c5', desc: 'Autonomous security operations with threat triage.', tags: ['trending','popular','enterprise'], rating: 4.9, reviews: 842, downloads: '54k', price: '£19/mo', free: false, verified: true, updated: 'Aug 2', grad: GRADS.blue, capabilities: ['Threat triage','Alerting','Compliance'], models: 'Claude' },
  { id: 'i5', name: 'Quill Content Studio', type: 'apps', creator: 'c3', desc: 'Multi-agent content engine for blogs, ads and SEO at scale.', tags: ['featured','popular','enterprise'], rating: 5.0, reviews: 430, downloads: '67k', price: '£15/mo', free: false, verified: true, updated: 'Aug 5', grad: GRADS.amber, capabilities: ['Content gen','SEO','Multi-format'], models: 'GPT-5' },
  { id: 'i6', name: 'Nexus CRM Suite', type: 'apps', creator: 'c6', desc: 'Full-featured CRM with AI-driven lead scoring.', tags: ['trending','popular','enterprise'], rating: 4.8, reviews: 1120, downloads: '89k', price: '£19/mo', free: false, verified: true, updated: 'Jul 30', grad: GRADS.sky, capabilities: ['Lead scoring','Pipeline','Enrichment'], models: 'GPT-5' },
  { id: 'i7', name: 'Pulse Support Desk', type: 'apps', creator: 'c6', desc: 'Tier-1/Tier-2 customer support automation platform.', tags: ['trending','popular'], rating: 4.8, reviews: 930, downloads: '67k', price: '£15/mo', free: false, verified: false, updated: 'Jul 28', grad: GRADS.amber, capabilities: ['Ticket triage','Auto-reply','KB search'], models: 'Claude' },
  { id: 'i8', name: 'FlowOps Automation Pack', type: 'workflows', creator: 'c1', desc: '120+ pre-built automations for sales, marketing, ops and support.', tags: ['featured','popular'], rating: 4.7, reviews: 640, downloads: '480k', price: '£9/mo', free: false, verified: true, updated: 'Aug 1', grad: GRADS.blue, capabilities: ['120 automations','No-code','Templates'], models: 'n/a' },
  { id: 'i9', name: 'Lead Generation Workflow', type: 'workflows', creator: 'c1', desc: 'Capture, enrich and route leads automatically.', tags: ['trending','new'], rating: 4.8, reviews: 410, downloads: '88k', price: '£12/mo', free: false, verified: true, updated: 'Aug 3', grad: GRADS.violet, capabilities: ['Capture','Enrichment','Routing'], models: 'GPT-5' },
  { id: 'i10', name: 'Content Creation Pipeline', type: 'workflows', creator: 'c3', desc: 'Brief to publish multi-format content pipeline.', tags: ['popular','new'], rating: 4.9, reviews: 320, downloads: '67k', price: '£15/mo', free: false, verified: true, updated: 'Aug 4', grad: GRADS.fuchsia, capabilities: ['Brief to publish','Multi-format','Scheduling'], models: 'GPT-5, Gemini' },
  { id: 'i11', name: 'SaaS Landing Template', type: 'templates', creator: 'c3', desc: 'Production-ready landing page for SaaS products.', tags: ['popular','free'], rating: 4.7, reviews: 540, downloads: '210k', price: 'Free', free: true, verified: true, updated: 'Jul 22', grad: GRADS.sky, capabilities: ['Responsive','Dark mode','SEO'], models: 'n/a' },
  { id: 'i12', name: 'Investor Pitch Deck', type: 'templates', creator: 'c1', desc: 'Editable pitch deck template with 40 slides.', tags: ['trending','new'], rating: 4.8, reviews: 260, downloads: '74k', price: '£9', free: false, verified: true, updated: 'Aug 5', grad: GRADS.amber, capabilities: ['40 slides','Charts','Editable'], models: 'n/a' },
  { id: 'i13', name: 'NDA Template', type: 'templates', creator: 'c5', desc: 'Lawyer-reviewed non-disclosure agreement template.', tags: ['popular','enterprise'], rating: 4.6, reviews: 180, downloads: '210k', price: 'Free', free: true, verified: true, updated: 'Jul 18', grad: GRADS.slate, capabilities: ['Lawyer-reviewed','Editable','Multi-jurisdiction'], models: 'n/a' },
  { id: 'i14', name: 'GitHub Power Sync', type: 'plugins', creator: 'c2', desc: 'Bi-directional repo sync, release automation and AI PR reviews.', tags: ['featured','trending','popular','free'], rating: 4.9, reviews: 1820, downloads: '210k', price: 'Free', free: true, verified: true, updated: 'Aug 3', grad: GRADS.emerald, capabilities: ['Repo sync','Releases','AI PR review'], models: 'Claude' },
  { id: 'i15', name: 'Slack Plugin', type: 'plugins', creator: 'c6', desc: 'Channel alerts, slash commands and AI summaries.', tags: ['popular','free'], rating: 4.8, reviews: 980, downloads: '180k', price: 'Free', free: true, verified: true, updated: 'Jul 20', grad: GRADS.violet, capabilities: ['Alerts','Commands','Summaries'], models: 'GPT-5' },
  { id: 'i16', name: 'Stripe Payments', type: 'integrations', creator: 'c6', desc: 'Payments, subscriptions and billing integration.', tags: ['featured','popular','enterprise'], rating: 4.9, reviews: 1240, downloads: '150k', price: 'Free', free: true, verified: true, updated: 'Aug 1', grad: GRADS.blue, capabilities: ['Payments','Subscriptions','Invoicing'], models: 'n/a' },
  { id: 'i17', name: 'Salesforce Connector', type: 'integrations', creator: 'c6', desc: 'Enterprise CRM sync with bidirectional records.', tags: ['enterprise'], rating: 4.8, reviews: 640, downloads: '98k', price: '£19/mo', free: false, verified: true, updated: 'Jul 25', grad: GRADS.sky, capabilities: ['CRM sync','Webhooks','Bulk ops'], models: 'n/a' },
  { id: 'i18', name: 'Notion Sync', type: 'integrations', creator: 'c6', desc: 'Docs and database sync with Notion.', tags: ['popular','free'], rating: 4.8, reviews: 720, downloads: '142k', price: 'Free', free: true, verified: true, updated: 'Jul 19', grad: GRADS.slate, capabilities: ['Docs sync','Databases','Search'], models: 'n/a' },
  { id: 'i19', name: 'Palladium GPT-5 Pro', type: 'models', creator: 'c1', desc: 'Hosted GPT-5 with extended context and tool use.', tags: ['featured','trending','enterprise'], rating: 4.9, reviews: 920, downloads: '—', price: '£0.02/1k tok', free: false, verified: true, updated: 'Aug 6', grad: GRADS.violet, capabilities: ['128k context','Tool use','Vision'], models: 'GPT-5' },
  { id: 'i20', name: 'Claude Sonnet Hosted', type: 'models', creator: 'c1', desc: 'Low-latency Claude with streaming and code tools.', tags: ['trending','popular'], rating: 4.8, reviews: 760, downloads: '—', price: '£0.018/1k tok', free: false, verified: true, updated: 'Aug 4', grad: GRADS.emerald, capabilities: ['Streaming','Code tools','Vision'], models: 'Claude' },
  { id: 'i21', name: 'Palladium Vision XL', type: 'models', creator: 'c3', desc: 'Image generation model with style controls.', tags: ['new','popular'], rating: 4.6, reviews: 410, downloads: '—', price: '£0.04/image', free: false, verified: false, updated: 'Aug 2', grad: GRADS.fuchsia, capabilities: ['Image gen','Style control','Batch'], models: 'Custom' },
  { id: 'i22', name: 'Sentiment Analyzer Tool', type: 'tools', creator: 'c4', desc: 'Real-time sentiment and intent classification.', tags: ['new','free'], rating: 4.7, reviews: 280, downloads: '64k', price: 'Free', free: true, verified: true, updated: 'Aug 3', grad: GRADS.sky, capabilities: ['Sentiment','Intent','Batch'], models: 'GPT-5' },
  { id: 'i23', name: 'PDF Extractor Tool', type: 'tools', creator: 'c2', desc: 'Extract structured data from PDFs and invoices.', tags: ['popular','enterprise'], rating: 4.8, reviews: 520, downloads: '92k', price: '£8/mo', free: false, verified: true, updated: 'Jul 28', grad: GRADS.amber, capabilities: ['OCR','Tables','Invoice parsing'], models: 'Gemini' },
  { id: 'i24', name: 'Sonar Voice Agent', type: 'agents', creator: 'c6', desc: 'Real-time voice assistant with sub-300ms latency.', tags: ['new','trending'], rating: 4.8, reviews: 140, downloads: '12k', price: '£25/mo', free: false, verified: false, updated: 'Aug 6', grad: GRADS.rose, capabilities: ['Real-time voice','40+ languages','TTS'], models: 'GPT-5' },
];

export const CREATORS = [
  { id: 'c1', name: 'Palladium Labs', handle: '@palladium', verified: true, followers: '248k', items: 42, downloads: '4.8M', revenue: '£1.2M', grad: GRADS.violet },
  { id: 'c2', name: 'DevForge', handle: '@devforge', verified: true, followers: '180k', items: 28, downloads: '3.2M', revenue: '£890k', grad: GRADS.emerald },
  { id: 'c3', name: 'InkForge', handle: '@inkforge', verified: true, followers: '142k', items: 19, downloads: '2.1M', revenue: '£640k', grad: GRADS.amber },
  { id: 'c4', name: 'InsightAI', handle: '@insightai', verified: true, followers: '98k', items: 16, downloads: '1.4M', revenue: '£420k', grad: GRADS.sky },
  { id: 'c5', name: 'CyberDyne', handle: '@cyberdyne', verified: true, followers: '76k', items: 12, downloads: '980k', revenue: '£380k', grad: GRADS.blue },
  { id: 'c6', name: 'Vertex Studios', handle: '@vertex', verified: true, followers: '120k', items: 24, downloads: '2.6M', revenue: '£740k', grad: GRADS.fuchsia },
];

export const REVIEWS = [
  { author: 'James Whitfield', avatarGrad: GRADS.violet, rating: 5, verified: true, comment: 'Transformed our forecasting — we cut pipeline review time by 70% in the first month.', date: '2 days ago' },
  { author: 'Sofia Marchetti', avatarGrad: GRADS.fuchsia, rating: 5, verified: true, comment: 'Generates a full quarter of campaign creative in minutes. Worth every penny.', date: '1 week ago' },
  { author: 'Daniel Okafor', avatarGrad: GRADS.emerald, rating: 4, verified: true, comment: 'Solid for bookkeeping. Would love more bank integrations, but the forecasting is best-in-class.', date: '3 days ago' },
  { author: 'Priya Nair', avatarGrad: GRADS.sky, rating: 5, verified: false, comment: 'Catches bugs our senior engineers miss. Mandatory step in our PR workflow now.', date: '5 days ago' },
  { author: 'Marcus Chen', avatarGrad: GRADS.amber, rating: 5, verified: true, comment: 'Reduced our ticket backlog by 80%. Tier-1 automation handles 70% of issues autonomously.', date: '1 day ago' },
];

export function creatorById(id) { return CREATORS.find(c => c.id === id) || CREATORS[0]; }
export function itemsByCreator(id) { return ITEMS.filter(i => i.creator === id); }