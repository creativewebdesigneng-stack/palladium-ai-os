import { Link } from 'react-router-dom';
import { FolderKanban, ListChecks, Files, Plug, Table2, Radar, Store, MessageCircle, LineChart, CalendarClock, Settings, CreditCard, LifeBuoy, Search, Workflow, Bot } from 'lucide-react';

const resources=[
 ['Projects','/projects',FolderKanban,'Plan and coordinate initiatives, owners, deliverables and company work.'],
 ['Tasks','/tasks',ListChecks,'Track executable work and hand responsibilities to Blackstar agents where appropriate.'],
 ['Files','/files',Files,'Keep working documents and source material available to authorised workflows.'],
 ['Smart Tables','/smart-tables',Table2,'Structure operational data, lists and repeatable company records.'],
 ['Mission Control','/mission-control',Radar,'Supervise important execution, approvals and agent activity.'],
 ['Integrations','/integrations',Plug,'Connect authorised external business systems and services.'],
 ['Commerce Studio','/commerce-studio',Store,'Commerce, product and transaction-oriented business workflows.'],
 ['WhatsApp CRM','/whatsapp-crm',MessageCircle,'Customer messaging and CRM workflows where connected and authorised.'],
 ['Product Analytics','/product-analytics',LineChart,'Understand product usage and product-level business signals.'],
 ['Social Operations','/social-operations',CalendarClock,'Govern social publishing and connected provider operations.'],
 ['Automation Workflows','/workflows',Workflow,'Design durable, approval-aware company automations.'],
 ['Agent Builder','/agent-builder',Bot,'Create specialist company agents on top of Blackstar’s existing agent runtime.'],
 ['AI Web','/web',Search,'General web research and information workflows.'],
 ['Billing','/billing',CreditCard,'Workspace plan, usage and billing administration.'],
 ['Settings','/settings',Settings,'Configure workspace and platform preferences.'],
 ['Support','/support',LifeBuoy,'Platform support and operational help.'],
];
export default function CompanyResourceCenter(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <p className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-600">Company resource centre</p>
  <h2 className="mt-1 text-xl font-semibold text-white">Everything companies already have elsewhere in Blackstar, connected here</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Company Hub is the doorway; these existing systems remain the source of truth for execution, data and governance.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{resources.map(([name,path,Icon,text])=><Link key={path} to={path} className="group rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-cyan-300/20"><Icon className="h-4 w-4 text-cyan-300"/><h3 className="mt-2 text-sm font-medium text-white group-hover:text-cyan-100">{name}</h3><p className="mt-2 text-[10px] leading-4 text-zinc-600">{text}</p></Link>)}</div>
 </section>
}
