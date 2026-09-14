import {useMemo,useState} from 'react';
import {Bug,Copy,Check,Database,ShieldAlert,Sparkles} from 'lucide-react';
import {buildWebsiteRepairPrompt,diagnoseWebsiteProject} from '@/lib/website-studio/website-diagnostics';
import {compileWebsiteBackendSql} from '@/lib/website-studio/website-backend';

export default function WebsiteDeveloperTools({project,busy,onRepair}){
  const [copied,setCopied]=useState(false);
  const diagnostics=useMemo(()=>diagnoseWebsiteProject(project.html||'',project.css||'',project.javascript||''),[project.html,project.css,project.javascript]);
  const backend=useMemo(()=>compileWebsiteBackendSql(project.app_config||{}),[project.app_config]);
  const copySql=async()=>{if(!backend.sql)return;await navigator.clipboard.writeText(backend.sql);setCopied(true);setTimeout(()=>setCopied(false),1200)};
  const errors=diagnostics.filter(d=>d.severity==='error').length;
  const warnings=diagnostics.filter(d=>d.severity==='warning').length;

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-rose-300"><Bug className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">AI debug & backend tools</span></div><p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Run deterministic diagnostics first, then ask Blackstar's governed model gateway to repair the project. Backend SQL is a reviewable draft only and is never auto-applied from this panel.</p></div>
      <button disabled={busy||diagnostics.length===0} onClick={()=>onRepair(buildWebsiteRepairPrompt(diagnostics))} className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[.05] px-3 py-2 text-xs text-rose-100 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5"/>Fix diagnostics with AI</button>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-white/[.07] bg-black/20 p-3">
        <div className="flex items-center justify-between"><p className="text-xs font-medium text-white">Project diagnostics</p><span className="text-[10px] text-zinc-600">{errors} errors · {warnings} warnings</span></div>
        <div className="mt-3 space-y-2">{diagnostics.length===0?<div className="rounded-lg border border-emerald-300/10 bg-emerald-300/[.025] p-3 text-xs text-emerald-200">No deterministic code diagnostics found.</div>:diagnostics.map(item=><div key={item.id} className={`rounded-lg border p-3 ${item.severity==='error'?'border-rose-300/15 bg-rose-300/[.03]':item.severity==='warning'?'border-amber-300/15 bg-amber-300/[.03]':'border-blue-300/15 bg-blue-300/[.03]'}`}><p className="text-xs font-medium text-white">{item.message}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{item.fixPrompt}</p></div>)}</div>
      </div>

      <div className="rounded-xl border border-white/[.07] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-cyan-300"/><p className="text-xs font-medium text-white">Backend migration draft</p></div><button disabled={!backend.sql} onClick={copySql} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 disabled:opacity-30">{copied?<Check className="h-3 w-3"/>:<Copy className="h-3 w-3"/>}{copied?'Copied':'Copy SQL'}</button></div>
        {backend.warnings.length>0&&<div className="mt-3 space-y-2">{backend.warnings.map((warning,index)=><div key={index} className="flex gap-2 rounded-lg border border-amber-300/10 bg-amber-300/[.025] p-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"/><p className="text-[10px] leading-4 text-zinc-600">{warning}</p></div>)}</div>}
        {backend.sql?<pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-white/[.07] bg-black/40 p-3 text-[10px] leading-4 text-zinc-400">{backend.sql}</pre>:<p className="mt-3 text-xs text-zinc-600">Add data collections in the full-stack scaffold to generate an owner-scoped migration draft.</p>}
      </div>
    </div>
  </section>
}
