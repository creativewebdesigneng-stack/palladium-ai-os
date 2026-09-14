import {useState} from 'react';
import {Globe2,Loader2,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {addWebsiteStudioDomain,verifyWebsiteStudioDomain} from '@/lib/website-studio/website-publisher.functions';

export default function WebsiteDomainManager({project,setProject}){
  const current=project.domain_config||{};
  const [domain,setDomain]=useState(current.domain||'');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');

  const add=async()=>{
    if(!project.id||!domain.trim())return;
    setBusy('add');setError('');
    try{
      const result=await addWebsiteStudioDomain({data:{projectId:project.id,domain:domain.trim()}});
      setProject({...project,domain_config:result});
    }catch(e){setError(e instanceof Error?e.message:'Could not add domain.')}
    finally{setBusy('')}
  };

  const verify=async()=>{
    if(!project.id)return;
    setBusy('verify');setError('');
    try{
      const result=await verifyWebsiteStudioDomain({data:{projectId:project.id}});
      setProject({...project,domain_config:result});
    }catch(e){setError(e instanceof Error?e.message:'Could not verify domain.')}
    finally{setBusy('')}
  };

  const verification=Array.isArray(current.verification)?current.verification:[];
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-cyan-300"><Globe2 className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Custom domain</span></div><p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Attach a domain to the Website Studio Vercel project and verify DNS ownership. Blackstar stores the verification state instead of assuming the domain is active.</p></div>
      <span className={`rounded-full border px-2.5 py-1 text-[10px] ${current.verified?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{current.verified?'Verified':'Not verified'}</span>
    </div>
    {error&&<div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.03] p-3 text-xs text-rose-200">{error}</div>}
    <div className="mt-4 flex flex-col gap-2 md:flex-row"><input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="www.example.com" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"/><button disabled={!project.id||!domain.trim()||Boolean(busy)} onClick={add} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">{busy==='add'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Globe2 className="h-3.5 w-3.5"/>}Add domain</button>{current.domain&&<button disabled={Boolean(busy)} onClick={verify} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40">{busy==='verify'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="h-3.5 w-3.5"/>}Verify DNS</button>}</div>
    {current.domain&&<div className="mt-3 rounded-xl border border-white/[.07] p-3"><div className="flex items-center gap-2">{current.verified?<ShieldCheck className="h-4 w-4 text-emerald-300"/>:<TriangleAlert className="h-4 w-4 text-amber-300"/>}<p className="text-xs font-medium text-white">{current.domain}</p></div>{current.lastCheckedAt&&<p className="mt-1 text-[10px] text-zinc-600">Last checked {new Date(current.lastCheckedAt).toLocaleString()}</p>}{verification.length>0&&<div className="mt-3 space-y-2">{verification.map((item,index)=><pre key={index} className="overflow-auto rounded-lg bg-black/30 p-2 text-[10px] text-zinc-500">{JSON.stringify(item,null,2)}</pre>)}</div>}</div>}
  </section>
}
