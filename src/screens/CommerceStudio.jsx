import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Boxes, ExternalLink, Loader2, Plug, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { getCommerceProviderCapabilities, getIntegratedCapabilityOverview, saveCommerceWorkspace } from '@/lib/platform/integrated-capabilities.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function CommerceStudio() {
  const session = useSessionReady();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getIntegratedCapabilityOverview);
  const saveFn = useServerFn(saveCommerceWorkspace);
  const capabilitiesFn = useServerFn(getCommerceProviderCapabilities);
  const [form, setForm] = useState({ provider: 'shopify', name: '', connectionRef: '', currency: 'GBP' });
  const overview = useQuery({ queryKey: ['integrated-capabilities'], queryFn: () => overviewFn({ data: undefined }), enabled: session === 'yes', retry: false });
  const capabilities = useQuery({ queryKey: ['commerce-provider-capabilities', form.provider], queryFn: () => capabilitiesFn({ data: { provider: form.provider } }), enabled: session === 'yes' && Boolean(form.provider), retry: false });
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: async () => { setForm((value) => ({ ...value, name: '' })); await qc.invalidateQueries({ queryKey: ['integrated-capabilities'] }); toast({ title: 'Commerce workspace saved' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save commerce workspace', description: friendlyMessage(error) }),
  });
  const rows = overview.data?.commerce ?? [];
  const liveCapabilities = capabilities.data ?? [];

  return <>
    <PageHeader eyebrow="Business · Commerce" title="Commerce Studio" description="One PalladiumAI commerce control surface for Shopify, Medusa-compatible services and other connected commerce tools. Existing Integrations, approvals, CRM and analytics remain authoritative." />
    {session === 'no' && <Failed message="Sign in to configure commerce workspaces." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><ShoppingBag className="h-5 w-5 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Commerce workspace</h2><p className="text-xs text-zinc-500">Reference an existing PalladiumAI connection instead of storing another credential.</p></div></div>
          <div className="mt-4 space-y-3">
            <Field label="Provider"><select className={control} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="shopify">Shopify</option><option value="medusa">Medusa-compatible</option><option value="integration">Connected integration</option><option value="mcp">MCP commerce tool</option></select></Field>
            <Field label="Workspace name"><input className={control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main storefront" /></Field>
            <Field label="Connection reference"><input className={control} value={form.connectionRef} onChange={(e) => setForm({ ...form, connectionRef: e.target.value })} placeholder="Existing integration ID/name (no secret)" /></Field>
            <Field label="Currency"><input className={control} maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></Field>
            <button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save workspace</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => navigate('/integrations')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><Plug className="h-3.5 w-3.5" />Integrations</button><button onClick={() => navigate('/shopify-connect')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><ExternalLink className="h-3.5 w-3.5" />Shopify Connect</button></div>
        </section>
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />Medusa Enterprise material is deliberately excluded. Commerce Studio adds native PalladiumAI orchestration only; provider secrets remain in the existing encrypted Integrations layer and write actions still use its approval/runtime controls.</section>
      </div>
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Live provider capabilities</h2><p className="mt-1 text-xs text-zinc-500">Actions actually exposed by the selected connected provider.</p></div>{capabilities.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>{capabilities.error ? <p className="mt-4 text-xs text-amber-300">{friendlyMessage(capabilities.error)}</p> : <div className="mt-4 space-y-2">{liveCapabilities.length === 0 ? <Empty icon={Boxes} title="No live capabilities found" desc="This provider is not currently exposed through a live PalladiumAI integration lane. Saving a workspace does not pretend that a server is connected." /> : liveCapabilities.map((cap) => <div key={`${cap.provider}:${cap.action}`} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-white">{cap.action}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{cap.transport}</span>{cap.requiresApproval && <span className="rounded-full border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">approval</span>}</div><p className="mt-1 text-[11px] text-zinc-500">{cap.description}</p></div>)}</div>}</section>
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-sm font-semibold text-white">Configured commerce workspaces</h2><div className="mt-4 space-y-3">{rows.length === 0 ? <Empty icon={ShoppingBag} title="No commerce workspaces" desc="Reference a connected provider above." /> : rows.map((row) => <div key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2"><p className="text-sm font-medium text-white">{row.name}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{row.provider}</span><span className="ml-auto text-[10px] text-zinc-500">{row.status}</span></div><p className="mt-2 text-xs text-zinc-500">{row.currency} · {row.connection_ref || 'connection not bound yet'}</p></div>)}</div></section>
      </div>
    </div>
  </>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
