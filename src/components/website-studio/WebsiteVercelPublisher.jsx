import {useEffect,useState} from 'react';
import {ExternalLink,Loader2,Rocket,ShieldCheck,RefreshCw,TriangleAlert} from 'lucide-react';
import {addWebsiteStudioDomain,getWebsiteStudioPublisherStatus,publishWebsiteStudioProject,verifyWebsiteStudioDeployment,verifyWebsiteStudioDomain} from '@/lib/website-studio/website-publisher.functions';

export default function WebsiteVercelPublisher({project,onPublished}){
  const [status,setStatus]=useState(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const [domain,setDomain]=useState(project.domain_config?.domain||'');
  const [domainState,setDomainState]=useState(project.domain_config||null);

  useEffect(()=>{
    let active=true;
    getWebsiteStudioPublisherStatus({data:undefined})
      .then((value)=>{if(active)setStatus(value)})
      .catch((e)=>{if(active)setError(e instanceof Error?e.message:'Could not read publisher status.')});
    return()=>{active=false};
  },[]);

  const deploy=async(target)=>{
    if(!project.id)return setError('Save the Website Studio project before publishing.');
    if(target==='production'&&!window.confirm('Publish this exact Website Studio project to production on Vercel?'))return;
    setBusy(target);setError('');setResult(null);
    try{
      const value=await publishWebsiteStudioProject({data:{projectId:project.id,target}});
      setResult(value);
      if(value.verified)onPublished?.(value);
    }catch(e){setError(e instanceof Error?e.message:'Website publishing failed.')}
    finally{setBusy('')}
  };

  const verify=async(target)=>{
    if(!project.id)return;
    setBusy('verify');setError('');
    try{
      const value=await verifyWebsiteStudioDeployment({data:{projectId:project.id,target}});
      setResult(value);
      if(value.verified)onPublished?.(value);
    }catch(e){setError(e instanceof Error?e.message:'Could not verify deployment.')}
    finally{setBusy('')}
  };

  const addDomain=async()=>{
    if(!project.id||!domain.trim())return;
    setBusy('domain-add');setError('');
    try{
      const value=await addWebsiteStudioDomain({data:{projectId:project.id,domain:domain.trim()}});
      setDomainState(value);
      onPublished?.({domainConfig:value,domainOnly:true});
    }catch(e){setError(e instanceof Error?e.message:'Could not add custom domain.')}
    finally{setBusy('')}
  };

  const verifyDomain=async()=>{
    if(!project.id)return;
    setBusy('domain-verify');setError('');
    try{
      const value=await verifyWebsiteStudioDomain({data:{projectId:project.id}});
      setDomainState(value);
      onPublished?.({domainConfig:value,domainOnly:true});
    }catch(e){setError(e instanceof Error?e.message:'Could not verify custom domain.')}
    finally{setBusy('')}
  };

  const configured=Boolean(status?.configured);
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-emerald-300"><Rocket className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">One-click Vercel publisher</span></div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Deploy the deterministic Website Studio project package directly from Blackstar. Credentials remain server-side and a project is only marked ready/published after Vercel reports READY.</p>
      </div>
      <span className={`rounded-full border px-2.5 py-1 text-[10px] ${configured?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{configured?'Vercel configured':'Vercel not configured'}</span>
    </div>

    {!configured&&<div className="mt-3 flex gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"/><p className="text-[10px] leading-4 text-zinc-600">Set WEBSITE_STUDIO_VERCEL_TOKEN and WEBSITE_STUDIO_VERCEL_TEAM_ID server-side. Do not place the token in browser environment variables.</p></div>}
    {error&&<div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.03] p-3 text-xs text-rose-200">{error}</div>}

    <div className="mt-4 flex flex-wrap gap-2">
      <button disabled={!configured||!project.id||Boolean(busy)} onClick={()=>deploy('preview')} className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">{busy==='preview'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Rocket className="h-3.5 w-3.5"/>}Deploy preview</button>
      <button disabled={!configured||!project.id||Boolean(busy)} onClick={()=>deploy('production')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{busy==='production'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<ShieldCheck className="h-3.5 w-3.5"/>}Publish production</button>
      {project.deployment_id&&<button disabled={!configured||Boolean(busy)} onClick={()=>verify(project.status==='published'?'production':'preview')} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400 disabled:opacity-40">{busy==='verify'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="h-3.5 w-3.5"/>}Verify deployment</button>}
    </div>

    {result&&<div className={`mt-4 rounded-xl border p-3 ${result.verified?'border-emerald-300/15 bg-emerald-300/[.03]':'border-blue-300/15 bg-blue-300/[.03]'}`}>
      <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-white">{result.target} deployment · {result.readyState||'unknown state'}</p><span className="text-[10px] text-zinc-600">{result.verified?'READY verified':'Created; verification still pending'}</span></div>
      {result.url&&<a href={result.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300"><ExternalLink className="h-3 w-3"/>Open deployment</a>}
    </div>}

    <div className="mt-5 rounded-xl border border-white/[.07] bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-medium text-white">Custom domain</p><p className="mt-1 text-[10px] text-zinc-600">Attach a domain only after the Website Studio project has a Vercel deployment.</p></div>{domainState?.domain&&<span className={`rounded-full border px-2 py-1 text-[10px] ${domainState.verified?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{domainState.verified?'Verified':'Verification required'}</span>}</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="www.example.com" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"/><button disabled={!configured||!project.deployment_id||!domain.trim()||Boolean(busy)} onClick={addDomain} className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">{busy==='domain-add'?'Adding…':'Add domain'}</button>{domainState?.domain&&<button disabled={!configured||Boolean(busy)} onClick={verifyDomain} className="rounded-xl border border-emerald-300/20 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40">{busy==='domain-verify'?'Checking…':'Verify DNS'}</button>}</div>
      {Array.isArray(domainState?.verification)&&domainState.verification.length>0&&<div className="mt-3 space-y-2">{domainState.verification.map((item,index)=><div key={index} className="rounded-lg border border-amber-300/10 bg-amber-300/[.025] p-2 text-[10px] leading-4 text-zinc-500"><pre className="whitespace-pre-wrap">{JSON.stringify(item,null,2)}</pre></div>)}</div>}
    </div>
  </section>
}
