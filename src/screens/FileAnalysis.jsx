import { useState } from 'react';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Loader2, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';

const supported = [['PDF','pdf'],['Word','docx'],['Excel','xlsx'],['PowerPoint','pptx'],['Images','png'],['CSV','csv'],['ZIP','zip'],['Code','jsx']];

export default function FileAnalysis() {
  const [files, setFiles] = useState([
    { name: 'quarterly_report.pdf', type: 'PDF', size: '2.4 MB', status: 'done', summary: 'Q3 revenue grew 24% YoY driven by enterprise expansion and a 12% increase in net retention.' },
    { name: 'customer_data.csv', type: 'CSV', size: '880 KB', status: 'processing' },
  ]);
  const [drag, setDrag] = useState(false);

  const add = list => setFiles(f => [...Array.from(list).map(file => ({ name: file.name, type: file.name.split('.').pop().toUpperCase(), size: (file.size / 1024).toFixed(0) + ' KB', status: 'processing' })), ...f]);

  return (
    <>
      <PageHeader eyebrow="AI" title="File Analysis" description="Upload documents and let PalladiumAI extract, summarize, and suggest actions." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }} className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/15 bg-white/[.025]'}`}>
            <UploadCloud className="mx-auto h-10 w-10 text-violet-400" />
            <p className="mt-3 text-sm text-white">Drag & drop files here</p>
            <p className="text-xs text-zinc-500">or click to browse — PDF, Word, Excel, PowerPoint, Images, CSV, ZIP, Code</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"><input type="file" multiple className="hidden" onChange={e => add(e.target.files)} />Browse files</label>
          </div>

          <div className="mt-4 space-y-3">
            {files.map((f, i) => (
              <Panel key={i} title="">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5"><FileText className="h-5 w-5 text-violet-400" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{f.name}</p><p className="text-xs text-zinc-500">{f.type} · {f.size}</p></div>
                  <span className="flex items-center gap-1 text-xs">{f.status === 'done' ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Analyzed</span> : <span className="flex items-center gap-1 text-cyan-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Analyzing</span>}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-rose-400"><X className="h-4 w-4" /></button>
                </div>
                {f.status === 'done' && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="flex items-center gap-1.5 text-xs text-violet-400"><Sparkles className="h-3.5 w-3.5" />AI Summary</p>
                    <p className="mt-2 text-sm text-zinc-300">{f.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">{['Extract tables','Generate report','Find key risks','Compare quarters'].map(s => <button key={s} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">{s}</button>)}</div>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Supported formats"><div className="grid grid-cols-2 gap-2">{supported.map(([l, ext]) => <div key={ext} className="rounded-lg border border-white/10 p-2.5 text-center text-xs text-zinc-400"><p className="font-medium text-white">{l}</p><p className="text-zinc-600">.{ext}</p></div>)}</div></Panel>
          <Panel title="Extracted information"><div className="space-y-2 text-xs text-zinc-400">{[['Key metrics', '12'],['Tables', '4'],['Entities', '38'],['Dates', '7']].map(([k, v]) => <div key={k} className="flex justify-between border-b border-white/5 py-1.5"><span>{k}</span><span className="text-zinc-200">{v}</span></div>)}</div></Panel>
          <Panel title="Suggested actions"><div className="space-y-2">{['Create a summary doc','Build a chart from metrics','Share with team'].map(s => <button key={s} className="flex w-full items-center justify-between rounded-lg border border-white/10 p-2.5 text-xs text-zinc-300 hover:bg-white/5">{s}<Sparkles className="h-3.5 w-3.5 text-violet-400" /></button>)}</div></Panel>
        </div>
      </div>
    </>
  );
}