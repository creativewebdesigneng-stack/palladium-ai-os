import {useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {ArrowRight,BookmarkPlus,ExternalLink,Loader2,Radar,RefreshCw,TestTube2,Trophy} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {listRetailWorkspaces,saveRetailCatalogItem} from '@/lib/retail/retail-operations.functions';
import {listDropshippingOpportunities,saveDropshippingOpportunity,updateDropshippingOpportunityStatus} from '@/lib/dropshipping/dropshipping-opportunities.functions';
import {calculateWatchlistScore,watchlistBand} from '@/lib/dropshipping/dropshipping-opportunities';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const fresh=()=>({title:'',kind:'product',workspace_id:'',niche:'',market:'United Kingdom',channel:'shopify',demand_score:70,search_momentum:70,competition_score:50,margin_score:65,supplier_score:65,compliance_risk:10,evidence_url:'',notes:''});

export default function DropshippingOpportunityWatchlist(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const listFn=useServerFn(listDropshippingOpportunities);
  const saveFn=useServerFn(saveDropshippingOpportunity);
  const statusFn=useServerFn(updateDropshippingOpportunityStatus);
  const workspacesFn=useServerFn(listRetailWorkspaces);
  const catalogFn=useServerFn(saveRetailCatalogItem);
  const [draft,setDraft]=useState(fresh);

  const opportunities=useQuery({queryKey:['dropshipping-opportunities'],queryFn:()=>listFn(),enabled:session.ready,retry:false});
  const workspaces=useQuery({queryKey:['retail-workspaces'],queryFn:()=>workspacesFn(),enabled:session.ready,retry:false});
  const score=useMemo(()=>calculateWatchlistScore({demand:draft.demand_score,searchMomentum:draft.search_momentum,competition:draft.competition_score,margin:draft.margin_score,supplier:draft.supplier_score,complianceRisk:draft.compliance_risk}),[draft]);

  const save=useMutation({mutationFn:()=>saveFn({data:{workspace_id:draft.workspace_id||null,kind:draft.kind,title:draft.title,niche:draft.niche||null,market:draft.market||null,channel:draft.channel||null,demand_score:Number(draft.demand_score),search_momentum:Number(draft.search_momentum),competition_score:Number(draft.competition_score),margin_score:Number(draft.margin_score),supplier_score:Number(draft.supplier_score),compliance_risk:Number(draft.compliance_risk),evidence_urls:draft.evidence_url?[draft.evidence_url]:[],notes:draft.notes||null}}),onSuccess:()=>{setDraft(fresh());qc.invalidateQueries({queryKey:['dropshipping-opportunities']});toast({title:'Opportunity saved',description:'The product or keyword is now on your persistent Dropshipping watchlist.'});},onError:error=>toast({variant:'destructive',title:'Could not save opportunity',description:friendlyMessage(error)})});
  const setStatus=useMutation({mutationFn:({id,status})=>statusFn({data:{id,status}}),onSuccess:()=>qc.invalidateQueries({queryKey:['dropshipping-opportunities']}),onError:error=>toast({variant:'destructive',title:'Could not update status',description:friendlyMessage(error)})});

  const promote=async(row)=>{
    if(!row.workspace_id){toast({variant:'destructive',title:'Choose a workspace first',description:'Assign this opportunity to a Retail workspace before promoting it into the Product Pipeline.'});return;}
    try{
      await catalogFn({data:{workspace_id:row.workspace_id,name:row.title,item_type:'product',category:row.niche||'Dropshipping opportunity',description:row.notes||'Promoted from the Dropshipping Opportunity Watchlist.',currency:'GBP',track_inventory:true,metadata:{source:'dropshipping-hub',businessModel:'dropshipping',pipeline_stage:'testing',opportunity_id:row.id,opportunity_score:row.opportunity_score,market:row.market,channel:row.channel,evidence_urls:row.evidence_urls}}});
      await statusFn({data:{id:row.id,status:'testing'}});
      qc.invalidateQueries({queryKey:['dropshipping-opportunities']});
      toast({title:'Promoted to Product Pipeline',description:'A dropshipping catalog candidate was created for testing.'});
      navigate('/dropshipping-hub');
    }catch(error){toast({variant:'destructive',title:'Could not promote opportunity',description:friendlyMessage(error)});}
  };

  const rows=opportunities.data??[];
  return <section className={panel}>
    <div className="flex flex-wrap items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/10"><Radar className="h-4 w-4 text-sky-300"/></span><div><h2 className="text-sm font-semibold text-white">Opportunity Watchlist</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Persist product and keyword candidates after live research, compare evidence-backed signals over time, then promote validated winners into the Product Pipeline. Scores are decision support—not claims of guaranteed sales.</p></div><button onClick={()=>opportunities.refetch()} className="ml-auto rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><RefreshCw className="mr-1 inline h-3 w-3"/>Refresh</button></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input className={control} placeholder="Product / keyword" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
      <input className={control} placeholder="Niche" value={draft.niche} onChange={e=>setDraft({...draft,niche:e.target.value})}/>
      <input className={control} placeholder="Market" value={draft.market} onChange={e=>setDraft({...draft,market:e.target.value})}/>
      <select className={control} value={draft.workspace_id} onChange={e=>setDraft({...draft,workspace_id:e.target.value})}><option value="">No workspace yet</option>{(workspaces.data??[]).map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select>
      <select className={control} value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}><option value="product">Product</option><option value="keyword">Keyword</option></select>
      <select className={control} value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value})}>{['shopify','amazon','ebay','etsy','woocommerce','tiktok-shop','walmart','blackstar-site'].map(v=><option key={v} value={v}>{v}</option>)}</select>
      <input className={control} placeholder="Evidence URL" value={draft.evidence_url} onChange={e=>setDraft({...draft,evidence_url:e.target.value})}/>
      <div className="rounded-xl border border-sky-400/20 bg-sky-500/[.05] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-sky-300">Watch score</p><p className="text-lg font-semibold text-white">{score}<span className="ml-1 text-[10px] text-zinc-500">· {watchlistBand(score)}</span></p></div>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{[['demand_score','Demand'],['search_momentum','Search'],['competition_score','Competition'],['margin_score','Margin'],['supplier_score','Supplier'],['compliance_risk','Compliance risk']].map(([key,label])=><label key={key}><span className="mb-1 block text-[9px] text-zinc-500">{label}</span><input type="number" min="0" max="100" className={control} value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)||0})}/></label>)}</div>
    <textarea className={`${control} mt-3 min-h-20`} placeholder="Evidence notes, supplier observations, customer pain point, seasonality…" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/>
    <div className="mt-3 flex flex-wrap gap-2"><button disabled={!draft.title.trim()||save.isPending} onClick={()=>save.mutate()} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{save.isPending?<Loader2 className="mr-1 inline h-3 w-3 animate-spin"/>:<BookmarkPlus className="mr-1 inline h-3 w-3"/>}Save to watchlist</button><button onClick={()=>navigate('/research')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Research <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>
    <div className="mt-5 grid gap-3 lg:grid-cols-2">{rows.map(row=><article key={row.id} className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-start gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{row.title}</p><p className="mt-1 text-[10px] text-zinc-600">{row.kind} · {row.market||'market unset'} · {row.channel||'channel unset'}</p></div><span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-wide text-zinc-300">{row.status}</span></div><div className="mt-3 flex items-end gap-3"><div><p className="text-[9px] uppercase tracking-wide text-zinc-600">Score</p><p className="text-2xl font-semibold text-white">{Number(row.opportunity_score??0).toFixed(1)}</p></div><p className="pb-1 text-[10px] text-zinc-500">{watchlistBand(Number(row.opportunity_score??0))}</p></div>{row.notes&&<p className="mt-2 line-clamp-3 text-[10px] leading-4 text-zinc-500">{row.notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>setStatus.mutate({id:row.id,status:'testing'})} className="rounded-lg border border-violet-400/20 px-2 py-1.5 text-[10px] text-violet-200"><TestTube2 className="mr-1 inline h-3 w-3"/>Testing</button><button onClick={()=>setStatus.mutate({id:row.id,status:'winner'})} className="rounded-lg border border-emerald-400/20 px-2 py-1.5 text-[10px] text-emerald-200"><Trophy className="mr-1 inline h-3 w-3"/>Winner</button><button onClick={()=>promote(row)} className="rounded-lg border border-sky-400/20 px-2 py-1.5 text-[10px] text-sky-200">Promote <ArrowRight className="ml-1 inline h-3 w-3"/></button></div></article>)}</div>
    {!opportunities.isLoading&&!rows.length&&<div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">No saved opportunities yet. Run live product/SEO research above, then save evidence-backed candidates here.</div>}
  </section>;
}