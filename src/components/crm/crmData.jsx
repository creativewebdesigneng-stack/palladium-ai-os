// Mock data for the PalladiumAI CRM. Backend ready.

export const MODULES = [
  { id: 'contacts', label: 'Contacts', icon: 'Users' },
  { id: 'companies', label: 'Companies', icon: 'Building2' },
  { id: 'leads', label: 'Leads', icon: 'UserPlus' },
  { id: 'deals', label: 'Deals', icon: 'Handshake' },
  { id: 'activities', label: 'Activities', icon: 'Activity' },
  { id: 'tasks', label: 'Tasks', icon: 'ListChecks' },
  { id: 'notes', label: 'Notes', icon: 'StickyNote' },
];

export const PIPELINE = ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export const STAGE_TONE = {
  'New Lead': 'from-violet-600/40 to-indigo-600/40 text-violet-300',
  'Qualified': 'from-sky-600/40 to-blue-600/40 text-sky-300',
  'Proposal': 'from-fuchsia-600/40 to-pink-600/40 text-fuchsia-300',
  'Negotiation': 'from-amber-600/40 to-orange-600/40 text-amber-300',
  'Won': 'from-emerald-600/40 to-teal-600/40 text-emerald-300',
  'Lost': 'from-rose-600/40 to-red-600/40 text-rose-300',
};

export const CONTACT_STATUS = {
  hot: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  warm: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  cold: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  customer: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
};

export const TASK_STATUS = {
  todo: 'text-zinc-400 bg-white/5 border-white/10',
  'in-progress': 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  done: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
};

export const ACTIVITY_TYPE = {
  call: { icon: 'Phone', tone: 'text-emerald-400 bg-emerald-400/10' },
  email: { icon: 'Mail', tone: 'text-sky-400 bg-sky-400/10' },
  meeting: { icon: 'Calendar', tone: 'text-violet-400 bg-violet-400/10' },
  note: { icon: 'StickyNote', tone: 'text-amber-400 bg-amber-400/10' },
  task: { icon: 'ListChecks', tone: 'text-zinc-300 bg-white/10' },
};

export const CONTACTS = [
  { id: 'c1', name: 'Aria Khan', company: 'Northwind Labs', email: 'aria@northwind.io', phone: '+44 20 7946 0321', status: 'hot', owner: 'Devon Lee', score: 88, notes: 'Evaluating platform for 40-seat rollout. Decision expected next quarter.' },
  { id: 'c2', name: 'Finn Park', company: 'Helio Health', email: 'finn@heliohealth.com', phone: '+44 20 7946 1190', status: 'warm', owner: 'Maya Rao', score: 71, notes: 'Strong fit on AI agents; security review underway.' },
  { id: 'c3', name: 'Sora Tanaka', company: 'Aurora Bank', email: 'sora@aurora.bank', phone: '+1 415 555 0142', status: 'cold', owner: 'Devon Lee', score: 42, notes: 'Early exploration, no budget confirmed this FY.' },
  { id: 'c4', name: 'Lena Ortiz', company: 'Vertex Robotics', email: 'lena@vertexrobotics.com', phone: '+1 415 555 0177', status: 'customer', owner: 'Maya Rao', score: 96, notes: 'Renewed annual plan. Open to expansion to workflow automation.' },
  { id: 'c5', name: 'Theo Brandt', company: 'Meridian Media', email: 'theo@meridian.media', phone: '+44 20 7946 8820', status: 'warm', owner: 'Devon Lee', score: 64, notes: 'Wants demo of browser control + analytics.' },
  { id: 'c6', name: 'Noor Adel', company: 'Cobalt Logistics', email: 'noor@cobaltlogistics.io', phone: '+971 4 555 0190', status: 'hot', owner: 'Maya Rao', score: 90, notes: 'Champion inside; contract in legal review.' },
];

export const COMPANIES = [
  { id: 'co1', name: 'Northwind Labs', industry: 'Technology', employees: 240, contacts: 1, deals: 1, revenue: '$48k', domain: 'northwind.io' },
  { id: 'co2', name: 'Helio Health', industry: 'Healthcare', employees: 1200, contacts: 1, deals: 1, revenue: '$96k', domain: 'heliohealth.com' },
  { id: 'co3', name: 'Aurora Bank', industry: 'Finance', employees: 8400, contacts: 1, deals: 0, revenue: '$0', domain: 'aurora.bank' },
  { id: 'co4', name: 'Vertex Robotics', industry: 'Manufacturing', employees: 560, contacts: 1, deals: 2, revenue: '$184k', domain: 'vertexrobotics.com' },
  { id: 'co5', name: 'Meridian Media', industry: 'Media', employees: 320, contacts: 1, deals: 1, revenue: '$32k', domain: 'meridian.media' },
  { id: 'co6', name: 'Cobalt Logistics', industry: 'Logistics', employees: 1800, contacts: 1, deals: 2, revenue: '$210k', domain: 'cobaltlogistics.io' },
];

export const LEADS = [
  { id: 'l1', name: 'Iris Vance', company: 'Polaris AI', source: 'Web form', score: 82, owner: 'Devon Lee', stage: 'New Lead' },
  { id: 'l2', name: 'Kai Mendez', company: 'Lumen Retail', source: 'Referral', score: 76, owner: 'Maya Rao', stage: 'Qualified' },
  { id: 'l3', name: 'Yuki Liang', company: 'Driftwood Studio', source: 'Outbound', score: 58, owner: 'Devon Lee', stage: 'Proposal' },
  { id: 'l4', name: 'Omar Haddad', company: 'Saffron Foods', source: 'Event', score: 69, owner: 'Maya Rao', stage: 'Negotiation' },
];

export const DEALS = [
  { id: 'd1', name: 'Northwind — Platform Pilot', company: 'Northwind Labs', value: 48000, stage: 'Proposal', owner: 'Devon Lee', contact: 'Aria Khan', close: '2026-08-30' },
  { id: 'd2', name: 'Helio — 40-seat Rollout', company: 'Helio Health', value: 96000, stage: 'Negotiation', owner: 'Maya Rao', contact: 'Finn Park', close: '2026-09-12' },
  { id: 'd3', name: 'Vertex — Renewal', company: 'Vertex Robotics', value: 92000, stage: 'Won', owner: 'Maya Rao', contact: 'Lena Ortiz', close: '2026-07-18' },
  { id: 'd4', name: 'Meridian — Analytics', company: 'Meridian Media', value: 32000, stage: 'Qualified', owner: 'Devon Lee', contact: 'Theo Brandt', close: '2026-09-02' },
  { id: 'd5', name: 'Cobalt — Automation Suite', company: 'Cobalt Logistics', value: 210000, stage: 'Negotiation', owner: 'Maya Rao', contact: 'Noor Adel', close: '2026-08-22' },
  { id: 'd6', name: 'Polaris — Discovery', company: 'Polaris AI', value: 18000, stage: 'New Lead', owner: 'Devon Lee', contact: 'Iris Vance', close: '2026-09-20' },
  { id: 'd7', name: 'Aurora — Pilot', company: 'Aurora Bank', value: 0, stage: 'Lost', owner: 'Devon Lee', contact: 'Sora Tanaka', close: '2026-06-30' },
  { id: 'd8', name: 'Vertex — Expansion', company: 'Vertex Robotics', value: 92000, stage: 'Won', owner: 'Maya Rao', contact: 'Lena Ortiz', close: '2026-07-25' },
];

export const ACTIVITIES = [
  { id: 'a1', type: 'call', summary: 'Discovery call with Aria Khan', when: '2h ago', contact: 'Aria Khan' },
  { id: 'a2', type: 'email', summary: 'Sent pricing to Helio Health', when: '5h ago', contact: 'Finn Park' },
  { id: 'a3', type: 'meeting', summary: 'Demo with Meridian Media', when: 'Yesterday', contact: 'Theo Brandt' },
  { id: 'a4', type: 'note', summary: 'Noor requested redlined MSA', when: 'Yesterday', contact: 'Noor Adel' },
  { id: 'a5', type: 'email', summary: 'Followed up with Sora Tanaka', when: '2d ago', contact: 'Sora Tanaka' },
];

export const TASKS = [
  { id: 't1', title: 'Send proposal to Northwind', due: 'Today', owner: 'Devon Lee', status: 'in-progress', contact: 'Aria Khan' },
  { id: 't2', title: 'Security questionnaire for Helio', due: 'Aug 9', owner: 'Maya Rao', status: 'todo', contact: 'Finn Park' },
  { id: 't3', title: 'Confirm Meridian demo date', due: 'Aug 10', owner: 'Devon Lee', status: 'todo', contact: 'Theo Brandt' },
  { id: 't4', title: 'Renewal kickoff with Vertex', due: 'Aug 8', owner: 'Maya Rao', status: 'done', contact: 'Lena Ortiz' },
];

export const NOTES = [
  { id: 'n1', text: 'Aria wants SSO + audit log before signing. Confirm with security team.', author: 'Devon Lee', when: '2h ago', contact: 'Aria Khan' },
  { id: 'n2', text: 'Helio comparing us to two competitors — emphasize agent orchestration.', author: 'Maya Rao', when: 'Yesterday', contact: 'Finn Park' },
  { id: 'n3', text: 'Cobalt legal flagged indemnification clause for review.', author: 'Maya Rao', when: 'Yesterday', contact: 'Noor Adel' },
];

export const AI_FEATURES = [
  { id: 'research', label: 'AI Lead Research', desc: 'Enrich leads with firmographics, news, and buying signals', icon: 'Telescope', tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'followup', label: 'AI Follow-Up', desc: 'Draft timely follow-up messages per lead stage', icon: 'Send', tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'scoring', label: 'AI Lead Scoring', desc: 'Score leads by fit and engagement likelihood', icon: 'Gauge', tone: 'from-amber-600/40 to-orange-600/40' },
  { id: 'email', label: 'AI Email Generation', desc: 'Generate personalized outreach emails', icon: 'PenLine', tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'meeting', label: 'AI Meeting Summary', desc: 'Summarize meetings and extract next steps', icon: 'Captions', tone: 'from-emerald-600/40 to-teal-600/40' },
];

export const AI_SCORE_GRADIENT = (s) => s >= 85 ? 'from-emerald-500 to-teal-400' : s >= 70 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400';