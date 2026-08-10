// Mock data for the PalladiumAI Templates Marketplace — illustrative, backend-ready.

export const CATEGORIES = ['Websites','Web Apps','SaaS','Dashboards','CRM','E-commerce','AI Agents','Workflows','Business','Marketing','Developer'];

const G = {
  violet: 'from-violet-500 to-indigo-500', sky: 'from-cyan-500 to-sky-500', amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500', fuchsia: 'from-fuchsia-500 to-pink-500', blue: 'from-blue-500 to-indigo-500',
  rose: 'from-rose-500 to-pink-500', slate: 'from-slate-500 to-zinc-500', green: 'from-green-500 to-emerald-500',
};

export const TEMPLATES = [
  { id:'t1', name:'Aurora Landing', desc:'A high-converting SaaS landing page with animated hero, pricing and testimonials.', category:'Websites', creator:'Palladium Studio', rating:4.9, uses:1820, price:'Free', grad:G.violet, preview:{hero:'Aurora — launch faster', sections:['Hero','Features','Pricing','FAQ','Footer']} },
  { id:'t2', name:'Nimbus Dashboard', desc:'Analytics dashboard with charts, metrics and filterable data tables.', category:'Dashboards', creator:'PalladiumAI', rating:4.8, uses:2340, price:'$49', grad:G.sky, preview:{hero:'Nimbus Analytics', sections:['Metrics','Charts','Tables','Reports']} },
  { id:'t3', name:'Helix CRM', desc:'Sales pipeline CRM with kanban, contacts and AI lead scoring.', category:'CRM', creator:'Palladium Studio', rating:4.7, uses:980, price:'$79', grad:G.emerald, preview:{hero:'Helix CRM', sections:['Pipeline','Contacts','Deals','Reports']} },
  { id:'t4', name:'Orbit Store', desc:'Headless e-commerce storefront with cart, checkout and product search.', category:'E-commerce', creator:'Commerce Labs', rating:4.6, uses:1520, price:'$59', grad:G.fuchsia, preview:{hero:'Orbit Store', sections:['Products','Cart','Checkout','Orders']} },
  { id:'t5', name:'Sentinel SaaS Starter', desc:'Full SaaS starter with auth, billing, teams and admin console.', category:'SaaS', creator:'PalladiumAI', rating:4.9, uses:3120, price:'$129', grad:G.blue, preview:{hero:'Sentinel SaaS', sections:['Auth','Billing','Teams','Admin']} },
  { id:'t6', name:'Pulse Web App', desc:'Realtime web app with collaboration, presence and live cursors.', category:'Web Apps', creator:'Devhouse', rating:4.5, uses:640, price:'$39', grad:G.rose, preview:{hero:'Pulse', sections:['Live boards','Presence','Comments']} },
  { id:'t7', name:'Atlas Research Agent', desc:'Autonomous research agent with web search and citation reports.', category:'AI Agents', creator:'PalladiumAI', rating:4.9, uses:4210, price:'Free', grad:G.amber, preview:{hero:'Atlas Agent', sections:['Plan','Search','Synthesize','Cite']} },
  { id:'t8', name:'Forge Workflow', desc:'Multi-step automation workflow with approvals and branching.', category:'Workflows', creator:'Automate Co', rating:4.4, uses:510, price:'$29', grad:G.slate, preview:{hero:'Forge Workflow', sections:['Triggers','Conditions','Approvals','Runs']} },
  { id:'t9', name:'Beacon Marketing Kit', desc:'Email sequences, landing pages and analytics for campaigns.', category:'Marketing', creator:'Growth Labs', rating:4.6, uses:880, price:'$69', grad:G.fuchsia, preview:{hero:'Beacon Kit', sections:['Sequences','Pages','Analytics']} },
  { id:'t10', name:'Devport Starter', desc:'Developer portal with API keys, docs and usage dashboards.', category:'Developer', creator:'PalladiumAI', rating:4.8, uses:1190, price:'$89', grad:G.green, preview:{hero:'Devport', sections:['API Keys','Docs','Usage','Webhooks']} },
  { id:'t11', name:'Summit Business Suite', desc:'All-in-one business operations suite: HR, finance and ops.', category:'Business', creator:'Palladium Studio', rating:4.5, uses:430, price:'$149', grad:G.violet, preview:{hero:'Summit Suite', sections:['HR','Finance','Ops']} },
  { id:'t12', name:'Lumen Portfolio', desc:'Minimal personal portfolio with case studies and contact form.', category:'Websites', creator:'Indie Co', rating:4.7, uses:2240, price:'Free', grad:G.sky, preview:{hero:'Lumen', sections:['Work','About','Contact']} },
];