import {useEffect,useState} from 'react';
import {Image as ImageIcon,Plus,Trash2,ExternalLink} from 'lucide-react';
import {deleteWebsiteStudioAsset,listWebsiteStudioAssets,saveWebsiteStudioAsset} from '@/lib/website-studio/website-studio.functions';

const blank={name:'',kind:'image',sourceUrl:'',altText:'',provenance:''};
export default function WebsiteAssetLibrary({projectId}){
  const [assets,setAssets]=useState([]),[form,setForm]=useState(blank),[error,setError]=useState('');
  const load=async()=>{if(!projectId)return setAssets([]);try{setAssets(await listWebsiteStudioAssets({data:{projectId}}))}catch(e){setError(e instanceof Error?e.message:'Could not load assets.')}};
  useEffect(()=>{void load()},[projectId]);
  const save=async()=>{if(!projectId||!form.name.trim()||!form.sourceUrl.trim())return;try{await saveWebsiteStudioAsset({data:{projectId,name:form.name,kind:form.kind,sourceUrl:form.sourceUrl,altText:form.altText||undefined,provenance:form.provenance||undefined}});setForm(blank);await load()}catch(e){setError(e instanceof Error?e.message:'Could not save asset.')}};
  const remove=async(id)=>{try{await deleteWebsiteStudioAsset({data:{id}});await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete asset.')}};
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-lime-300"><ImageIcon className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Asset library</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Register approved asset URLs with alt text and provenance. Direct file upload will be added only when Website Studio has a dedicated storage adapter.</p>
    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    {!projectId?<p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">Save the website project before adding assets.</p>:<>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Asset name" className="field"/><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="field"><option>image</option><option>video</option><option>font</option><option>document</option><option>other</option></select><input value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})} placeholder="https://asset-url…" className="field"/><input value={form.altText} onChange={e=>setForm({...form,altText:e.target.value})} placeholder="Alt text" className="field"/><button onClick={save} disabled={!form.name.trim()||!form.sourceUrl.trim()} className="flex items-center justify-center gap-2 rounded-xl border border-lime-300/20 bg-lime-300/[.06] px-3 py-2 text-xs text-lime-100 disabled:opacity-40"><Plus className="h-3.5 w-3.5"/>Add asset</button></div>
      <input value={form.provenance} onChange={e=>setForm({...form,provenance:e.target.value})} placeholder="Source / licence / provenance note" className="field mt-2 w-full"/>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{assets.map(asset=><div key={asset.id} className="flex items-start gap-3 rounded-xl border border-white/[.07] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{asset.name}</p><p className="mt-1 text-[10px] text-zinc-600">{asset.kind} · {asset.alt_text||'no alt text yet'}</p><p className="mt-1 truncate text-[10px] text-zinc-700">{asset.provenance||'provenance not recorded'}</p></div><a href={asset.source_url} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-600 hover:text-lime-300"><ExternalLink className="h-3.5 w-3.5"/></a><button onClick={()=>remove(asset.id)} className="p-1.5 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
    </>}
    <style>{`.field{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.6rem .7rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(190,242,100,.35)}.field option{background:#11131a}`}</style>
  </section>
}
