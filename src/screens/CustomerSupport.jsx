import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Ticket, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import {
  listSupport, createTicket, updateTicket, deleteTicket,
  listTicketMessages, addTicketMessage,
} from '@/lib/business/support.functions';
import {
  Stat, Tabs, Empty, Loading, Failed, Table, Pill, STATUS_TONE,
  formatNumber, formatPercent, formatRelative,
} from '@/components/business/live';

const STATUSES = ['open', 'pending', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const TABS = [{ id: 'all', label: 'All' }, ...STATUSES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))];
const EMPTY_FORM = { subject: '', body: '', requester_name: '', requester_email: '', priority: 'normal', channel: 'web' };

export default function CustomerSupport() {
  const qc = useQueryClient();
  const session = useSessionReady();
  const [tab, setTab] = useState('all');
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const listFn = useServerFn(listSupport);
  const createFn = useServerFn(createTicket);
  const updateFn = useServerFn(updateTicket);
  const deleteFn = useServerFn(deleteTicket);
  const messagesFn = useServerFn(listTicketMessages);
  const replyFn = useServerFn(addTicketMessage);

  const support = useQuery({
    queryKey: ['support'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const messages = useQuery({
    queryKey: ['support-messages', selected?.id],
    queryFn: () => messagesFn({ data: { ticketId: selected.id } }),
    enabled: !!selected?.id,
    retry: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['support'] });
    qc.invalidateQueries({ queryKey: ['support-messages'] });
  };
  const fail = (e) => toast({ title: 'Action failed', description: friendlyMessage(e), variant: 'destructive' });

  const create = useMutation({
    mutationFn: (payload) => createFn({ data: payload }),
    onSuccess: () => { setForm(null); invalidate(); toast({ title: 'Ticket created' }); },
    onError: fail,
  });
  const update = useMutation({
    mutationFn: (payload) => updateFn({ data: payload }),
    onSuccess: (row) => { setSelected(row); invalidate(); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => { setSelected(null); invalidate(); toast({ title: 'Ticket deleted' }); },
    onError: fail,
  });
  const sendReply = useMutation({
    mutationFn: (payload) => replyFn({ data: payload }),
    onSuccess: () => { setReply(''); invalidate(); },
    onError: fail,
  });

  const tickets = support.data?.tickets ?? [];
  const metrics = support.data?.metrics;
  const visible = useMemo(
    () => (tab === 'all' ? tickets : tickets.filter((t) => t.status === tab)),
    [tickets, tab],
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Customer Support Centre"
        description="Live ticket queue backed by your workspace records. Every metric is computed from the tickets you actually have."
        action={
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New ticket
          </button>
        }
      />

      {session === 'no' && <Failed message="Sign in to view your support queue." />}
      {session === 'yes' && support.isLoading && <Loading />}
      {support.isError && <Failed message={friendlyMessage(support.error)} onRetry={() => support.refetch()} />}

      {support.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Open" value={formatNumber(metrics.open)} tone="text-sky-300" />
            <Stat label="Pending" value={formatNumber(metrics.pending)} tone="text-amber-300" />
            <Stat label="Resolved (7d)" value={formatNumber(metrics.resolved7d)} tone="text-emerald-300" />
            <Stat label="CSAT" value={metrics.csat == null ? null : formatPercent(metrics.csat)} hint="From rated tickets only" />
            <Stat
              label="Avg first response"
              value={metrics.avgResponseMinutes == null ? null : `${Math.floor(metrics.avgResponseMinutes / 60)}h ${metrics.avgResponseMinutes % 60}m`}
            />
          </div>

          <div className="mt-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

          <div className="mt-4">
            <Table
              columns={['Subject', 'Requester', 'Status', 'Priority', 'Created', '']}
              rows={visible}
              empty={
                <Empty
                  icon={Ticket}
                  title={tickets.length ? `No ${tab} tickets` : 'No tickets yet'}
                  desc={tickets.length ? 'Nothing in this queue right now.' : 'Create a ticket, or connect an inbound channel, and it will appear here.'}
                  action={
                    <button onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white hover:bg-white/10">
                      New ticket
                    </button>
                  }
                />
              }
              renderRow={(t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(t)} className="text-white hover:text-violet-300">{t.subject}</button>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.requester_name || t.requester_email || '—'}</td>
                  <td className="px-4 py-3"><Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill></td>
                  <td className="px-4 py-3 text-zinc-300">{t.priority}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatRelative(t.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove.mutate(t.id)} className="text-zinc-500 hover:text-rose-300" aria-label={`Delete ${t.subject}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
            <h2 className="text-sm font-semibold text-white">New ticket</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Subject"
                className="w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
              />
              <textarea
                value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Describe the issue" rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                  placeholder="Requester name"
                  className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                />
                <input
                  value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
                  placeholder="Requester email"
                  className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                />
                <select
                  value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                >
                  {['web', 'email', 'chat', 'phone', 'api'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
              <button
                disabled={!form.subject.trim() || create.isPending}
                onClick={() => create.mutate({ ...form, requester_email: form.requester_email || undefined })}
                className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {create.isPending ? 'Creating…' : 'Create ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0c0d13] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] uppercase tracking-wide text-violet-400">Ticket</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{selected.subject}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {selected.requester_name || selected.requester_email || 'Unknown requester'} · {formatRelative(selected.created_at)}
            </p>
            {selected.body && <p className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-zinc-300">{selected.body}</p>}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[11px] text-zinc-400">
                Status
                <select
                  value={selected.status}
                  onChange={(e) => update.mutate({ id: selected.id, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-zinc-400">
                Priority
                <select
                  value={selected.priority}
                  onChange={(e) => update.mutate({ id: selected.id, priority: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <h3 className="mt-6 text-xs font-semibold text-white">Conversation</h3>
            <div className="mt-2 space-y-2">
              {messages.isLoading && <p className="text-[11px] text-zinc-500">Loading messages…</p>}
              {messages.isSuccess && messages.data.length === 0 && (
                <p className="text-[11px] text-zinc-500">No replies yet.</p>
              )}
              {(messages.data ?? []).map((m) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <p className="text-[11px] text-zinc-500">{m.author_role} · {formatRelative(m.created_at)}</p>
                  <p className="mt-1 text-xs text-zinc-200">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white placeholder:text-zinc-500"
              />
              <button
                disabled={!reply.trim() || sendReply.isPending}
                onClick={() => sendReply.mutate({ ticketId: selected.id, body: reply.trim(), author_role: 'agent' })}
                className="rounded-xl border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
