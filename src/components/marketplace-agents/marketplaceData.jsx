// Mock data store for the AI Agent Marketplace.
// Replace AGENTS + reviews with backend reads when ready.

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'LayoutGrid', grad: 'from-violet-500 to-indigo-500' },
  { id: 'development', label: 'Development', icon: 'Code2', grad: 'from-sky-500 to-cyan-500' },
  { id: 'research', label: 'Research', icon: 'Microscope', grad: 'from-emerald-500 to-teal-500' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone', grad: 'from-fuchsia-500 to-pink-500' },
  { id: 'sales', label: 'Sales', icon: 'TrendingUp', grad: 'from-amber-500 to-orange-500' },
  { id: 'finance', label: 'Finance', icon: 'LineChart', grad: 'from-emerald-500 to-green-600' },
  { id: 'support', label: 'Customer Support', icon: 'Headphones', grad: 'from-rose-500 to-red-500' },
  { id: 'operations', label: 'Operations', icon: 'Cog', grad: 'from-zinc-500 to-slate-600' },
  { id: 'hr', label: 'HR', icon: 'Users', grad: 'from-cyan-500 to-blue-500' },
  { id: 'design', label: 'Design', icon: 'Palette', grad: 'from-fuchsia-500 to-purple-500' },
  { id: 'data', label: 'Data', icon: 'Database', grad: 'from-indigo-500 to-violet-500' },
  { id: 'automation', label: 'Automation', icon: 'Workflow', grad: 'from-amber-500 to-yellow-500' },
  { id: 'business', label: 'Business', icon: 'Briefcase', grad: 'from-slate-500 to-zinc-600' },
  { id: 'personal', label: 'Personal', icon: 'User', grad: 'from-violet-500 to-fuchsia-500' },
];

export const FILTERS = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
  { id: 'popular', label: 'Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'verified', label: 'Verified' },
  { id: 'enterprise', label: 'Enterprise' },
];

export const STATUSES = {
  draft: { label: 'Draft', cls: 'bg-zinc-500/15 text-zinc-300' },
  pending_review: { label: 'Pending review', cls: 'bg-amber-500/15 text-amber-300' },
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Rejected', cls: 'bg-rose-500/15 text-rose-300' },
  removed: { label: 'Removed', cls: 'bg-zinc-700/30 text-zinc-500' },
};

export const AGENTS = [
  {
    id: 'dev', name: 'Developer Agent', category: 'development', grad: 'from-sky-500 to-cyan-500', initials: 'DA',
    description: 'Writes, reviews and ships code across your repos — PRs, tests and refactors included.',
    capabilities: ['Code generation', 'PR review', 'Test writing', 'Refactoring', 'Debugging'],
    tools: ['GitHub', 'Terminal', 'File system', 'Linter'], models: ['Claude Sonnet 4.6', 'GPT-5.4'],
    memory: 'Persistent project context + codebase index', knowledge: ['Repo docs', 'Coding standards', 'Architecture decisions'],
    integrations: ['GitHub', 'GitLab', 'Slack'], rating: 4.8, reviewsCount: 412, runs: '128.4k',
    creator: { name: 'Palladium Labs', verified: true }, price: 'Free', isNew: false, isPopular: true, isVerified: true, isEnterprise: true,
    usage: { installs: 18420, successRate: 96, avgRunTime: '42s' },
    versions: [{ v: '3.2.0', date: '2 Aug 2026', notes: 'Multi-file refactors + PR review v2' }, { v: '3.1.0', date: '14 Jul 2026', notes: 'Test generation improvements' }, { v: '3.0.0', date: '1 Jun 2026', notes: 'Initial public release' }],
    reviews: [
      { user: 'Maya P.', rating: 5, text: 'Cuts our review backlog in half. Excellent refactors.', date: '3 days ago' },
      { user: 'Devon R.', rating: 4, text: 'Great for boilerplate; occasionally needs a nudge on edge cases.', date: '2 weeks ago' },
    ],
  },
  {
    id: 'research', name: 'Research Agent', category: 'research', grad: 'from-emerald-500 to-teal-500', initials: 'RA',
    description: 'Synthesises market briefs, competitive analysis and literature reviews from web + internal data.',
    capabilities: ['Web research', 'Citation tracking', 'Summarisation', 'Trend analysis', 'Report writing'],
    tools: ['Web browser', 'Knowledge Hub', 'Citation engine'], models: ['Gemini 2.5 Pro', 'Claude Sonnet 4.6'],
    memory: 'Topic-scoped working memory', knowledge: ['Internal docs', 'Web index', 'Industry reports'],
    integrations: ['Notion', 'Google Docs'], rating: 4.7, reviewsCount: 318, runs: '94.1k',
    creator: { name: 'Insight AI', verified: true }, price: '$19/mo', isNew: false, isPopular: true, isVerified: true, isEnterprise: false,
    usage: { installs: 9210, successRate: 92, avgRunTime: '1m 12s' },
    versions: [{ v: '2.4.0', date: '28 Jul 2026', notes: 'Faster citation resolution' }, { v: '2.3.0', date: '10 Jul 2026', notes: 'Report export to PDF' }],
    reviews: [
      { user: 'Aisha K.', rating: 5, text: 'Market briefs in minutes instead of days.', date: '1 week ago' },
      { user: 'Tom B.', rating: 4, text: 'Citations are solid; sometimes over-summarises.', date: '3 weeks ago' },
    ],
  },
  {
    id: 'marketing', name: 'Marketing Agent', category: 'marketing', grad: 'from-fuchsia-500 to-pink-500', initials: 'MA',
    description: 'Plans campaigns, drafts copy and schedules multi-channel content with brand consistency.',
    capabilities: ['Campaign planning', 'Copywriting', 'SEO optimisation', 'Content scheduling', 'A/B testing'],
    tools: ['Content editor', 'Scheduler', 'SEO analyser'], models: ['GPT-5.4', 'Claude Sonnet 4.6'],
    memory: 'Brand voice + audience profiles', knowledge: ['Brand guidelines', 'Buyer personas', 'Past campaigns'],
    integrations: ['HubSpot', 'Mailchimp', 'LinkedIn'], rating: 4.6, reviewsCount: 256, runs: '71.8k',
    creator: { name: 'BrandForge', verified: true }, price: '$29/mo', isNew: false, isPopular: true, isVerified: true, isEnterprise: true,
    usage: { installs: 6430, successRate: 89, avgRunTime: '38s' },
    versions: [{ v: '1.9.0', date: '30 Jul 2026', notes: 'LinkedIn carousel generation' }, { v: '1.8.0', date: '12 Jul 2026', notes: 'Brand voice tuning' }],
    reviews: [
      { user: 'Lena M.', rating: 5, text: 'On-brand copy every time. Huge time saver.', date: '5 days ago' },
    ],
  },
  {
    id: 'sales', name: 'Sales Agent', category: 'sales', grad: 'from-amber-500 to-orange-500', initials: 'SA',
    description: 'Qualifies leads, drafts outreach sequences and updates your CRM with real-time context.',
    capabilities: ['Lead qualification', 'Outreach drafting', 'CRM updates', 'Meeting prep', 'Pipeline forecasting'],
    tools: ['CRM', 'Email', 'Calendar'], models: ['Claude Sonnet 4.6'],
    memory: 'Deal history + account context', knowledge: ['ICP definitions', 'Pricing playbook'],
    integrations: ['Salesforce', 'HubSpot', 'Gmail', 'Calendar'], rating: 4.5, reviewsCount: 198, runs: '58.2k',
    creator: { name: 'RevOps Co', verified: true }, price: '$39/mo', isNew: false, isPopular: true, isVerified: true, isEnterprise: true,
    usage: { installs: 4120, successRate: 88, avgRunTime: '24s' },
    versions: [{ v: '2.0.0', date: '20 Jul 2026', notes: 'Forecasting module' }],
    reviews: [
      { user: 'Carlos D.', rating: 5, text: 'Replies up 40% since we turned this on.', date: '4 days ago' },
    ],
  },
  {
    id: 'finance', name: 'Finance Agent', category: 'finance', grad: 'from-emerald-500 to-green-600', initials: 'FA',
    description: 'Reconciles transactions, flags anomalies and generates financial summaries on schedule.',
    capabilities: ['Reconciliation', 'Anomaly detection', 'Reporting', 'Forecasting', 'Expense categorisation'],
    tools: ['Ledger', 'Spreadsheet', 'Bank feeds'], models: ['GPT-5.4'],
    memory: 'Chart of accounts + policies', knowledge: ['Accounting policies', 'Historical ledger'],
    integrations: ['QuickBooks', 'Xero', 'Stripe'], rating: 4.4, reviewsCount: 142, runs: '32.6k',
    creator: { name: 'LedgerLogic', verified: true }, price: '$49/mo', isNew: false, isPopular: false, isVerified: true, isEnterprise: true,
    usage: { installs: 2110, successRate: 94, avgRunTime: '2m 05s' },
    versions: [{ v: '1.5.0', date: '18 Jul 2026', notes: 'Anomaly thresholds' }],
    reviews: [
      { user: 'Priya S.', rating: 4, text: 'Catches things our team missed. Worth the price.', date: '2 weeks ago' },
    ],
  },
  {
    id: 'support', name: 'Customer Support Agent', category: 'support', grad: 'from-rose-500 to-red-500', initials: 'CS',
    description: 'Triage, route and resolve customer tickets with empathy — escalating to humans when needed.',
    capabilities: ['Ticket triage', 'Reply drafting', 'Resolution suggestion', 'Sentiment analysis', 'Escalation'],
    tools: ['Help desk', 'Knowledge search', 'Sentiment'], models: ['Claude Sonnet 4.6', 'Gemini 2.5 Pro'],
    memory: 'Customer history + SLAs', knowledge: ['Help center', 'Runbooks', 'Past tickets'],
    integrations: ['Zendesk', 'Intercom', 'Slack'], rating: 4.7, reviewsCount: 521, runs: '210.3k',
    creator: { name: 'Palladium Labs', verified: true }, price: 'Free', isNew: false, isPopular: true, isVerified: true, isEnterprise: true,
    usage: { installs: 27800, successRate: 91, avgRunTime: '18s' },
    versions: [{ v: '4.1.0', date: '1 Aug 2026', notes: 'Escalation guardrails' }, { v: '4.0.0', date: '15 Jul 2026', notes: 'Multi-language replies' }],
    reviews: [
      { user: 'Nora F.', rating: 5, text: 'Handles 70% of tier-1 tickets autonomously.', date: '6 days ago' },
    ],
  },
  {
    id: 'data', name: 'Data Analyst', category: 'data', grad: 'from-indigo-500 to-violet-500', initials: 'DA',
    description: 'Runs SQL, builds charts and answers data questions in plain English.',
    capabilities: ['SQL generation', 'Chart building', 'Trend analysis', 'Data QA', 'Report assembly'],
    tools: ['SQL runner', 'Chart builder', 'Warehouse'], models: ['Gemini 2.5 Pro'],
    memory: 'Schema + metric definitions', knowledge: ['Data dictionary', 'Metric catalog'],
    integrations: ['BigQuery', 'Snowflake', 'Postgres'], rating: 4.6, reviewsCount: 233, runs: '88.9k',
    creator: { name: 'QueryCraft', verified: false }, price: '$24/mo', isNew: true, isPopular: false, isVerified: false, isEnterprise: false,
    usage: { installs: 3120, successRate: 90, avgRunTime: '55s' },
    versions: [{ v: '1.0.0', date: '30 Jul 2026', notes: 'Initial release' }],
    reviews: [
      { user: 'Owen T.', rating: 5, text: 'Finally, charts without writing SQL.', date: '2 days ago' },
    ],
  },
  {
    id: 'seo', name: 'SEO Agent', category: 'marketing', grad: 'from-fuchsia-500 to-purple-500', initials: 'SE',
    description: 'Audits pages, tracks rankings and recommends content changes that move the needle.',
    capabilities: ['Site audit', 'Rank tracking', 'Keyword research', 'Content gaps', 'Schema markup'],
    tools: ['Crawler', 'Rank tracker', 'SERP analyser'], models: ['GPT-5.4'],
    memory: 'Site map + keyword history', knowledge: ['SEO playbook', 'Competitor sites'],
    integrations: ['Google Search Console', 'Ahrefs'], rating: 4.3, reviewsCount: 96, runs: '21.4k',
    creator: { name: 'RankLab', verified: true }, price: '$34/mo', isNew: true, isPopular: false, isVerified: true, isEnterprise: false,
    usage: { installs: 1640, successRate: 85, avgRunTime: '1m 40s' },
    versions: [{ v: '1.2.0', date: '29 Jul 2026', notes: 'Content gap detection' }],
    reviews: [
      { user: 'Gina H.', rating: 4, text: 'Solid audits; actionable recommendations.', date: '1 week ago' },
    ],
  },
  {
    id: 'social', name: 'Social Media Agent', category: 'marketing', grad: 'from-fuchsia-500 to-pink-500', initials: 'SM',
    description: 'Creates, schedules and engages on social — captions, carousels and replies that match your voice.',
    capabilities: ['Post creation', 'Scheduling', 'Engagement', 'Hashtag research', 'Performance reports'],
    tools: ['Scheduler', 'Media editor', 'Analytics'], models: ['GPT-5.4', 'Gemini 2.5 Pro'],
    memory: 'Content calendar + voice', knowledge: ['Brand voice', 'Top posts'],
    integrations: ['Instagram', 'LinkedIn', 'TikTok'], rating: 4.5, reviewsCount: 174, runs: '40.7k',
    creator: { name: 'BrandForge', verified: true }, price: '$22/mo', isNew: false, isPopular: true, isVerified: true, isEnterprise: false,
    usage: { installs: 4980, successRate: 87, avgRunTime: '30s' },
    versions: [{ v: '2.1.0', date: '22 Jul 2026', notes: 'Carousel generation' }],
    reviews: [
      { user: 'Ravi M.', rating: 5, text: 'Our calendar finally stays full.', date: '4 days ago' },
    ],
  },
  {
    id: 'pm', name: 'Project Manager', category: 'operations', grad: 'from-zinc-500 to-slate-600', initials: 'PM',
    description: 'Keeps projects on track — status updates, risk flags and automatic standup summaries.',
    capabilities: ['Status reports', 'Risk detection', 'Standup summaries', 'Capacity planning', 'Roadmap tracking'],
    tools: ['Task tracker', 'Calendar', 'Docs'], models: ['Claude Sonnet 4.6'],
    memory: 'Project timelines + owners', knowledge: ['Project plans', 'Team capacity'],
    integrations: ['Jira', 'ClickUp', 'Asana'], rating: 4.4, reviewsCount: 128, runs: '29.5k',
    creator: { name: 'Palladium Labs', verified: true }, price: 'Free', isNew: false, isPopular: false, isVerified: true, isEnterprise: true,
    usage: { installs: 5210, successRate: 89, avgRunTime: '20s' },
    versions: [{ v: '2.0.0', date: '10 Jul 2026', notes: 'Risk scoring engine' }],
    reviews: [
      { user: 'Sara L.', rating: 4, text: 'Standups write themselves now.', date: '2 weeks ago' },
    ],
  },
  {
    id: 'recruit', name: 'Recruitment Agent', category: 'hr', grad: 'from-cyan-500 to-blue-500', initials: 'RC',
    description: 'Sources, screens and schedules candidates — keeping hiring managers in the loop.',
    capabilities: ['Candidate sourcing', 'Screening', 'Interview scheduling', 'Profile scoring', 'Outreach'],
    tools: ['ATS', 'Email', 'Calendar'], models: ['Claude Sonnet 4.6'],
    memory: 'Role requirements + pipeline', knowledge: ['Job specs', 'Interview rubrics'],
    integrations: ['Greenhouse', 'BambooHR', 'LinkedIn'], rating: 4.2, reviewsCount: 74, runs: '12.1k',
    creator: { name: 'TalentForge', verified: true }, price: '$44/mo', isNew: true, isPopular: false, isVerified: true, isEnterprise: false,
    usage: { installs: 980, successRate: 83, avgRunTime: '45s' },
    versions: [{ v: '1.1.0', date: '27 Jul 2026', notes: 'Profile scoring' }],
    reviews: [
      { user: 'Helen W.', rating: 4, text: 'Sourcing is fast; screening needs a human check.', date: '5 days ago' },
    ],
  },
  {
    id: 'personal', name: 'Personal Assistant', category: 'personal', grad: 'from-violet-500 to-fuchsia-500', initials: 'PA',
    description: 'Manages your day — inbox triage, scheduling, summaries and reminders.',
    capabilities: ['Inbox triage', 'Scheduling', 'Summaries', 'Reminders', 'Travel planning'],
    tools: ['Email', 'Calendar', 'Notes'], models: ['GPT-5.4'],
    memory: 'Preferences + routines', knowledge: ['Contacts', 'Preferences'],
    integrations: ['Gmail', 'Google Calendar', 'Notion'], rating: 4.6, reviewsCount: 309, runs: '64.2k',
    creator: { name: 'Palladium Labs', verified: true }, price: 'Free', isNew: false, isPopular: true, isVerified: true, isEnterprise: false,
    usage: { installs: 14200, successRate: 93, avgRunTime: '15s' },
    versions: [{ v: '3.0.0', date: '5 Aug 2026', notes: 'Travel planning' }],
    reviews: [
      { user: 'Mark J.', rating: 5, text: 'My inbox has never been this calm.', date: '1 day ago' },
    ],
  },
];

export const CREATOR_FIELDS = [
  { key: 'name', label: 'Agent name', type: 'text', placeholder: 'e.g. Onboarding Agent' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What does your agent do?' },
  { key: 'category', label: 'Category', type: 'select', options: CATEGORIES.slice(1).map((c) => c.label) },
  { key: 'capabilities', label: 'Capabilities', type: 'tags', placeholder: 'Add a capability and press Enter' },
  { key: 'pricing', label: 'Pricing', type: 'select', options: ['Free', '$9/mo', '$19/mo', '$29/mo', '$49/mo', 'Custom'] },
  { key: 'documentation', label: 'Documentation URL', type: 'text', placeholder: 'https://docs…' },
];

// Maps a backend MarketplaceItem record (type 'agent') to the rich display
// shape used by AgentCard / AgentDetailDrawer. Extra presentation data
// (tools, models, versions, reviews, gradient) is carried in `metadata`.
export function normalizeAgent(item) {
  const m = item.metadata || {};
  const priceVal = Number(item.price) || 0;
  const isFree = priceVal === 0;
  return {
    id: item.id,
    name: item.title,
    description: item.description || '',
    category: item.category,
    grad: m.grad || 'from-violet-500 to-indigo-500',
    initials: m.initials || (item.title || '??').slice(0, 2).toUpperCase(),
    capabilities: item.features || m.capabilities || [],
    tools: m.tools || [],
    models: m.models || [],
    memory: m.memory || '',
    knowledge: m.knowledge || [],
    integrations: m.integrations || [],
    rating: Number(item.rating) || 0,
    reviewsCount: Number(item.reviews_count) || 0,
    runs: m.runs || `${Number(item.downloads) || 0}`,
    creator: { name: item.creator_name || 'Unknown', verified: !!m.verified },
    price: isFree ? 'Free' : `£${priceVal}/mo`,
    isNew: !!m.isNew,
    isPopular: !!item.is_featured || !!m.isPopular,
    isVerified: !!m.verified,
    isEnterprise: !!m.isEnterprise,
    usage: { installs: Number(item.downloads) || 0, successRate: m.successRate || 0, avgRunTime: m.avgRunTime || '—' },
    versions: m.versions || [{ v: item.version || '1.0.0', date: '', notes: '' }],
    version: item.version || (m.versions && m.versions[0] ? m.versions[0].v : '1.0.0'),
    creatorId: item.creator_id || item.created_by_id || '',
    requiredPlan: item.required_plan || 'free',
    usageRequirements: item.usage_requirements || '',
    createdDate: item.created_date || '',
    status: item.status || 'published',
    reviews: item.reviews || [],
    _backend: true,
  };
}