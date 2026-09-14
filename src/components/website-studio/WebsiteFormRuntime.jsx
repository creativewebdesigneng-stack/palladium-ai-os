import {useState} from 'react';
import {Copy,KeyRound,Loader2,RefreshCw} from 'lucide-react';
import {ensureWebsiteStudioFormToken} from '@/lib/website-studio/website-form-runtime.functions';

export default function WebsiteFormRuntime({projectId}){
  const [token,setToken]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const create=async()=>{if(!projectId)return;setBusy(true);setMessage('');try{const result=await ensureWebsiteStudioFormToken({data:{projectId}});setToken(result.token);setMessage(result.rotated?'Submission token rotated. Existing deployed forms using the old token will stop submitting until republished.':'Submission token created. Add it only to the generated public form runtime configuration.')}catch(e){setMessage(e instanceof Error?e.message:'Could not create submission token.')}finally{setBusy(false)}};
  const copy=async()=>{if(token){await navigator.clipboard.writeText(token);setMessage('Token copied. It is shown only for this rotation response.')}};
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-teal-300"><KeyRound className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Public form runtime</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Create or rotate the project submission token used by Blackstar's public form endpoint. Only the SHA-256 hash is persisted; the plaintext token is returned once for deployment wiring.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button disabled={!projectId||busy} onClick={create} className="flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[.05] px-3 py-2 text-xs text-teal-100 disabled:opacity-40">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="h-3.5 w-3.5"/>}{token?'Rotate token':'Create submission token'}</button>{token&&<button onClick={copy} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400"><Copy className="h-3.5 w-3.5"/>Copy token</button>}</div>
    {token&&<div className="mt-3 break-all rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 font-mono text-[10px] text-amber-200">{token}</div>}
    {message&&<p className="mt-3 text-[10px] leading-4 text-zinc-600">{message}</p>}
  </section>
}
