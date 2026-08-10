import { X, CheckCircle2, XCircle, Copy } from 'lucide-react';

const fmtTime = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'long' });

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-[13px] text-zinc-200">{value || '—'}</span>
    </div>
  );
}

export default function AuditDetail({ entry, onClose }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-[#0c0d13]/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400">Audit event</p>
          <p className="text-sm font-semibold text-white">{entry.id}</p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex h-[calc(100%-4rem)] flex-col">
        <div className="flex items-center gap-2 px-4 py-3">
          {entry.result === 'success'
            ? <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Success</span>
            : <span className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-300"><XCircle className="h-3.5 w-3.5" />Failure</span>}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-violet-200">{entry.action}</code>
        </div>
        <div className="px-4">
          <Field label="Timestamp" value={fmtTime(entry.timestamp)} />
          <Field label="User" value={entry.user} />
          <Field label="Organisation" value={entry.org} />
          <Field label="Action" value={entry.action} />
          <Field label="Resource" value={entry.resource} />
          <Field label="IP Address" value={entry.ip} />
          <Field label="Result" value={entry.result} />
        </div>
        <div className="px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Metadata</span>
            <button className="grid h-5 w-5 place-items-center rounded text-zinc-500 hover:bg-white/5" onClick={() => navigator.clipboard?.writeText(JSON.stringify(entry.meta, null, 2))} title="Copy JSON"><Copy className="h-3 w-3" /></button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-300">{JSON.stringify(entry.meta, null, 2)}</pre>
        </div>
      </div>
    </aside>
  );
}