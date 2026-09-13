import{useMemo,useState}from'react';import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';import{useServerFn}from'@tanstack/react-start';import{AlertTriangle,BookOpenCheck,ExternalLink,FileSearch2,Loader2,ShieldCheck}from'lucide-react';import ReactMarkdown from'react-markdown';import{listDocuments}from'@/lib/documents/documents.functions';import{analyseLegalDocument}from'@/lib/legal/legal-document-analysis.functions';

const MODES=[['contract-review','Contract review'],['clause-map','Clause map'],['rights-obligations','Rights & obligations'],['risk-ambiguity','Risk & ambiguity'],['plain-language','Plain-language explanation']];
const JURISDICTIONS=['','United Kingdom','England and Wales','Scotland','Northern Ireland','European Union','United States','Canada','Australia','New Zealand','International / cross-border','Other / not yet determined'];

export default function LegalDocumentAnalysis(){
  const listFn=useServerFn(listDocuments),analyseFn=useServerFn(analyseLegalDocument),qc=useQueryClient();
  const[documentId,setDocumentId]=useState(''),[mode,setMode]=useState('contract-review'),[jurisdiction,setJurisdiction]=useState(''),[focus,setFocus]=useState('');
  const docs=useQuery({queryKey:['legal-document-analysis-documents'],queryFn:()=>listFn({data:{}}),retry:false});
  const available=useMemo(()=>(docs.data?.documents??[]).filter(d=>String(d.body??'').trim()&&d.source!=='ai_legal_analysis'),[docs.data]);
  const selected=available.find(d=>d.id===documentId)??null;
  const run=useMutation({mutationFn:()=>analyseFn({data:{document_id:documentId,mode,jurisdiction,focus}}),onSuccess:()=>{qc.invalidateQueries({queryKey:['documents-workspace']});qc.invalidateQueries({queryKey:['legal-document-analysis-documents']});}});

  return <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileSearch2 className="h-4 w-4 text-fuchsia-300"/><h2 className="font-medium text-white">Legal Document Analysis</h2></div><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Review a document already stored in your private Blackstar Documents workspace. Analysis is source-grounded, owner-scoped and saved back as a derived report only after the model succeeds.</p></div><a href="/documents" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] text-zinc-300 hover:bg-white/[.04]">Open Documents<ExternalLink className="h-3 w-3"/></a></div>

    {docs.error&&<p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.04] p-3 text-xs text-rose-200">Private documents could not be loaded.</p>}
    <div className="mt-4 grid gap-2 xl:grid-cols-[1.3fr_210px_210px_1fr_auto]">
      <select value={documentId} onChange={e=>setDocumentId(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2.5 text-xs text-white"><option value="">{docs.isLoading?'Loading private documents…':'Choose a persisted document'}</option>{available.map(d=><option key={d.id} value={d.id}>{d.title} · {d.doc_type}</option>)}</select>
      <select value={mode} onChange={e=>setMode(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{MODES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{JURISDICTIONS.map(value=><option key={value||'none'} value={value}>{value||'Jurisdiction not specified'}</option>)}</select>
      <input value={focus} onChange={e=>setFocus(e.target.value)} maxLength={500} placeholder="Optional focus: termination, IP, liability…" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none"/>
      <button onClick={()=>run.mutate()} disabled={!documentId||run.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/15 bg-fuchsia-300/[.06] px-4 py-2 text-xs text-fuchsia-100 disabled:opacity-40">{run.isPending?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<BookOpenCheck className="h-3.5 w-3.5"/>}Analyse</button>
    </div>

    {selected&&<div className="mt-3 grid gap-2 md:grid-cols-3"><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Source document</p><p className="mt-1 truncate text-xs text-zinc-300">{selected.title}</p></div><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Persisted type</p><p className="mt-1 text-xs text-zinc-300">{selected.doc_type} · {selected.format}</p></div><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Evidence rule</p><p className="mt-1 text-[11px] leading-4 text-zinc-400">Document wording is evidence of drafting, not proof of legal validity or current law.</p></div></div>}

    {run.error&&<p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.04] p-3 text-xs text-rose-200">{run.error instanceof Error?run.error.message:'Legal document analysis failed.'}</p>}
    {run.data&&<div className="mt-5 grid gap-4 xl:grid-cols-[1fr_330px]">
      <article className="prose prose-invert prose-sm max-w-none rounded-2xl border border-white/[.06] bg-black/20 p-4 text-zinc-300"><ReactMarkdown>{run.data.analysis}</ReactMarkdown></article>
      <aside className="space-y-3">
        <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3"><div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/><p className="text-xs text-zinc-300">Derived report saved</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{run.data.derived_document.title}</p><p className="mt-1 text-[9px] text-zinc-700">{run.data.provider} · {run.data.model}</p></div>
        <div className={run.data.evidence.complete?'rounded-xl border border-white/[.06] bg-black/20 p-3':'rounded-xl border border-amber-300/15 bg-amber-400/[.035] p-3'}><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Evidence coverage</p><p className="mt-1 text-xs text-zinc-300">{run.data.evidence.complete?'Full persisted text fit in analysis window':`Excerpted window · ${Number(run.data.evidence.omitted_chars).toLocaleString()} middle characters omitted`}</p>{!run.data.evidence.complete&&<p className="mt-1 text-[10px] leading-4 text-amber-100/60">A provision not located in this run cannot be treated as absent from the full document.</p>}</div>
        <div className="flex gap-2 rounded-xl border border-amber-300/10 bg-amber-400/[.025] p-3 text-[10px] leading-4 text-amber-100/60"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>Jurisdiction selection is context only. Current law, enforceability and legal consequences require authoritative legal research and, where consequential, qualified professional review.</div>
      </aside>
    </div>}
  </section>;
}
