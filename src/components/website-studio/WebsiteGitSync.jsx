import {useEffect,useState} from 'react';
import {ExternalLink,GitBranch,Github,Loader2,ShieldCheck,UploadCloud} from 'lucide-react';
import {getWebsiteStudioGithubStatus,syncWebsiteStudioGithub} from '@/lib/website-studio/website-github.functions';

export default function WebsiteGitSync({config,setConfig,projectId}){
  const safe={connected:false,provider:'github',repository:'',branch:'main',rootPath:'',...(config||{})};
  const update=(key,value)=>setConfig({...safe,[key]:value});
  const contractReady=Boolean(safe.repository.trim()&&safe.branch.trim());
  const [status,setStatus]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);

  useEffect(()=>{
    let active=true;
    getWebsiteStudioGithubStatus({data:undefined})
      .then(value=>{if(active)setStatus(value)})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not read GitHub sync status.')});
    return()=>{active=false};
  },[]);

  const sync=async()=>{
    if(!projectId||!contractReady)return;
    setBusy(true);setError('');setResult(null);
    try{
      const value=await syncWebsiteStudioGithub({data:{
        projectId,
        gitConfig:{repository:safe.repository,branch:safe.branch,rootPath:safe.rootPath||''},
      }});
      setResult(value);
      setConfig(value.gitConfig);
    }catch(e){setError(e instanceof Error?e.message:'GitHub sync failed.')}
    finally{setBusy(false)}
  };

  const configured=Boolean(status?.configured);
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-zinc-300"><Github className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">GitHub project sync</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Atomically commit the last saved Website Studio package to one allowlisted GitHub repository and branch. Blackstar creates one Git tree, one commit and a non-forced ref update.</p></div>
      <span className={`rounded-full border px-2.5 py-1 text-[10px] ${configured?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{configured?'GitHub sync configured':'GitHub sync not configured'}</span>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="fieldbox"><span>Repository</span><input value={safe.repository} onChange={e=>update('repository',e.target.value)} placeholder="owner/repository"/></label>
      <label className="fieldbox"><span>Branch</span><input value={safe.branch} onChange={e=>update('branch',e.target.value)} placeholder="main"/></label>
      <label className="fieldbox"><span>Root path</span><input value={safe.rootPath} onChange={e=>update('rootPath',e.target.value)} placeholder="apps/site"/></label>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${contractReady?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}><GitBranch className="h-3 w-3"/>{contractReady?'Sync target defined':'Sync target incomplete'}</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500"><ShieldCheck className="h-3 w-3"/>Repository allowlist enforced server-side</span>
      <button disabled={!configured||!contractReady||!projectId||busy} onClick={sync} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white disabled:opacity-40">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<UploadCloud className="h-3.5 w-3.5"/>}{busy?'Syncing…':'Sync saved project'}</button>
    </div>

    {!projectId&&<p className="mt-3 text-[10px] text-amber-300">Save the Website Studio project before syncing it to GitHub.</p>}
    {!configured&&<p className="mt-3 text-[10px] leading-4 text-zinc-600">Configure WEBSITE_STUDIO_GITHUB_TOKEN plus WEBSITE_STUDIO_GITHUB_ALLOWED_REPOSITORIES server-side. A fine-grained token should have Contents write access only to the intended repository.</p>}
    {error&&<p className="mt-3 rounded-lg border border-rose-300/15 bg-rose-300/[.03] p-2.5 text-xs text-rose-200">{error}</p>}
    {result&&<div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.03] p-3"><p className="text-xs text-emerald-100">Synced {result.fileCount} files to {result.repository} · {result.branch}</p><p className="mt-1 font-mono text-[10px] text-zinc-600">{result.commitSha}</p><a href={result.commitUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300"><ExternalLink className="h-3 w-3"/>Open GitHub commit</a></div>}

    <style>{`.fieldbox{display:block;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18);border-radius:.75rem;padding:.7rem}.fieldbox span{display:block;font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666}.fieldbox input{margin-top:.4rem;width:100%;background:transparent;font-size:.75rem;color:white;outline:none}`}</style>
  </section>
}
