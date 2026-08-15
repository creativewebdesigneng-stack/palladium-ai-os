import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Webhook } from 'lucide-react';
import { Panel } from './shared';

export default function DeveloperSection() {
  return (
    <Panel icon={Code2} title="Developer Settings" grad="from-zinc-500 to-zinc-700" desc="Developer API and webhook controls live in Developer Portal.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">API platform</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Manage real API keys and inspect authenticated API usage.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-white"><Webhook className="h-3.5 w-3.5 text-violet-300" />Webhooks</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Create, update, test and rotate webhook secrets through the live developer backend.</p>
        </div>
      </div>
      <Link to="/developer-portal" className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[.08]">
        Open Developer Portal <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Panel>
  );
}
