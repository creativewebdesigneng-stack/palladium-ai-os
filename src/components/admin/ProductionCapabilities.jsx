import { CheckCircle2, CircleAlert, CircleDashed } from 'lucide-react';
import TableSurface from '@/components/palladium/TableSurface';

function State({ ok, active }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />{active ? 'Configured · active' : 'Configured'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
      <CircleAlert className="h-3.5 w-3.5" />Needs setup
    </span>
  );
}

export default function ProductionCapabilities({ data, loading }) {
  if (loading) {
    return <div className="flex h-[200px] items-center justify-center gap-2 text-xs text-zinc-500"><CircleDashed className="h-4 w-4 animate-spin" />Checking production capabilities…</div>;
  }
  if (!data || data.forbidden) {
    return <p className="text-xs text-zinc-500">Production capability status is unavailable.</p>;
  }

  const c = data.capabilities;
  const aiReady = Boolean(c.ai?.lovable || c.ai?.groq || c.ai?.openai || c.ai?.anthropic);
  const rows = [
    { label: c.googleShopping.label, ok: c.googleShopping.configured, detail: 'Live product discovery' },
    { label: c.googleRoutes.label, ok: c.googleRoutes.configured, detail: 'Traffic-aware commute routing' },
    { label: c.playwright.label, ok: c.playwright.configured && c.playwright.healthy, detail: c.playwright.configured ? (c.playwright.healthy ? 'Worker health probe passed' : 'Configured but health probe failed') : 'Browser worker endpoint missing' },
    { label: c.stripeSandbox.label, ok: c.stripeSandbox.configured, active: c.stripeSandbox.active, detail: 'Test billing environment' },
    { label: c.stripeLive.label, ok: c.stripeLive.configured, active: c.stripeLive.active, detail: 'Production billing environment' },
    { label: c.ai.label, ok: aiReady, detail: `Lovable ${c.ai.lovable ? '✓' : '—'} · Groq ${c.ai.groq ? '✓' : '—'} · OpenAI ${c.ai.openai ? '✓' : '—'} · Anthropic ${c.ai.anthropic ? '✓' : '—'}` },
  ];

  return (
    <div>
      <TableSurface label="Production capabilities" minWidth={640} className="rounded-xl">
        <table className="text-xs">
          <thead className="text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5">Capability</th>
              <th className="px-3 py-2.5">Details</th>
              <th className="px-3 py-2.5">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-3 font-medium text-zinc-200">{row.label}</td>
                <td className="px-3 py-3 text-[10px] text-zinc-500">{row.detail}</td>
                <td className="px-3 py-3"><State ok={row.ok} active={row.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSurface>
      <p className="mt-2 text-[10px] text-zinc-600">Checked server-side. Secret values are never returned to this page.</p>
    </div>
  );
}
