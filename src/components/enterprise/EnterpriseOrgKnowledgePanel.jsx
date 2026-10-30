import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Building2, FileSearch, LockKeyhole, Loader2, ShieldCheck, Users } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { ingestKnowledgeDocument } from '@/lib/memory/memory.functions';
import {
  listOrgKnowledgeDocuments, previewOrgKnowledgeEvidence, setOrgKnowledgeSharing,
} from '@/lib/enterprise/org-knowledge-evidence.functions';

export default function EnterpriseOrgKnowledgePanel({ documents = [] }) {
  const { session, organisations, activeOrgId } = useWorkspace();
  const qc = useQueryClient();
  const [chosenOrg, setChosenOrg] = useState('');
  const orgId = chosenOrg || activeOrgId || '';
  const org = organisations.find(o => o.id === orgId);
  const admin = org?.role === 'owner' || org?.role === 'admin';
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [question, setQuestion] = useState('');
  const [ids, setIds] = useState([]);
  const listFn = useServerFn(listOrgKnowledgeDocuments);
  const ingestFn = useServerFn(ingestKnowledgeDocument);
  const shareFn = useServerFn(setOrgKnowledgeSharing);
  const evidenceFn = useServerFn(previewOrgKnowledgeEvidence);
  const shared = useQuery({
    queryKey: ['enterprise-org-documents',orgId],
    queryFn: () => listFn({data:{orgId}}),
    enabled: session === 'yes' && Boolean(org),
    retry: false,
  });
  const owned = useMemo(() => documents.filter(doc =>
    doc?.org_id === orgId && doc?.agent_id == null && doc?.status === 'ready',
  ),[documents,orgId]);
  const upload = useMutation({
    // Deliberately scope the *memory summary* private even for organisation
    // documents: only the separately audited share action enables chunk read.
    mutationFn: () => ingestFn({data:{
      title: title.trim(),text: sourceText.trim(),org_id: orgId,scope:'private',
      source: 'enterprise-knowledge-owner-contributed-text',agent_id:null,
    }}),
    onSuccess: () => {
      setTitle('');setSourceText('');
      qc.invalidateQueries({queryKey:['knowledge-documents']});
      qc.invalidateQueries({queryKey:['enterprise-org-documents',orgId]});
    },
  });
  const sharing = useMutation({
    mutationFn: ({documentId,shared}) => shareFn({data:{orgId,documentId,shared}}),
    onSuccess: () => {
      qc.invalidateQueries({queryKey:['knowledge-documents']});
      qc.invalidateQueries({queryKey:['enterprise-org-documents',orgId]});
      setIds([]);evidence.reset();
    },
  });
  const evidence = useMutation({
    mutationFn: () => evidenceFn({data:{orgId,question:question.trim(),documentIds:ids}}),
  });
  const choose = (id,yes) => {
    evidence.reset();
    setIds(prev => yes ? [...prev,id].slice(0,3): prev.filter(x=>x!==id));
  };

  return <section className="mt-5 rounded-[24px] border border-cyan-300/20 bg-slate-900/40 p-5 md:p-6">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-300"><Building2 className="h-5 w-5" /></div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200">Enterprise · organisation knowledge pilot</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Authorised shared knowledge</h2>
        <p className="mt-1 max-w-3xl text-xs leading-6 text-zinc-400">
          Explicitly share a ready organisation document with current members, or inspect source excerpts
          as an authorised member. This is read-only evidence retrieval, not AI answer generation or a
          certified multi-tenant deployment.
        </p>
      </div>
    </div>
    {session !== 'yes' ? <p className="mt-4 text-xs text-zinc-400">Sign in to access organisation knowledge.</p>
      : !organisations.length ? <p className="mt-4 text-xs text-zinc-400">Join or create an organisation to begin.</p>
      : <>
        <label className="mt-4 block text-xs font-medium text-zinc-300">Organisation
          <select value={orgId} onChange={event=>{setChosenOrg(event.target.value);setIds([]);evidence.reset();}}
            className="mt-2 w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white">
            {organisations.map(o=><option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
          </select>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4"/>Current role: {org?.role||'none'}</span>
          <span className="inline-flex items-center gap-1"><LockKeyhole className="h-4 w-4"/>Sharing is off by default</span>
        </div>
        {admin && <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-semibold text-white">Contribute source text — initially private</h3>
          <p className="text-xs text-zinc-500">Paste approved test text only. The generated knowledge summary remains private until you explicitly opt the ready document into member access. Document-memory and organisation-sharing preferences apply to reading.</p>
          <input aria-label="Source title" placeholder="Source title" maxLength={200} value={title}
            onChange={e=>setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white" />
          <textarea aria-label="Source text" placeholder="Approved source text (no secrets)" maxLength={12000} rows={4} value={sourceText}
            onChange={e=>setSourceText(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-xs text-white"/>
          <button type="button" onClick={()=>upload.mutate()} disabled={upload.isPending||!title.trim()||!sourceText.trim()}
            className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-40">
            {upload.isPending?'Indexing…':'Index private organisation source'}
          </button>
          {upload.error && <p role="alert" className="text-xs text-rose-300">{friendlyMessage(upload.error)}</p>}
          {upload.isSuccess && <p className="text-xs text-cyan-200">Document indexed. It is not shared until explicitly enabled below.</p>}
        </div>}
        {admin && <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-zinc-200">Your ready organisation documents — explicit sharing</legend>
          <p className="mt-1 text-xs text-zinc-500">Only the document owner who is currently an organisation admin or owner can enable or revoke sharing. Revocation applies to indexed source excerpts, not copies others may already have made.</p>
          <div className="mt-2 space-y-2">
            {owned.length ? owned.slice(0,20).map(doc=>{
              const enabled = doc.metadata?.enterprise_shared === true;
              return <label key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-xs text-zinc-300">
                <span className="min-w-0 break-words">{doc.title||'Untitled source'}</span>
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={enabled} disabled={sharing.isPending}
                    onChange={e=>sharing.mutate({documentId:doc.id,shared:e.target.checked})} />
                  <span>{enabled?'Shared':'Private'}</span>
                </span>
              </label>;
            }):<p className="mt-2 text-xs text-zinc-500">No ready sources owned by you in this organisation.</p>}
          </div>
          {sharing.error && <p role="alert" className="mt-2 text-xs text-rose-300">{friendlyMessage(sharing.error)}</p>}
        </fieldset>}
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-zinc-200">Available explicitly shared sources</legend>
          {shared.isLoading ? <p className="mt-2 text-xs text-zinc-400">Loading live membership and shared sources…</p>
          : shared.error ? <p role="alert" className="mt-2 text-xs text-rose-300">{friendlyMessage(shared.error)}</p>
          : !shared.data?.documents?.length ? <p className="mt-2 text-xs text-zinc-500">No explicitly shared, ready sources are accessible in this organisation.</p>
          : <div className="mt-2 grid gap-2 md:grid-cols-2">{shared.data.documents.map(doc=>
            <label key={doc.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-200">
              <input type="checkbox" checked={ids.includes(doc.id)} disabled={!ids.includes(doc.id)&&ids.length>=3}
                onChange={e=>choose(doc.id,e.target.checked)} />
              <span className="min-w-0 break-words">{doc.title}{doc.ownedByYou?' · yours':''}</span>
            </label>)}</div>}
        </fieldset>
        <label className="mt-4 block text-xs text-zinc-300">Evaluation question
          <textarea maxLength={300} rows={2} value={question} onChange={e=>{setQuestion(e.target.value);evidence.reset();}}
            placeholder="What does the approved policy say about handling customer returns?"
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white"/>
        </label>
        <button type="button" onClick={()=>evidence.mutate()}
          disabled={!ids.length || question.trim().length<8 || evidence.isPending}
          className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-40">
          {evidence.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<FileSearch className="h-4 w-4"/>}
          Check bounded source evidence
        </button>
        {evidence.error && <p role="alert" className="mt-3 text-xs text-rose-300">{friendlyMessage(evidence.error)}</p>}
        {evidence.isSuccess && evidence.data && <div className="mt-4 space-y-2" aria-live="polite">
          <p className="flex items-center gap-2 text-xs font-semibold text-white"><ShieldCheck className="h-4 w-4 text-cyan-200"/>
            {evidence.data.excerpts.length} source excerpt(s) · {evidence.data.matchedDocumentCount}/{evidence.data.requestedDocumentCount} source(s) represented
          </p>
          <p className="text-xs text-zinc-500">{evidence.data.limitation}</p>
          {evidence.data.excerpts.map(hit=><article key={hit.citation} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-white">{hit.documentTitle}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-cyan-200">{hit.citation}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">{hit.excerpt}</p>
          </article>)}
        </div>}
      </>}
  </section>;
}
