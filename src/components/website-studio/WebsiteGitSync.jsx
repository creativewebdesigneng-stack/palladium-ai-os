import {GitBranch, Github, ShieldCheck} from 'lucide-react';

export default function WebsiteGitSync({config,setConfig}){
  const safe={connected:false,provider:'github',repository:'',branch:'main',rootPath:'',...(config||{})};
  const update=(key,value)=>setConfig({...safe,[key]:value});
  const contractReady=Boolean(safe.repository.trim()&&safe.branch.trim());
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-zinc-300"><Github className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Git sync contract</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Configure where this Website Studio project should sync. This records intent only until the GitHub write adapter is explicitly connected and authorised.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="fieldbox"><span>Repository</span><input value={safe.repository} onChange={e=>update('repository',e.target.value)} placeholder="owner/repository"/></label>
      <label className="fieldbox"><span>Branch</span><input value={safe.branch} onChange={e=>update('branch',e.target.value)} placeholder="main"/></label>
      <label className="fieldbox"><span>Root path</span><input value={safe.rootPath} onChange={e=>update('rootPath',e.target.value)} placeholder="apps/site"/></label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${contractReady?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}><GitBranch className="h-3 w-3"/>{contractReady?'Sync target defined':'Sync target incomplete'}</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500"><ShieldCheck className="h-3 w-3"/>No Git write occurs from this screen yet</span>
    </div>
    <style>{`.fieldbox{display:block;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18);border-radius:.75rem;padding:.7rem}.fieldbox span{display:block;font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666}.fieldbox input{margin-top:.4rem;width:100%;background:transparent;font-size:.75rem;color:white;outline:none}`}</style>
  </section>
}
