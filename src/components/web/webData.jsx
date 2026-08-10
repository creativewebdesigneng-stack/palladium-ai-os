// Mock data for the PalladiumAI Web discovery interface.
// All content is illustrative — backend-ready for a future web search integration.

export const SAMPLE_QUERIES = [
  'Find the best CRM platforms for a small business',
  'Latest breakthroughs in battery technology',
  'Compare React vs Vue for enterprise apps',
  'Top AI startups in London 2026',
];

export const AI_ANSWER = {
  summary: 'For a small business, the best CRM platforms balance ease of use, automation, and price. HubSpot CRM is the strongest free tier for early teams, Zoho CRM Plus offers the broadest feature set at low cost, and Pipedrive is ideal for sales-focused teams that want a simple pipeline. Most also offer AI lead scoring and email automation.',
  keyPoints: [
    'HubSpot CRM — best free tier, strong marketing automation',
    'Zoho CRM Plus — most features per pound, highly customisable',
    'Pipedrive — cleanest sales pipeline, fast onboarding',
    'Salesforce Starter — scalable if you expect fast growth',
  ],
  confidence: 'High · 9 sources',
};

export const SOURCES = [
  { id: 's1', title: 'G2: Best CRM Software for Small Business 2026', url: 'g2.com/categories/crm', snippet: 'User reviews ranking small-business CRMs by ease of use, support, and value.', favicon: 'from-blue-500 to-indigo-500' },
  { id: 's2', title: 'Capterra: Top CRM Systems for SMBs', url: 'capterra.com/crm', snippet: 'Side-by-side comparison of pricing, features and customer ratings.', favicon: 'from-emerald-500 to-teal-500' },
  { id: 's3', title: 'HubSpot: Free CRM for Small Business', url: 'hubspot.com/products/crm', snippet: 'Official overview of HubSpot free CRM features and limits.', favicon: 'from-orange-500 to-amber-500' },
  { id: 's4', title: 'Zoho: CRM Plus for Growing Teams', url: 'zoho.com/crm-plus', snippet: 'Feature list and pricing for the all-in-one Zoho CRM suite.', favicon: 'from-rose-500 to-pink-500' },
  { id: 's5', title: 'Pipedrive: Sales CRM Overview', url: 'pipedrive.com/en/crm', snippet: 'Pipeline-first CRM designed for sales teams.', favicon: 'from-violet-500 to-fuchsia-500' },
  { id: 's6', title: 'Forrester: CRM Market Guide 2026', url: 'forrester.com/report/crm', snippet: 'Analyst report evaluating the SMB CRM market landscape.', favicon: 'from-cyan-500 to-sky-500' },
  { id: 's7', title: 'TechRadar: Best CRM for Small Business', url: 'techradar.com/best/best-crm', snippet: 'Editor-curated list with pros, cons and pricing tiers.', favicon: 'from-slate-500 to-zinc-500' },
  { id: 's8', title: "PCMag: CRM Editors' Choice", url: 'pcmag.com/crm', snippet: 'Tested reviews of leading CRM platforms with ratings.', favicon: 'from-amber-500 to-orange-500' },
  { id: 's9', title: 'GetApp: CRM Buyer Guide', url: 'getapp.com/crm-software', snippet: 'Buyer guide comparing CRM apps for small teams.', favicon: 'from-fuchsia-500 to-purple-500' },
];

export const WEB_RESULTS = [
  { id: 'w1', title: 'The 6 Best Small Business CRMs of 2026', url: 'forbes.com/advisor/business/software/best-crm', favicon: 'from-blue-500 to-indigo-500', snippet: 'Forbes Advisor ranks the top CRM platforms for small businesses based on pricing, features and customer support, highlighting HubSpot, Zoho and Pipedrive as leaders.', date: 'Jul 2026', badge: 'Editorial' },
  { id: 'w2', title: 'Best CRM for Small Business (2026) — G2', url: 'g2.com/categories/crm', favicon: 'from-emerald-500 to-teal-500', snippet: 'Real-user reviews compare CRMs by ease of use and value, with HubSpot scoring highest for SMBs.', date: 'Jul 2026', badge: 'Reviews' },
  { id: 'w3', title: 'Capterra SMB CRM Comparison 2026', url: 'capterra.com/crm', favicon: 'from-rose-500 to-pink-500', snippet: 'Side-by-side comparison of 40+ CRM tools filtered for teams under 50 employees.', date: 'Jun 2026', badge: 'Comparison' },
  { id: 'w4', title: 'Zoho CRM Plus Review — TechRadar', url: 'techradar.com/reviews/zoho-crm-plus', favicon: 'from-violet-500 to-fuchsia-500', snippet: 'TechRadar calls Zoho CRM Plus the best value all-in-one CRM, praising automation and customisation.', date: 'Jun 2026', badge: 'Review' },
  { id: 'w5', title: 'Pipedrive vs HubSpot: Which CRM Wins?', url: 'pcmag.com/reviews/pipedrive-vs-hubspot', favicon: 'from-cyan-500 to-sky-500', snippet: 'PCMag compares pipeline-focused Pipedrive against the all-in-one HubSpot platform.', date: 'May 2026', badge: 'Comparison' },
  { id: 'w6', title: 'Salesforce Starter for SMBs — Review', url: 'salesforce.com/starter', favicon: 'from-amber-500 to-orange-500', snippet: 'A look at Salesforce Starter as an entry point for small businesses expecting to scale fast.', date: 'May 2026', badge: 'Official' },
];

export const NEWS = [
  { id: 'n1', source: 'TechCrunch', title: 'HubSpot adds AI forecasting to free CRM tier', time: '2h ago', favicon: 'from-emerald-500 to-teal-500' },
  { id: 'n2', source: 'The Verge', title: 'Zoho unveils unified AI assistant across its CRM suite', time: '5h ago', favicon: 'from-rose-500 to-pink-500' },
  { id: 'n3', source: 'Reuters', title: 'Small-business CRM market to double by 2028, report says', time: '8h ago', favicon: 'from-blue-500 to-indigo-500' },
  { id: 'n4', source: 'VentureBeat', title: 'Pipedrive launches conversational lead capture bot', time: '1d ago', favicon: 'from-violet-500 to-fuchsia-500' },
  { id: 'n5', source: 'ZDNet', title: 'Best free CRM for startups in 2026 — tested', time: '1d ago', favicon: 'from-cyan-500 to-sky-500' },
];

export const IMAGES = [
  { id: 'im1', label: 'CRM dashboard UI', grad: 'from-violet-500/30 to-indigo-500/10' },
  { id: 'im2', label: 'Sales pipeline kanban', grad: 'from-cyan-500/30 to-sky-500/10' },
  { id: 'im3', label: 'CRM comparison chart', grad: 'from-emerald-500/30 to-teal-500/10' },
  { id: 'im4', label: 'HubSpot interface', grad: 'from-orange-500/30 to-amber-500/10' },
  { id: 'im5', label: 'Zoho CRM workspace', grad: 'from-rose-500/30 to-pink-500/10' },
  { id: 'im6', label: 'Pipedrive deals view', grad: 'from-fuchsia-500/30 to-purple-500/10' },
  { id: 'im7', label: 'Salesforce starter', grad: 'from-blue-500/30 to-indigo-500/10' },
  { id: 'im8', label: 'CRM analytics graph', grad: 'from-amber-500/30 to-orange-500/10' },
];

export const VIDEOS = [
  { id: 'v1', title: 'Best CRM for Small Business 2026 — Full Breakdown', channel: 'TechWithBrett', duration: '12:04', views: '240k', grad: 'from-violet-500 to-indigo-500' },
  { id: 'v2', title: 'HubSpot vs Zoho vs Pipedrive — Honest Review', channel: 'SMBTools', duration: '08:42', views: '180k', grad: 'from-cyan-500 to-sky-500' },
  { id: 'v3', title: 'How to Set Up a CRM in Under 10 Minutes', channel: 'StartupStack', duration: '09:55', views: '96k', grad: 'from-emerald-500 to-teal-500' },
  { id: 'v4', title: 'Pipedrive Walkthrough for Sales Teams', channel: 'SalesMotion', duration: '15:18', views: '142k', grad: 'from-fuchsia-500 to-pink-500' },
];

export const HISTORY = [
  { id: 'h1', query: 'Best CRM platforms for small business', time: '12 min ago' },
  { id: 'h2', query: 'React vs Vue enterprise comparison', time: '1 h ago' },
  { id: 'h3', query: 'Latest battery technology breakthroughs', time: '3 h ago' },
  { id: 'h4', query: 'Top AI startups London 2026', time: 'Yesterday' },
  { id: 'h5', query: 'How to automate invoice processing', time: '2 days ago' },
];

export const SAVED = [
  { id: 'sv1', query: 'Competitor analysis: CRM market', count: 3 },
  { id: 'sv2', query: 'Battery tech news weekly', count: 7 },
  { id: 'sv3', query: 'AI startup funding tracker', count: 12 },
];