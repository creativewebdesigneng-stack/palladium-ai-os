import { useMemo, useState } from 'react';
import { FileSearch, Upload, AlertTriangle, CheckCircle2, ReceiptText } from 'lucide-react';
import { extractDocumentText } from '@/lib/memory/documentText';

const MONEY = /(?:£|GBP\s?)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi;
const DATE = /\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
const KEYWORDS = ['invoice','statement','balance','total','subtotal','vat','tax','payment','due','credit','debit','interest','salary','revenue','expense'];

function formatBytes(n){ if(n<1024)return `${n} B`; if(n<1048576)return `${(n/1024).toFixed(1)} KB`; return `${(n/1048576).toFixed(1)} MB`; }

export default function FinanceDocumentInspector(){
  const [result,setResult]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function inspect(file){
    if(!file) return;
    setBusy(true); setError(''); setResult(null);
    try{
      const text=await extractDocumentText(file);
      if(!text.trim()) throw new Error('This file type does not contain readable text for the local inspector.');
      const amounts=[...text.matchAll(MONEY)].slice(0,20).map(m=>m[0]);
      const dates=[...new Set(text.match(DATE)||[])].slice(0,12);
      const lower=text.toLowerCase();
      const signals=KEYWORDS.filter(k=>lower.includes(k));
      const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const dueLines=lines.filter(x=>/due|overdue|payment date|pay by/i.test(x)).slice(0,8);
      setResult({name:file.name,size:file.size,chars:text.length,amounts,dates,signals,dueLines});
    }catch(e){ setError(e instanceof Error?e.message:'Could not inspect this document.'); }
    finally{ setBusy(false); }
  }

  const confidence=useMemo(()=>result?Math.min(100,result.signals.length*10+Math.min(30,result.amounts.length*3)+Math.min(20,result.dates.length*2)):0,[result]);

  return <section className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-medium text-white">Financial document inspector</h2></div>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Inspect readable PDF, CSV, text, JSON or HTML locally in your browser for finance signals. This does not post transactions, file tax returns or treat extracted figures as verified ledger facts.</p></div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[.06] px-3 py-2 text-xs text-violet-100 hover:bg-violet-400/[.1]">
        <Upload className="h-3.5 w-3.5"/>{busy?'Inspecting…':'Choose document'}
        <input type="file" className="hidden" disabled={busy} accept=".pdf,.txt,.md,.csv,.json,.html,.xml,text/*,application/pdf" onChange={e=>inspect(e.target.files?.[0])}/>
      </label>
    </div>
    {error&&<div className="mt-4 flex gap-2 rounded-xl border border-rose-300/10 bg-rose-300/[.04] p-3 text-xs text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0"/>{error}</div>}
    {result&&<div className="mt-4 grid gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-white/[.06] bg-black/20 p-3 lg:col-span-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><span className="text-xs text-white">{result.name}</span><span className="text-[10px] text-zinc-600">{formatBytes(result.size)} · {result.chars.toLocaleString()} readable characters</span></div></div>
      <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Finance signal score</p><p className="mt-1 text-lg font-semibold text-white">{confidence}%</p><p className="text-[10px] text-zinc-600">Document-likeness, not accuracy.</p></div>
      <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Money references</p><p className="mt-1 text-lg font-semibold text-white">{result.amounts.length}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{result.amounts.slice(0,4).join(' · ')||'None detected'}</p></div>
      <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Date references</p><p className="mt-1 text-lg font-semibold text-white">{result.dates.length}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{result.dates.slice(0,3).join(' · ')||'None detected'}</p></div>
      <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Finance terms</p><p className="mt-1 text-lg font-semibold text-white">{result.signals.length}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{result.signals.join(' · ')||'None detected'}</p></div>
      {result.dueLines.length>0&&<div className="rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 lg:col-span-4"><div className="flex items-center gap-2 text-xs font-medium text-amber-100/80"><ReceiptText className="h-3.5 w-3.5"/>Possible payment/due-date lines</div><div className="mt-2 space-y-1">{result.dueLines.map((line,i)=><p key={i} className="text-[11px] text-zinc-400">{line.slice(0,220)}</p>)}</div></div>}
    </div>}
  </section>;
}
