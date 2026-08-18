import { Download, ExternalLink, FileText, MapPin } from 'lucide-react';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function downloadTextFile(file) {
  if (typeof window === 'undefined') return;
  const content = typeof file.content === 'string' ? file.content : JSON.stringify(file.content ?? '', null, 2);
  const blob = new Blob([content], { type: file.mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'palladium-task-output.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function LinkList({ links }) {
  const items = safeArray(links).filter((link) => link?.url);
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((link, i) => (
        <a
          key={`${link.url}-${i}`}
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-medium text-violet-200 hover:bg-violet-500/15"
        >
          <ExternalLink className="h-3 w-3" />{link.label || 'Open link'}
        </a>
      ))}
    </div>
  );
}

function FileList({ files }) {
  const items = safeArray(files);
  if (!items.length) return null;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((file, i) => (
        <button
          key={`${file.name || 'file'}-${i}`}
          type="button"
          onClick={() => file.url ? window.open(file.url, '_blank', 'noopener,noreferrer') : downloadTextFile(file)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3 text-left hover:bg-white/[.07]"
        >
          <div className="rounded-lg bg-emerald-500/10 p-2"><FileText className="h-4 w-4 text-emerald-300" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white">{file.label || file.name || 'Download file'}</p>
            <p className="text-[9px] uppercase tracking-wider text-zinc-600">{file.type || 'document'}</p>
          </div>
          <Download className="h-3.5 w-3.5 text-zinc-400" />
        </button>
      ))}
    </div>
  );
}

function DataTable({ table }) {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows) || !table.rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[520px] text-left text-[10px]">
        <thead className="bg-white/[.04] text-zinc-500">
          <tr>{table.columns.map((column) => <th key={column.key || column.label} className="px-3 py-2 font-medium">{column.label || column.key}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-t border-white/5">
              {table.columns.map((column) => <td key={column.key || column.label} className="px-3 py-2 text-zinc-300">{String(row?.[column.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricBars({ metrics }) {
  const items = safeArray(metrics).filter((m) => Number.isFinite(Number(m?.value)));
  if (!items.length) return null;
  const max = Math.max(...items.map((m) => Math.abs(Number(m.value))), 1);
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      {items.map((metric, i) => (
        <div key={`${metric.label}-${i}`}>
          <div className="mb-1 flex items-center justify-between text-[10px]"><span className="text-zinc-400">{metric.label}</span><span className="font-medium text-zinc-200">{metric.display ?? metric.value}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400/70" style={{ width: `${Math.max(4, Math.min(100, (Math.abs(Number(metric.value)) / max) * 100))}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function MapAction({ map }) {
  if (!map?.url) return null;
  return (
    <a href={map.url} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-500/[.08] p-3 hover:bg-sky-500/[.12]">
      <div className="rounded-lg bg-sky-500/15 p-2"><MapPin className="h-4 w-4 text-sky-300" /></div>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-white">{map.label || 'Open route'}</p><p className="truncate text-[10px] text-zinc-500">{map.summary || 'Open this route in your maps app'}</p></div>
      <ExternalLink className="h-3.5 w-3.5 text-sky-300" />
    </a>
  );
}

export default function RichTaskOutput({ result }) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const rich = result.rich && typeof result.rich === 'object' ? result.rich : result;
  const hasRich = rich.summary || safeArray(rich.links).length || safeArray(rich.files).length || rich.table || safeArray(rich.metrics).length || rich.map;
  if (!hasRich) return null;

  return (
    <div className="mt-2 rounded-xl border border-violet-400/15 bg-violet-500/[.04] p-3">
      {rich.title && <p className="text-[11px] font-semibold text-white">{rich.title}</p>}
      {rich.summary && <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">{rich.summary}</p>}
      <DataTable table={rich.table} />
      <MetricBars metrics={rich.metrics} />
      <MapAction map={rich.map} />
      <LinkList links={rich.links} />
      <FileList files={rich.files} />
    </div>
  );
}
