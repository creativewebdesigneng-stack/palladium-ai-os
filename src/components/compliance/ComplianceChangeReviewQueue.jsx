import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, ExternalLink, RefreshCcw, Save, ShieldCheck, XCircle } from 'lucide-react';
import { listComplianceChangeReviews, saveComplianceChangeReview } from '@/lib/compliance/compliance-review.functions';

const inputClass = 'rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/35';

function Pill({ children, tone = 'zinc' }) {
  const tones = {
    zinc: 'border-white/[.08] bg-white/[.035] text-zinc-400',
    green: 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200',
    amber: 'border-amber-300/15 bg-amber-300/[.06] text-amber-200',
    red: 'border-rose-300/15 bg-rose-300/[.06] text-rose-200',
    violet: 'border-violet-300/15 bg-violet-300/[.06] text-violet-200',
    cyan: 'border-cyan-300/15 bg-cyan-300/[.06] text-cyan-200',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${tones[tone] || tones.zinc}`}>{children}</span>;
}

function severityTone(value) {
  if (value === 'critical') return 'red';
  if (value === 'high' || value === 'medium') return 'amber';
  return 'cyan';
}

function statusTone(value) {
  if (value === 'assessed') return 'green';
  if (value === 'dismissed') return 'zinc';
  if (value === 'in_review') return 'violet';
  return 'amber';
}

export default function ComplianceChangeReviewQueue() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ status: 'pending', applicability_status: '', owner_name: '', notes: '', due_on: '' });

  async function load() {
    setBusy(true);
    try {
      const next = await listComplianceChangeReviews({ data: {} });
      setRows(next);
      setError('');
      if (!selectedId && next.length) select(next[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load regulatory change reviews.');
    } finally {
      setBusy(false);
    }
  }

  function select(row) {
    setSelectedId(row.id);
    setForm({
      status: row.status || 'pending',
      applicability_status: row.applicability_status || '',
      owner_name: row.owner_name || '',
      notes: row.notes || '',
      due_on: row.due_on || '',
    });
  }

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => rows.find(row => row.id === selectedId) || null, [rows, selectedId]);
  const counts = useMemo(() => ({
    pending: rows.filter(row => row.status === 'pending').length,
    inReview: rows.filter(row => row.status === 'in_review').length,
    critical: rows.filter(row => ['pending', 'in_review'].includes(row.status) && row.change?.severity === 'critical').length,
    assessed: rows.filter(row => row.status === 'assessed').length,
  }), [rows]);

  async function save(e) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await saveComplianceChangeReview({ data: {
        id: selected.id,
        ...form,
        applicability_status: form.applicability_status || null,
      } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save regulatory review.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 border-t border-white/[.06] pt-8">
    <div className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-7">
      <div aria-hidden className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber-500/[.06] blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-amber-300"><BellRing className="h-4 w-4" /> Regulatory Change Review Queue <Pill tone="green">Durable alerts</Pill></div><h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight text-white lg:text-3xl">Move authoritative source changes from signal to governed compliance decision.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-500">A queue item is created only when a future authoritative change matches one of your active Sentinel alert rules. A detected source change is evidence for review, not an automatic conclusion that a rule applies to you.</p></div>
        <button onClick={load} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.05] px-4 py-2.5 text-xs text-amber-100 disabled:opacity-50"><RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh queue</button>
      </div>
      <div className="relative mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[["Pending", counts.pending, Clock3, 'amber'], ["In review", counts.inReview, ShieldCheck, 'violet'], ["Critical open", counts.critical, AlertTriangle, 'red'], ["Assessed", counts.assessed, CheckCircle2, 'green']].map(([label, value, Icon, tone]) => <div key={label} className="rounded-2xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-zinc-600">{label}</p><Icon className={`h-3.5 w-3.5 ${tone === 'red' ? 'text-rose-300' : tone === 'green' ? 'text-emerald-300' : tone === 'violet' ? 'text-violet-300' : 'text-amber-300'}`} /></div><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>)}
      </div>
    </div>

    {error && <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[.05] px-4 py-3 text-xs text-rose-200">{error}</div>}

    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <div className="blackstar-panel rounded-[24px] border border-white/[.08] bg-black/25 p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-medium text-white">Matched changes</h3><p className="mt-1 text-xs text-zinc-600">{rows.length} review item{rows.length === 1 ? '' : 's'}</p></div><Pill tone={counts.pending || counts.inReview ? 'amber' : 'green'}>{counts.pending + counts.inReview} open</Pill></div><div className="mt-4 space-y-2">{rows.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-600">No regulatory changes currently require review. Future matched changes will appear here automatically.</div> : rows.map(row => {
        const reg = row.change?.regulation;
        const source = reg?.source;
        return <button key={row.id} onClick={() => select(row)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === row.id ? 'border-amber-300/20 bg-amber-300/[.045]' : 'border-white/[.06] bg-black/20 hover:border-white/[.11]'}`}><div className="flex flex-wrap items-center gap-2"><Pill tone={severityTone(row.change?.severity)}>{row.change?.severity || 'unknown'}</Pill><Pill tone={statusTone(row.status)}>{row.status.replaceAll('_', ' ')}</Pill>{row.change?.authoritative && <Pill tone="cyan">authoritative source</Pill>}</div><p className="mt-2 text-sm font-medium text-white">{reg?.title || 'Regulatory change'}</p><p className="mt-1 text-[10px] text-zinc-600">{reg?.jurisdiction || 'Unknown jurisdiction'}{source?.regulator ? ` · ${source.regulator}` : ''}{row.profile?.name ? ` · ${row.profile.name}` : ''}</p>{row.change?.summary && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{row.change.summary}</p>}<p className="mt-2 text-[10px] text-zinc-700">Detected {row.change?.detected_at ? new Date(row.change.detected_at).toLocaleString() : '—'}{row.due_on ? ` · due ${row.due_on}` : ''}</p></button>;
      })}</div></div>

      <form onSubmit={save} className="blackstar-panel rounded-[24px] border border-white/[.08] bg-black/25 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300" /><h3 className="font-medium text-white">Governed review</h3></div>{!selected ? <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-600">Select a review item to assess it.</div> : <>
        <div className="mt-4 rounded-2xl border border-white/[.06] bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><Pill tone={severityTone(selected.change?.severity)}>{selected.change?.severity}</Pill><span className="text-xs font-medium text-white">{selected.change?.regulation?.title}</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">{selected.change?.summary || 'Review the captured source version and determine whether any compliance action is required.'}</p>{selected.change?.regulation?.canonical_url && <a href={selected.change.regulation.canonical_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300/80">Open authoritative source <ExternalLink className="h-3 w-3" /></a>}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>{['pending','in_review','assessed','dismissed'].map(x => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select><select value={form.applicability_status} onChange={e => setForm({ ...form, applicability_status: e.target.value })} className={inputClass}><option value="">No applicability decision yet</option>{['review','applicable','partially_applicable','not_applicable','out_of_scope'].map(x => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select><input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} placeholder="Review owner" className={inputClass} /><input type="date" value={form.due_on} onChange={e => setForm({ ...form, due_on: e.target.value })} className={inputClass} /><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Assessment rationale, scope, impact, actions and evidence reviewed" className={`${inputClass} min-h-32 sm:col-span-2`} /><button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-3 py-2 text-xs text-violet-100 sm:col-span-2"><Save className="h-3.5 w-3.5" />Save governed review</button></div>
        <div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-3 text-[10px] leading-5 text-zinc-500"><div className="flex items-center gap-1.5 text-amber-100"><AlertTriangle className="h-3.5 w-3.5" />Decision boundary</div>Choosing “assessed” with an applicability status writes that governed decision into the Sentinel applicability register. It does not assert that Blackstar independently determined legal effect.</div>
      </>}</form>
    </div>
  </section>;
}
