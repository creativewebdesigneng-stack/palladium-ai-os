// Mock data for the PalladiumAI MCP Hub — Model Context Protocol servers.
// Illustrative content — backend-ready for a future MCP integration.

export const TABS = [
  { id: 'featured', label: 'Featured Servers' },
  { id: 'installed', label: 'Installed Servers' },
  { id: 'available', label: 'Available Servers' },
  { id: 'custom', label: 'Custom Servers' },
];

export const CATEGORIES = ['Developer', 'Files', 'Databases', 'Search', 'Business', 'Communication', 'Automation'];

export const SECURITY = {
  verified: { label: 'Verified', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  community: { label: 'Community', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
  review: { label: 'In review', cls: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
};

const G = {
  violet: 'from-violet-500 to-indigo-500', sky: 'from-cyan-500 to-sky-500', amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500', fuchsia: 'from-fuchsia-500 to-pink-500', blue: 'from-blue-500 to-indigo-500',
  rose: 'from-rose-500 to-pink-500', slate: 'from-slate-500 to-zinc-500',
};

export const SERVERS = [
  { id:'s1', name:'GitHub MCP', desc:'Read and write GitHub repos, issues and pull requests from any MCP-compatible agent.', category:'Developer', tools:['list_repos','get_issue','create_pr','search_code'], creator:'GitHub', version:'1.4.2', security:'verified', installed:true, featured:true, grad:G.slate, resources:['Repositories','Issues','Pull requests'], permissions:['repo:read','repo:write','issue:write'], agents:['Atlas Dev','CodePilot'], activity:[{a:'Created PR #482', t:'2m ago'},{a:'Listed 12 repos', t:'1h ago'}] },
  { id:'s2', name:'PostgreSQL MCP', desc:'Query and manage PostgreSQL databases with natural language and structured tools.', category:'Databases', tools:['run_query','list_tables','describe_schema'], creator:'PalladiumAI', version:'2.0.1', security:'verified', installed:true, featured:true, grad:G.blue, resources:['Tables','Schemas','Views'], permissions:['db:read','db:write'], agents:['Insight Agent'], activity:[{a:'Ran SELECT on users', t:'5m ago'},{a:'Described schema', t:'3h ago'}] },
  { id:'s3', name:'Slack MCP', desc:'Send messages, search channels and manage Slack threads from your agents.', category:'Communication', tools:['send_message','search_channels','list_threads'], creator:'Slack', version:'1.1.0', security:'verified', installed:false, featured:true, grad:G.violet, resources:['Channels','Threads','Messages'], permissions:['chat:write','channels:read'], agents:[], activity:[] },
  { id:'s4', name:'Filesystem MCP', desc:'Browse, read and write local files and folders securely from any MCP agent.', category:'Files', tools:['read_file','write_file','list_dir','search_files'], creator:'Anthropic', version:'0.9.4', security:'verified', installed:true, featured:false, grad:G.emerald, resources:['Files','Directories'], permissions:['fs:read','fs:write'], agents:['Knowledge Agent'], activity:[{a:'Read brief.pdf', t:'12m ago'}] },
  { id:'s5', name:'Web Search MCP', desc:'Real-time web search and page extraction for grounded agent responses.', category:'Search', tools:['web_search','fetch_page','news_search'], creator:'PalladiumAI', version:'1.6.0', security:'verified', installed:false, featured:true, grad:G.sky, resources:['Web pages','News'], permissions:['web:read'], agents:[], activity:[] },
  { id:'s6', name:'Stripe MCP', desc:'Create charges, invoices and subscriptions; query customer and payment data.', category:'Business', tools:['create_invoice','list_charges','get_customer'], creator:'Stripe', version:'1.2.3', security:'verified', installed:false, featured:false, grad:G.fuchsia, resources:['Customers','Invoices','Charges'], permissions:['payments:write','customers:read'], agents:[], activity:[] },
  { id:'s7', name:'Linear MCP', desc:'Manage Linear issues, projects and cycles; sync agent tasks automatically.', category:'Developer', tools:['create_issue','list_projects','update_status'], creator:'Linear', version:'1.0.5', security:'community', installed:false, featured:false, grad:G.rose, resources:['Issues','Projects','Cycles'], permissions:['issue:write','project:read'], agents:[], activity:[] },
  { id:'s8', name:'HubSpot MCP', desc:'Sync contacts, deals and engagement data between agents and your CRM.', category:'Business', tools:['upsert_contact','list_deals','log_activity'], creator:'HubSpot Labs', version:'0.7.1', security:'review', installed:false, featured:false, grad:G.amber, resources:['Contacts','Deals','Activities'], permissions:['crm:write','crm:read'], agents:[], activity:[] },
  { id:'s9', name:'Notion MCP', desc:'Search, read and update Notion pages and databases from MCP agents.', category:'Files', tools:['search_pages','read_block','update_page'], creator:'Notion', version:'1.3.0', security:'verified', installed:false, featured:false, grad:G.slate, resources:['Pages','Databases'], permissions:['notion:read','notion:write'], agents:[], activity:[] },
  { id:'s10', name:'Zapier MCP', desc:'Trigger thousands of automations and orchestrations via MCP tool calls.', category:'Automation', tools:['run_zap','list_zaps'], creator:'Zapier', version:'2.1.0', security:'verified', installed:false, featured:true, grad:G.orange || G.amber, resources:['Zaps'], permissions:['zapier:run'], agents:[], activity:[] },
  { id:'s11', name:'Gmail MCP', desc:'Read, draft and send Gmail messages with attachment support.', category:'Communication', tools:['send_email','read_thread','search_mail'], creator:'PalladiumAI', version:'1.2.1', security:'verified', installed:true, featured:false, grad:G.rose, resources:['Threads','Messages'], permissions:['mail:read','mail:write'], agents:['Support Agent'], activity:[{a:'Drafted reply', t:'8m ago'}] },
  { id:'s12', name:'Pinecone MCP', desc:'Vector search and upserts over your knowledge base from any agent.', category:'Search', tools:['upsert_vector','query_similar'], creator:'Pinecone', version:'0.8.2', security:'community', installed:false, featured:false, grad:G.blue, resources:['Indexes'], permissions:['vector:read','vector:write'], agents:[], activity:[] },
];