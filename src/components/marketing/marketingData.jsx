// Mock data for the PalladiumAI Marketing Centre. Backend ready.

export const SECTIONS = [
  { id: 'campaigns', label: 'Campaigns', icon: 'Megaphone' },
  { id: 'content', label: 'Content', icon: 'FileText' },
  { id: 'social', label: 'Social Media', icon: 'Share2' },
  { id: 'email', label: 'Email', icon: 'Mail' },
  { id: 'seo', label: 'SEO', icon: 'Search' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'ai-agents', label: 'AI Marketing Agents', icon: 'Bot' },
];

export const CAMPAIGN_STATUS = {
  active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  scheduled: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  draft: 'text-zinc-300 bg-white/5 border-white/10',
  ended: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
};

export const CHANNEL_TONE = {
  Email: 'from-sky-600/40 to-blue-600/40',
  Social: 'from-fuchsia-600/40 to-pink-600/40',
  Paid: 'from-amber-600/40 to-orange-600/40',
  Organic: 'from-emerald-600/40 to-teal-600/40',
};

export const CAMPAIGNS = [
  { id: 'c1', name: 'Q3 Product Launch', channel: 'Paid', status: 'active', budget: 48000, reach: 1240000, conversions: 3120, owner: 'Maya Rao' },
  { id: 'c2', name: 'Thought Leadership Series', channel: 'Organic', status: 'active', budget: 12000, reach: 680000, conversions: 980, owner: 'Devon Lee' },
  { id: 'c3', name: 'Webinar Invite Wave', channel: 'Email', status: 'scheduled', budget: 4000, reach: 84000, conversions: 0, owner: 'Maya Rao' },
  { id: 'c4', name: 'Holiday Social Push', channel: 'Social', status: 'active', budget: 24000, reach: 920000, conversions: 1840, owner: 'Finn Park' },
  { id: 'c5', name: 'Customer Stories', channel: 'Organic', status: 'draft', budget: 6000, reach: 0, conversions: 0, owner: 'Devon Lee' },
  { id: 'c6', name: 'Retargeting Blast', channel: 'Paid', status: 'ended', budget: 18000, reach: 420000, conversions: 2240, owner: 'Maya Rao' },
];

export const CONTENT = [
  { id: 'p1', title: 'How AI Agents Transform Sales Teams', type: 'Blog', status: 'Published', views: 14200, agent: 'Content Writer', date: 'Aug 2' },
  { id: 'p2', title: 'The 2026 Automation Playbook', type: 'Ebook', status: 'Draft', views: 0, agent: 'Content Writer', date: 'Aug 5' },
  { id: 'p3', title: 'PalladiumAI Launch Recap', type: 'Video', status: 'Scheduled', views: 0, agent: 'Notes Agent', date: 'Aug 9' },
  { id: 'p4', title: '5 Workflow Templates for Ops', type: 'Blog', status: 'Published', views: 8600, agent: 'Content Writer', date: 'Jul 28' },
  { id: 'p5', title: 'Customer Spotlight: Vertex Robotics', type: 'Case Study', status: 'Published', views: 5200, agent: 'Content Writer', date: 'Jul 20' },
];

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'Instagram', tone: 'from-fuchsia-600/40 to-pink-600/40', followers: '128k', posts: 42, engagement: 4.8 },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook', tone: 'from-blue-600/40 to-indigo-600/40', followers: '94k', posts: 88, engagement: 2.1 },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', tone: 'from-sky-600/40 to-blue-600/40', followers: '76k', posts: 120, engagement: 5.6 },
  { id: 'x', label: 'X', icon: 'Twitter', tone: 'from-zinc-600/40 to-slate-600/40', followers: '52k', posts: 240, engagement: 3.2 },
  { id: 'tiktok', label: 'TikTok', icon: 'Music2', tone: 'from-rose-600/40 to-red-600/40', followers: '210k', posts: 64, engagement: 8.4 },
  { id: 'youtube', label: 'YouTube', icon: 'Youtube', tone: 'from-red-600/40 to-rose-600/40', followers: '64k', posts: 28, engagement: 6.1 },
];

export const SOCIAL_POSTS = [
  { id: 's1', platform: 'instagram', title: 'Behind the scenes: Agent Builder', reach: 24000, engagement: 6.2, when: '2h ago' },
  { id: 's2', platform: 'linkedin', title: 'Why orchestration beats single agents', reach: 18200, engagement: 8.9, when: '5h ago' },
  { id: 's3', platform: 'tiktok', title: '60s: build an agent', reach: 96000, engagement: 12.4, when: 'Yesterday' },
  { id: 's4', platform: 'x', title: 'New: Business Automation Hub', reach: 12800, engagement: 3.1, when: 'Yesterday' },
  { id: 's5', platform: 'youtube', title: 'Full demo: AI App Builder', reach: 42000, engagement: 7.4, when: '2d ago' },
];

export const EMAILS = [
  { id: 'e1', subject: 'Your AI launch is ready', status: 'Sent', sent: 48000, open: 38, click: 12, owner: 'Maya Rao' },
  { id: 'e2', subject: 'Webinar: Automating Sales', status: 'Scheduled', sent: 0, open: 0, click: 0, owner: 'Devon Lee' },
  { id: 'e3', subject: 'Customer story: Vertex', status: 'Sent', sent: 32000, open: 42, click: 9, owner: 'Maya Rao' },
  { id: 'e4', subject: 'Welcome to PalladiumAI', status: 'Draft', sent: 0, open: 0, click: 0, owner: 'Finn Park' },
];

export const SEO = {
  score: 78,
  keywords: [
    { term: 'ai agent platform', rank: 4, volume: '12k', trend: 'up' },
    { term: 'workflow automation', rank: 7, volume: '24k', trend: 'up' },
    { term: 'ai app builder', rank: 12, volume: '18k', trend: 'flat' },
    { term: 'crm automation', rank: 3, volume: '9k', trend: 'up' },
    { term: 'agent marketplace', rank: 18, volume: '6k', trend: 'down' },
  ],
  issues: [
    { type: 'Warning', text: '3 pages missing meta descriptions' },
    { type: 'Critical', text: 'Homepage LCP 4.2s — optimize hero image' },
    { type: 'Info', text: '14 backlinks gained this week' },
  ],
};

export const MARKETING_ANALYTICS = [
  { k: 'Total reach', v: '3.6M', d: '+18%' },
  { k: 'Conversions', v: '8.2k', d: '+12%' },
  { k: 'Avg CTR', v: '4.6%', d: '+0.4%' },
  { k: 'Cost / acquisition', v: '$24', d: '-8%' },
  { k: 'Email open rate', v: '40%', d: '+3%' },
  { k: 'Social engagement', v: '6.1%', d: '+1.2%' },
];

export const AI_TOOLS = [
  { id: 'campaign', label: 'Generate Campaign', desc: 'Build a multi-channel campaign plan', icon: 'Megaphone', tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'content', label: 'Generate Content', desc: 'Create blogs, captions, and ad copy', icon: 'FileText', tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'audience', label: 'Research Audience', desc: 'Analyze segments and buyer intent', icon: 'Users', tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'seo', label: 'SEO Analysis', desc: 'Audit pages and surface keywords', icon: 'Search', tone: 'from-amber-600/40 to-orange-600/40' },
  { id: 'social', label: 'Social Media Planning', desc: 'Plan and schedule cross-platform posts', icon: 'Share2', tone: 'from-emerald-600/40 to-teal-600/40' },
  { id: 'email', label: 'Email Campaign', desc: 'Draft sequences and subject lines', icon: 'Mail', tone: 'from-rose-600/40 to-red-600/40' },
];

export const AI_AGENTS = [
  { id: 'ag1', name: 'Content Writer', role: 'Drafts blogs, captions, ad copy', status: 'active', tasks: 184, success: 92 },
  { id: 'ag2', name: 'SEO Analyst', role: 'Audits pages, tracks keywords', status: 'active', tasks: 96, success: 88 },
  { id: 'ag3', name: 'Social Planner', role: 'Schedules and optimizes posts', status: 'active', tasks: 142, success: 90 },
  { id: 'ag4', name: 'Audience Researcher', role: 'Segments and scores audiences', status: 'paused', tasks: 64, success: 85 },
  { id: 'ag5', name: 'Email Marketer', role: 'Builds sequences and A/B tests', status: 'active', tasks: 78, success: 89 },
];

export const ISSUE_TONE = { Critical: 'text-rose-300 bg-rose-400/10', Warning: 'text-amber-300 bg-amber-400/10', Info: 'text-sky-300 bg-sky-400/10' };