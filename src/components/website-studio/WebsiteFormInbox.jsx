import {useEffect,useState} from 'react';
import {Archive,Inbox,Loader2,ShieldAlert} from 'lucide-react';
import {listWebsiteStudioFormSubmissions,updateWebsiteStudioFormSubmission} from '@/lib/website-studio/website-form-submissions.functions';

export default function WebsiteFormInbox({projectId}){
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const refresh=async()=>{if(!projectId)return setRows([]);try{setRows(await listWebsiteStudioFormSubmissions({data:{projectId,limit:100}}));setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load form submissions.')}};
  useEffect(()=>{void refresh()},[projectId]);
  const mark=async(id,status)=>{setBusy(id);try{await updateWebsiteStudioFormSubmission({data:{id,status}});await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not update submission.')}finally{setBusy('')}};

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-sky-300"><Inbox className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Form inbox</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Owner-only inbox for Website Studio form submissions. The database is ready for a trusted runtime adapter; anonymous direct table inserts remain disabled.</p>
    {!projectId?<p className="mt-4 text-xs text-zinc-600">Save the project to activate its submission inbox.</p>:error?<p className="mt-4 rounded-lg border border-rose-300/15 p-3 text-xs text-rose-200">{error}</p>:rows.length===0?<p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">No submissions yet.</p>:<div className="mt-4 space-y-2">{rows.map(row=><article key={row.id} className="rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-medium text-white">{row.form_key}</p><p className="mt-1 text-[10px] text-zinc-600">{new Date(row.created_at).toLocaleString()} · {row.status}</p></div><div className="flex gap-1"><button disabled={busy===row.id} onClick={()=>mark(row.id,'reviewed')} className="rounded-lg border border-emerald-300/15 px-2 py-1 text-[10px] text-emerald-200">{busy===row.id?<Loader2 className="h-3 w-3 animate-spin"/>:'Reviewed'}</button><button disabled={busy===row.id} onClick={()=>mark(row.id,'archived')} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-500"><Archive className="h-3 w-3"/></button><button disabled={busy===row.id} onClick={()=>mark(row.id,'spam')} className="rounded-lg border border-amber-300/15 px-2 py-1 text-[10px] text-amber-300"><ShieldAlert className="h-3 w-3"/></button></div></div><pre className="mt-3 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-zinc-500">{JSON.stringify(row.payload,null,2)}</pre></article>)}</div>}
  </section>
}
