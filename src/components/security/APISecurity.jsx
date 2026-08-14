import { motion } from 'framer-motion';
import { KeyRound, Plug, Webhook, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { SectionHead, StatusPill } from './shared';
import { shortDate, timeAgo } from './format';

function Table({ head, rows, empty }) {
  if (!rows.length) return <p className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs text-zinc-500">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

// Real credential surface: the caller's own API keys, webhook endpoints and
// OAuth connections. Secrets are never returned by the server — only prefixes.
export default function APISecurity({ keys = [], webhooks = [], integrations = [], query = '' }) {
  const q = query.trim().toLowerCase();
  const match = (...vals) => !q || vals.some((v) => String(v ?? '').toLowerCase().includes(q));

  const keyRows = keys
    .filter((k) => match(k.name, k.prefix, k.environment))
    .map((k) => (
      <motion.tr key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-300 hover:bg-white/[.025]">
        <td className="px-4 py-3 font-medium text-white">{k.name}</td>
        <td className="px-4 py-3">
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{k.prefix}…</code>
        </td>
        <td className="px-4 py-3 text-zinc-400">{k.environment}</td>
        <td className="px-4 py-3 text-zinc-400">{k.scopes?.length ? k.scopes.join(', ') : 'default'}</td>
        <td className="px-4 py-3 text-zinc-500">{shortDate(k.created_at)}</td>
        <td className="px-4 py-3 text-zinc-500">{k.last_used_at ? timeAgo(k.last_used_at) : 'never'}</td>
        <td className="px-4 py-3">
          <StatusPill status={k.status} />
        </td>
      </motion.tr>
    ));

  const hookRows = webhooks
    .filter((w) => match(w.name, w.url))
    .map((w) => (
      <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-300 hover:bg-white/[.025]">
        <td className="px-4 py-3 font-medium text-white">{w.name}</td>
        <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">{w.url}</td>
        <td className="px-4 py-3 text-zinc-400">{w.events}</td>
        <td className="px-4 py-3 text-zinc-500">{w.deliveries}</td>
        <td className={`px-4 py-3 ${w.failures ? 'text-amber-300' : 'text-zinc-500'}`}>{w.failures}</td>
        <td className="px-4 py-3">
          <StatusPill status={w.status} />
        </td>
      </motion.tr>
    ));

  const oauthRows = integrations
    .filter((i) => match(i.name, i.provider, i.account))
    .map((i) => (
      <motion.tr key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-300 hover:bg-white/[.025]">
        <td className="px-4 py-3 font-medium text-white">{i.name}</td>
        <td className="px-4 py-3 text-zinc-400">{i.account || '—'}</td>
        <td className="px-4 py-3 text-zinc-400">{i.scopes?.length ? i.scopes.join(', ') : '—'}</td>
        <td className="px-4 py-3 text-zinc-500">{i.connected_at ? timeAgo(i.connected_at) : '—'}</td>
        <td className="px-4 py-3">
          <StatusPill status={i.status} />
        </td>
      </motion.tr>
    ));

  return (
    <div className="space-y-6">
      <div>
        <SectionHead
          icon={KeyRound}
          title="API Keys"
          grad="from-amber-500 to-orange-500"
          count={keys.length}
          action={
            <Link
              to="/developer-portal"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
            >
              Manage keys <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <Table
          head={['Name', 'Prefix', 'Environment', 'Scopes', 'Created', 'Last used', 'Status']}
          rows={keyRows}
          empty="No API keys issued. Create one in the Developer Portal."
        />
      </div>

      <div>
        <SectionHead
          icon={Webhook}
          title="Webhooks"
          grad="from-sky-500 to-blue-500"
          count={webhooks.length}
          action={
            <Link
              to="/developer-portal"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
            >
              Manage webhooks <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <Table
          head={['Name', 'Endpoint', 'Events', 'Deliveries', 'Failures', 'Status']}
          rows={hookRows}
          empty="No webhook endpoints registered."
        />
      </div>

      <div>
        <SectionHead
          icon={Plug}
          title="OAuth Connections"
          grad="from-fuchsia-500 to-purple-500"
          count={integrations.length}
          action={
            <Link
              to="/integrations"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
            >
              Manage connections <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <Table
          head={['Provider', 'Account', 'Granted scopes', 'Connected', 'Status']}
          rows={oauthRows}
          empty="No third-party integrations connected."
        />
      </div>
    </div>
  );
}
