import { useState } from 'react';
import { Loader2, ShieldCheck, Globe, Wallet, Save, Bot } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import BrowserProviderBadge, { BrowserProviderNotice } from '@/components/browser/BrowserProviderBadge';

/**
 * Domain allow-list and spend-cap policy for the browser and commerce tools.
 * The values saved here are the only domains an agent may ever visit and the
 * hard ceiling used when a purchase is prepared for approval.
 */
export default function BrowserPolicyPanel({ tools, browser, saving, onSave }) {
  const scoped = tools.filter((t) =>
    ['browser', 'web_fetch', 'web_search', 'http_request', 'shopping_search', 'checkout', 'prepare_purchase'].includes(t.slug),
  );

  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Browser & domain policy"
        description="Agents may only reach domains you list here, and can never complete a payment without your explicit approval."
        action={
          <div className="flex flex-wrap gap-1.5">
            <BrowserProviderBadge browser={browser} />
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
              <ShieldCheck className="mr-1 inline h-3 w-3" />Payments always require approval
            </span>
          </div>
        }
      />

      <BrowserProviderNotice browser={browser} />

      <div className="grid gap-3 lg:grid-cols-2">
        {scoped.map((tool) => <PolicyCard key={tool.slug} tool={tool} saving={saving} onSave={onSave} />)}
      </div>
    </>
  );
}

function PolicyCard({ tool, saving, onSave }) {
  const perm = tool.permission || {};
  const [domains, setDomains] = useState((perm.allowed_domains || []).join(', '));
  const [cap, setCap] = useState(perm.spend_cap ?? '');
  const [approval, setApproval] = useState(Boolean(perm.requires_approval || tool.requires_approval));
  const [enabled, setEnabled] = useState(perm.enabled !== false);

  const save = () =>
    onSave({
      tool: tool.slug,
      enabled,
      requiresApproval: approval,
      allowedDomains: domains.split(',').map((d) => d.trim()).filter(Boolean),
      spendCap: cap === '' ? null : Number(cap),
    });

  return (
    <div className="pglass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{tool.name}</p>
          <p className="text-[11px] text-zinc-500">{tool.category} · risk {tool.risk_level}</p>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`rounded-lg px-2.5 py-1 text-[11px] ${enabled ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border border-white/10 text-zinc-400'}`}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <label className="mt-3 block text-[11px] font-medium text-zinc-400">
        <Globe className="mr-1 inline h-3 w-3" />Allowed domains (comma separated — empty means blocked)
      </label>
      <input
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
        placeholder="amazon.co.uk, johnlewis.com"
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
      />

      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-zinc-400"><Wallet className="mr-1 inline h-3 w-3" />Spend cap</label>
          <input
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            inputMode="decimal"
            placeholder="No cap"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setApproval((v) => !v)}
          className={`rounded-lg px-2.5 py-2 text-[11px] ${approval ? 'border border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border border-white/10 text-zinc-400'}`}
        >
          {approval ? 'Approval required' : 'No approval'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-[11px] font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
        </button>
      </div>
    </div>
  );
}

export function ExecutionLog({ executions, loading }) {
  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Tool execution log"
        description="Every tool call is recorded with its agent, input, status and duration."
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : executions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No tool runs yet.</div>
      ) : (
        <div className="space-y-2">
          {executions.map((e) => (
            <div key={e.id} className="pglass flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">{e.tool}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  <Bot className="mr-1 inline h-3 w-3" />
                  {JSON.stringify(e.input || {}).slice(0, 120)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {e.duration_ms != null && <span className="text-zinc-500">{e.duration_ms} ms</span>}
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    e.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {e.status}
                </span>
                <span className="text-zinc-600">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              {e.error && <p className="w-full text-[11px] text-rose-400">{e.error}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
