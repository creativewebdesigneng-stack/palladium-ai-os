import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Megaphone, Plus, Trash2, Play, Pause } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import {
  listCampaigns, saveCampaign, setCampaignStatus, deleteCampaign,
} from '@/lib/business/marketing.functions';
import {
  Stat, Empty, Loading, Failed, Table, Pill, STATUS_TONE,
  formatMoney, formatNumber, formatPercent,
} from '@/components/business/live';

const CHANNELS = ['email', 'social', 'search', 'content', 'events', 'other'];
const STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed'];
const EMPTY_FORM = {
  name: '', channel: 'email', status: 'draft', budget: '', spend: '',
  impressions: '', clicks: '', conversions: '',
};

export default function Marketing() {
  const qc = useQueryClient();
  const session = useSessionReady();
  const [form, setForm] = useState(null);

  const listFn = useServerFn(listCampaigns);
  const saveFn = useServerFn(saveCampaign);
  const statusFn = useServerFn(setCampaignStatus);
  const deleteFn = useServerFn(deleteCampaign);

  const marketing = useQuery({
    queryKey: ['marketing'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['marketing'] });
  const fail = (e) => toast({ title: 'Action failed', description: friendlyMessage(e), variant: 'destructive' });

  const save = useMutation({
    mutationFn: (payload) => saveFn({ data: payload }),
    onSuccess: () => { setForm(null); invalidate(); toast({ title: 'Campaign saved' }); },
    onError: fail,
  });
  const setStatus = useMutation({
    mutationFn: (payload) => statusFn({ data: payload }),
    onSuccess: () => invalidate(),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast({ title: 'Campaign deleted' }); },
    onError: fail,
  });

  const campaigns = marketing.data?.campaigns ?? [];
  const summary = marketing.data?.summary;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Marketing"
        description="Campaign performance calculated from the counters you record. No simulated reach or engagement."
        action={
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      {session === 'no' && <Failed message="Sign in to view your campaigns." />}
      {session === 'yes' && marketing.isLoading && <Loading />}
      {marketing.isError && <Failed message={friendlyMessage(marketing.error)} onRetry={() => marketing.refetch()} />}

      {marketing.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Stat label="Campaigns" value={formatNumber(summary.count)} />
            <Stat label="Active" value={formatNumber(summary.active)} tone="text-emerald-300" />
            <Stat label="Spend" value={summary.count ? formatMoney(summary.spend) : null} />
            <Stat label="CTR" value={summary.ctr == null ? null : formatPercent(summary.ctr)} />
            <Stat label="Conversion rate" value={summary.conversionRate == null ? null : formatPercent(summary.conversionRate)} />
            <Stat label="Cost / conversion" value={summary.costPerConversion == null ? null : formatMoney(summary.costPerConversion)} />
          </div>

          <div className="mt-5">
            <Table
              columns={['Campaign', 'Channel', 'Status', 'Budget', 'Spend', 'Impressions', 'Clicks', 'Conversions', '']}
              rows={campaigns}
              empty={
                <Empty
                  icon={Megaphone}
                  title="No campaigns yet"
                  desc="Create a campaign to start tracking real spend and conversion performance."
                  action={
                    <button onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white hover:bg-white/10">
                      New campaign
                    </button>
                  }
                />
              }
              renderRow={(c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.channel}</td>
                  <td className="px-4 py-3"><Pill tone={STATUS_TONE[c.status]}>{c.status}</Pill></td>
                  <td className="px-4 py-3 text-zinc-300">{formatMoney(c.budget)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatMoney(c.spend)}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatNumber(c.impressions)}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatNumber(c.clicks)}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatNumber(c.conversions)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === 'active' ? (
                        <button onClick={() => setStatus.mutate({ id: c.id, status: 'paused' })} className="text-zinc-500 hover:text-amber-300" aria-label="Pause campaign">
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => setStatus.mutate({ id: c.id, status: 'active' })} className="text-zinc-500 hover:text-emerald-300" aria-label="Activate campaign">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => remove.mutate(c.id)} className="text-zinc-500 hover:text-rose-300" aria-label="Delete campaign">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5">
            <h2 className="text-sm font-semibold text-white">New campaign</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="col-span-full text-[11px] text-zinc-400">
                Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[11px] text-zinc-400">
                Channel
                <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white">
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-zinc-400">
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              {[['budget', 'Budget'], ['spend', 'Spend'], ['impressions', 'Impressions'], ['clicks', 'Clicks'], ['conversions', 'Conversions']].map(([key, label]) => (
                <label key={key} className="text-[11px] text-zinc-400">
                  {label}
                  <input type="number" min="0" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
              <button
                disabled={!form.name.trim() || save.isPending}
                onClick={() =>
                  save.mutate({
                    name: form.name,
                    channel: form.channel,
                    status: form.status,
                    budget: Number(form.budget || 0),
                    spend: Number(form.spend || 0),
                    impressions: Number(form.impressions || 0),
                    clicks: Number(form.clicks || 0),
                    conversions: Number(form.conversions || 0),
                  })
                }
                className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
