import {Rocket,ShieldCheck,AlertTriangle,ExternalLink} from 'lucide-react';
import {Link} from 'react-router-dom';
import {assessPublishReadiness} from '@/lib/website-studio/website-publish';

export default function WebsitePublishPreflight({project,qualityScore}){
  const readiness=assessPublishReadiness({
    name:project.name||'',
    slug:project.slug||'',
    html:project.html||'',
    css:project.css||'',
    pages:project.pages||[],
    qualityScore,
    appConfig:project.app_config||{},
    saved:Boolean(project.id),
  });
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-emerald-300"><Rocket className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Publish preflight</span></div><span className={`rounded-full border px-2.5 py-1 text-xs ${readiness.ready?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{readiness.score}% ready</span></div>
    <div className="mt-3 grid gap-2 md:grid-cols-2">{readiness.checks.map(check=><div key={check.id} className={`rounded-xl border p-3 ${check.ok?'border-emerald-300/10 bg-emerald-300/[.025]':'border-amber-300/10 bg-amber-300/[.025]'}`}><div className="flex items-center gap-2">{check.ok?<ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/>:<AlertTriangle className="h-3.5 w-3.5 text-amber-300"/>}<p className="text-xs font-medium text-white">{check.label}</p></div>{!check.ok&&<p className="mt-1 text-[10px] leading-4 text-zinc-600">{check.detail}</p>}</div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2"><Link to="/deployments" className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${readiness.ready?'border-emerald-300/20 bg-emerald-300/[.05] text-emerald-100':'pointer-events-none border-white/10 text-zinc-700'}`}><ExternalLink className="h-3.5 w-3.5"/>Open deployment targets</Link><p className="self-center text-[10px] text-zinc-600">Website Studio will add direct project publishing only when a project-packaging deployment adapter is connected.</p></div>
  </section>
}
