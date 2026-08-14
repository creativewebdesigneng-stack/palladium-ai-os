import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Users, Plus, Trash2, Activity } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { listCrm, saveContact, deleteContact, logActivity } from '@/lib/business/crm.functions';
import {
  Stat, Tabs, Empty, Loading, Failed, Table, Pill, STATUS_TONE,
  formatMoney, formatNumber, formatPercent, formatRelative,
} from '@/components/business/live';

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const TABS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'activities', label: 'Activity' },
];

const EMPTY_FORM = { name: '', email: '', company: '', title: '', phone: '', stage: 'lead', value_gbp: '', notes: '', source: '' };

export default function CRM() {
  const qc = useQueryClient();
  const session = useSessionReady();
  const [tab, setTab] = useState('contacts');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const listFn = useServerFn(listCrm);
  const saveFn = useServerFn(saveContact);
  const deleteFn = useServerFn(deleteContact);
  const activityFn = useServerFn(logActivity);

  const crm = useQuery({
    queryKey: ['crm'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });

  const save = useMutation({
    mutationFn: (payload) => saveFn({ data: payload }),
    onSuccess: () => { setForm(null); invalidate(); toast({ title: 'Contact saved' }); },
    onError: (e) => toast({ title: 'Could not save', description: friendlyMessage(e), variant: 'destructive' }),
  });
  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => { setSelected(null); invalidate(); toast({ title: 'Contact deleted' }); },
    onError: (e) => toast({ title: 'Could not delete', description: friendlyMessage(e), variant: 'destructive' }),
  });
  const addNote = useMutation({
    mutationFn: (payload) => activityFn({ data: payload }),
    onSuccess: () => { setNote(''); invalidate(); toast({ title: 'Activity logged' }); },
    onError: (e) => toast({ title: 'Could not log activity', description: friendlyMessage(e), variant: 'destructive' }),
  });

  const contacts = crm.data?.contacts ?? [];
  const activities = crm.data?.activities ?? [];
  const summary = crm.data?.summary;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.email, c.stage].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [contacts, q]);

  const byStage = useMemo(() => {
    const map = new Map(STAGES.map((s) => [s, []]));
    for (const c of contacts) {
      if (!map.has(c.stage)) map.set(c.stage, []);
      map.get(c.stage).push(c);
    }
    return map;
  }, [contacts]);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="CRM"
        description="Contacts, pipeline and activity — persisted in your workspace and visible only to you and your organisation."
        action={
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New contact
          </button>
        }
      />

      {session === 'no' && <Failed message="Sign in to view your CRM records." />}
      {session === 'yes' && crm.isLoading && <Loading />}
      {crm.isError && <Failed message={friendlyMessage(crm.error)} onRetry={() => crm.refetch()} />}

      {crm.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Contacts" value={formatNumber(summary.total)} />
            <Stat label="Open" value={formatNumber(summary.open)} />
            <Stat label="Pipeline value" value={summary.open ? formatMoney(summary.openValue) : null} />
            <Stat label="Won" value={formatNumber(summary.won)} tone="text-emerald-300" />
            <Stat label="Win rate" value={summary.winRate == null ? null : formatPercent(summary.winRate)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts…"
              className="w-56 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            />
          </div>

          <div className="mt-4">
            {tab === 'contacts' && (
              <Table
                columns={['Name', 'Company', 'Stage', 'Value', 'Last contacted', '']}
                rows={filtered}
                empty={
                  <Empty
                    icon={Users}
                    title={contacts.length ? 'No contacts match your search' : 'No contacts yet'}
                    desc={contacts.length ? 'Try a different search term.' : 'Create your first contact to start building a real pipeline.'}
                    action={
                      <button onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white hover:bg-white/10">
                        New contact
                      </button>
                    }
                  />
                }
                renderRow={(c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(c)} className="text-white hover:text-violet-300">{c.name}</button>
                      {c.email && <p className="text-[11px] text-zinc-500">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.company || '—'}</td>
                    <td className="px-4 py-3"><Pill tone={STATUS_TONE[c.stage]}>{c.stage}</Pill></td>
                    <td className="px-4 py-3 text-zinc-300">{Number(c.value_gbp) ? formatMoney(c.value_gbp) : '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{c.last_contacted_at ? formatRelative(c.last_contacted_at) : 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove.mutate(c.id)} className="text-zinc-500 hover:text-rose-300" aria-label={`Delete ${c.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )}
              />
            )}

            {tab === 'pipeline' && (
              contacts.length === 0 ? (
                <Empty icon={Users} title="No pipeline yet" desc="Contacts you create appear here grouped by stage." />
              ) : (
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {STAGES.map((stage) => {
                    const items = byStage.get(stage) ?? [];
                    return (
                      <div key={stage} className="rounded-2xl border border-white/10 bg-white/[.02] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <Pill tone={STATUS_TONE[stage]}>{stage}</Pill>
                          <span className="text-[11px] text-zinc-500">{items.length}</span>
                        </div>
                        <div className="space-y-2">
                          {items.length === 0 && <p className="text-[11px] text-zinc-600">Empty</p>}
                          {items.map((c) => (
                            <button key={c.id} onClick={() => setSelected(c)} className="w-full rounded-xl border border-white/10 bg-white/[.03] p-2 text-left hover:bg-white/[.06]">
                              <p className="text-xs text-white">{c.name}</p>
                              <p className="text-[11px] text-zinc-500">{Number(c.value_gbp) ? formatMoney(c.value_gbp) : c.company || '—'}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {tab === 'activities' && (
              activities.length === 0 ? (
                <Empty icon={Activity} title="No activity yet" desc="Calls, emails and notes you log against contacts appear here." />
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-4 py-3">
                      <div>
                        <p className="text-xs text-white">{a.summary}</p>
                        <p className="text-[11px] text-zinc-500">{a.kind} · {formatRelative(a.occurred_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5">
            <h2 className="text-sm font-semibold text-white">New contact</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['name', 'Full name'], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'],
                ['title', 'Job title'], ['source', 'Source'],
              ].map(([key, label]) => (
                <label key={key} className="text-[11px] text-zinc-400">
                  {label}
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  />
                </label>
              ))}
              <label className="text-[11px] text-zinc-400">
                Stage
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                >
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-zinc-400">
                Value (GBP)
                <input
                  type="number" min="0" value={form.value_gbp}
                  onChange={(e) => setForm({ ...form, value_gbp: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
              <button
                disabled={!form.name.trim() || save.isPending}
                onClick={() => save.mutate({ ...form, value_gbp: Number(form.value_gbp || 0) })}
                className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0c0d13] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] uppercase tracking-wide text-violet-400">Contact</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{selected.name}</h2>
            <p className="text-xs text-zinc-500">{[selected.title, selected.company].filter(Boolean).join(' · ') || '—'}</p>
            <div className="mt-4 space-y-2 text-xs text-zinc-400">
              <p>Email: <span className="text-zinc-200">{selected.email || '—'}</span></p>
              <p>Phone: <span className="text-zinc-200">{selected.phone || '—'}</span></p>
              <p>Stage: <Pill tone={STATUS_TONE[selected.stage]}>{selected.stage}</Pill></p>
              <p>Value: <span className="text-zinc-200">{Number(selected.value_gbp) ? formatMoney(selected.value_gbp) : '—'}</span></p>
              <p>Source: <span className="text-zinc-200">{selected.source || '—'}</span></p>
            </div>
            {selected.notes && <p className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-zinc-300">{selected.notes}</p>}

            <h3 className="mt-6 text-xs font-semibold text-white">Activity</h3>
            <div className="mt-2 space-y-2">
              {activities.filter((a) => a.contact_id === selected.id).length === 0 && (
                <p className="text-[11px] text-zinc-500">No activity logged for this contact yet.</p>
              )}
              {activities.filter((a) => a.contact_id === selected.id).map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <p className="text-xs text-zinc-200">{a.summary}</p>
                  <p className="text-[11px] text-zinc-500">{a.kind} · {formatRelative(a.occurred_at)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log a call, email or note…"
                className="flex-1 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
              />
              <button
                disabled={!note.trim() || addNote.isPending}
                onClick={() => addNote.mutate({ contactId: selected.id, kind: 'note', summary: note.trim() })}
                className="rounded-xl border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
