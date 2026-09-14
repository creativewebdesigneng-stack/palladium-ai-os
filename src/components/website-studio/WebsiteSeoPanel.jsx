import {Search,Globe2,ShieldCheck} from 'lucide-react';
import {assessWebsiteSeo,buildWebsiteRobots,buildWebsiteSitemap} from '@/lib/website-studio/website-seo';

export default function WebsiteSeoPanel({brief,pages,setBrief}){
  const seo={title:'',description:'',canonicalBaseUrl:'',indexable:true,ogImage:'',...(brief?.seo||{})};
  const update=(key,value)=>setBrief({...brief,seo:{...seo,[key]:value}});
  const assessment=assessWebsiteSeo(seo,pages||[]);
  const sitemap=buildWebsiteSitemap(seo,pages||[]);
  const robots=buildWebsiteRobots(seo);

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sky-300"><Search className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">SEO & discoverability</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Configure search metadata and indexing explicitly. Website Studio generates sitemap/robots content only when a valid canonical base URL is supplied.</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${assessment.score>=75?'border-emerald-300/20 text-emerald-300':'border-amber-300/20 text-amber-300'}`}>{assessment.score}/100</span></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Site title"><input value={seo.title} onChange={e=>update('title',e.target.value)} placeholder="Company — primary value proposition"/></Field><Field label="Canonical base URL"><input value={seo.canonicalBaseUrl} onChange={e=>update('canonicalBaseUrl',e.target.value)} placeholder="https://example.com"/></Field><Field label="Meta description"><textarea rows={3} value={seo.description} onChange={e=>update('description',e.target.value)} placeholder="Describe the site clearly for search results."/></Field><Field label="Open Graph image URL"><input value={seo.ogImage} onChange={e=>update('ogImage',e.target.value)} placeholder="https://…"/></Field></div>
    <label className="mt-3 flex items-center gap-2 rounded-xl border border-white/[.07] p-3 text-xs text-zinc-400"><input type="checkbox" checked={seo.indexable!==false} onChange={e=>update('indexable',e.target.checked)}/><ShieldCheck className="h-3.5 w-3.5 text-sky-300"/>Allow search-engine indexing when published</label>
    <div className="mt-3 grid gap-2 md:grid-cols-2">{assessment.checks.map(check=><div key={check.id} className={`rounded-lg border p-2.5 ${check.ok?'border-emerald-300/10 bg-emerald-300/[.02]':'border-amber-300/10 bg-amber-300/[.02]'}`}><p className="text-[10px] text-zinc-400">{check.ok?'✓ ':''}{check.id}</p>{!check.ok&&<p className="mt-1 text-[10px] leading-4 text-zinc-600">{check.detail}</p>}</div>)}</div>
    {(sitemap||robots)&&<details className="mt-3 rounded-xl border border-white/[.07] p-3"><summary className="cursor-pointer text-xs text-zinc-400"><span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5"/>Generated crawl files</span></summary><div className="mt-3 grid gap-3 md:grid-cols-2"><pre className="overflow-auto rounded-lg bg-black/30 p-3 text-[10px] text-zinc-500">{robots}</pre><pre className="overflow-auto rounded-lg bg-black/30 p-3 text-[10px] text-zinc-500">{sitemap||'Add a canonical URL to generate sitemap.xml'}</pre></div></details>}
    <style>{`.seo-field{display:block;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18);border-radius:.75rem;padding:.75rem}.seo-field span{display:block;font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666}.seo-field input,.seo-field textarea{margin-top:.45rem;width:100%;resize:vertical;background:transparent;font-size:.75rem;line-height:1.4;color:white;outline:none}`}</style>
  </section>
}
function Field({label,children}){return <label className="seo-field"><span>{label}</span>{children}</label>}
