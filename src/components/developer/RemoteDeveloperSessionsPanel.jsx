import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Laptop2, Loader2, ShieldCheck } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { getIntegratedCapabilityOverview, saveRemoteDeveloperSession } from '@/lib/platform/integrated-capabilities.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function RemoteDeveloperSessionsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getIntegratedCapabilityOverview);
  const saveFn = useServerFn(saveRemoteDeveloperSession);
  const [form, setForm] = useState({ provider: 'palladium', label: '', connectionRef: '' });
  const overview = useQuery({ queryKey: ['integrated-capabilities'], queryFn: () => overviewFn({ data: undefined }), retry: false });
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: async () => { setForm((value) => ({ ...value, label: '' })); await qc.invalidateQueries({ queryKey: ['integrated-capabilities'] }); toast({ title: 'Remote session saved' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save remote session', description: friendlyMessage(error) }),
  });
  const rows = overview.data?.sessions ?? [];
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><Laptop2 className="h-5 w-5 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Remote developer sessions</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Happy-style remote session references reuse PalladiumAI's existing developer, agent, terminal and approval runtime. They do not create another execution authority.</p></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
      <select className={control} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="palladium">PalladiumAI</option><option value="happy">Happy-compatible</option><option value="openhands">OpenHands</option></select>
      <input className={control} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Laptop / project label" />
      <input className={control} value={form.connectionRef} onChange={(e) => setForm({ ...form, connectionRef: e.target.value })} placeholder="Connection/session reference — no secret" />
      <button disabled={!form.label.trim() || save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</button>
    </div>
    <div className="mt-4 space-y-2">{overview.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : rows.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">No remote developer sessions configured.</p> : rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-medium text-white">{row.label}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{row.provider}</span><span className="ml-auto text-[10px] text-zinc-500">{row.status}</span><p className="w-full text-[10px] text-zinc-600">{row.connection_ref || 'No connection reference bound yet'}</p></div>)}</div>
    <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[.04] p-3 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>No Codex-specific runtime is introduced. Terminal commands, Git actions, deployments, tool calls and approvals continue through PalladiumAI's existing controlled surfaces.</span></div>
  </section>;
}
