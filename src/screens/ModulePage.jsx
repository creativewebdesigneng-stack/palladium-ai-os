import { ArrowUpRight, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import { toast } from '@/components/ui/use-toast';

const copy = {
  workforce: ['Agent Workforce', 'Design teams of agents that plan, communicate, and deliver together.'],
  projects: ['Projects', 'Manage products, members, versions, and deployments.'],
  files: ['File Manager', 'Organize, preview, tag, and share every workspace asset.'],
  automations: ['Automation Builder', 'Build reliable visual workflows with triggers, logic, and actions.'],
  integrations: ['Integrations', 'Connect PalladiumAI to the tools your team already uses.'],
  business: ['Business Workspace', 'Live intelligence for sales, marketing, finance, HR, support, and operations.'],
  developer: ['Developer Workspace', 'Code, debug, version, and deploy from one focused environment.'],
  docs: ['Documentation', 'Guides, tutorials, examples, and references for every workflow.'],
  billing: ['Billing & Usage', 'Plans, invoices, payment methods, credits, and team billing.'],
  admin: ['Administration', 'Manage users, teams, subscriptions, logs, tickets, and feature flags.'],
  settings: ['Settings', 'Control your workspace, security, appearance, data, and connected accounts.'],
};

const labelsByType = {
  workforce: ['Research pod', 'Support team', 'Launch crew'],
  projects: ['Atlas Analytics', 'Nova Support', 'Orbit Commerce'],
  files: ['Brand system.fig', 'Quarterly brief.pdf', 'Agent prompts.md'],
  automations: ['Lead enrichment', 'Daily executive brief', 'Support triage'],
  integrations: ['GitHub', 'Slack', 'Google Drive'],
  business: ['Pipeline forecast', 'Campaign efficiency', 'Operating margin'],
  developer: ['main.jsx', 'deployment #284', 'production'],
  docs: ['Quickstart', 'Build an agent', 'API reference'],
  billing: ['Pro plan', 'August usage', 'Payment method'],
  admin: ['Active users', 'System events', 'Open tickets'],
  settings: ['General', 'Security', 'Notifications'],
};

const placeholder = (title, desc) => toast({ title, description: desc });

export default function ModulePage({ type }) {
  const [title, desc] = copy[type] || ['Workspace', 'Manage your workspace.'];
  const labels = labelsByType[type] || ['Item one', 'Item two', 'Item three'];

  return (
    <>
      <PageHeader
        title={title}
        description={desc}
        action={
          <button
            onClick={() => placeholder('Create', `Create flow for ${title} will be available once the backend is connected.`)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        }
      />
      <div className="mb-4 flex max-w-sm items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2">
        <Search className="h-4 w-4 text-zinc-600" />
        <input placeholder={`Search ${title.toLowerCase()}...`} className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {labels.map((label, i) => (
          <Panel key={label} title={label} subtitle={i === 0 ? 'Updated just now' : `${i + 2} hours ago`}>
            <div className="h-28 rounded-xl border border-white/5 bg-gradient-to-br from-violet-500/10 to-transparent p-4">
              <p className="text-2xl font-semibold">{['98.4%', '24', 'Active'][i]}</p>
              <p className="mt-2 text-xs text-zinc-500">Live workspace data</p>
            </div>
            <button
              onClick={() => placeholder(label, `${label} details will open here once the backend is connected.`)}
              className="mt-4 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              View details <ArrowUpRight className="h-3 w-3" />
            </button>
          </Panel>
        ))}
      </div>
    </>
  );
}