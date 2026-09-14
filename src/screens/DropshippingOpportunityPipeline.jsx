import {useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Archive,BarChart3,BookOpenCheck,ExternalLink,FileSearch,Loader2,PackagePlus,Plus,RefreshCw,Store,Truck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {runResearch} from '@/lib/ai/research.functions';
import {listRetailWorkspaces,saveRetailCatalogItem,saveRetailSupplier,saveRetailWorkspace} from '@/lib/retail/retail-operations.functions';
import {addDropshippingSignal,captureDropshippingSnapshot,linkDropshippingPromotion,linkDropshippingRetailSupplier,listDropshippingOperations,saveDropshippingOpportunity,saveDropshippingResearchOpportunity,saveDropshippingSupplierOffer} from '@/lib/dropshipping/dropshipping-operations.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const button='rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.04] disabled:opacity-40';
const primary='rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40';
const toNumber=(value)=>value===''?null:Number(value);
const toSources=(sources)=>Array.isArray(sources)?sources.map(source=>({url:String(source?.url||''),title:source?.title?String(source.title):null,snippet:source?.snippet?String(source.snippet):null})).filter(source=>/^https?:\/\//i.test(source.url)).slice(0,25):[];

export default function DropshippingOpportunityPipeline(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const operationsFn=useServerFn(listDropshippingOperations);
  const researchFn=useServerFn(runResearch);
  const saveResearchFn=useServerFn(saveDropshippingResearchOpportunity);
  const saveOpportunityFn=useServerFn(saveDropshippingOpportunity);
  const signalFn=useServerFn(addDropshippingSignal);
  const offerFn=useServerFn(saveDropshippingSupplierOffer);
  const snapshotFn=useServerFn(captureDropshippingSnapshot);
  const linkPromotionFn=useServerFn(linkDropshippingPromotion);
  const linkSupplierFn=useServerFn(linkDropshippingRetailSupplier);
  const retailListFn=useServerFn(listRetailWorkspaces);
  const retailWorkspaceFn=useServerFn(saveRetailWorkspace);
  const retailCatalogFn=useServerFn(saveRetailCatalogItem);
  const retailSupplierFn=useServerFn(saveRetailSupplier);

  const [selectedId,setSelectedId]=useState('');
  const [research,setResearch]=useState({niche:'',market:'United Kingdom',mode:'products'});
  const [manual,setManual]=useState({name:'',niche:'',market:'United Kingdom'});
  const [signal,setSignal]=useState({signalType:'search',sourceProvider:'',sourceRef:'',metricName:'',metricValue:'',confidence:'observed'});
  const [offer,setOffer]=useState({provider:'',supplierLabel:'',supplierSku:'',sourceRef:'',role:'candidate',currency:'GBP',unitCost:'',shippingCost:'',estimatedDeliveryDays:'',supplierScore:''});
  const [snapshot,setSnapshot]=useState({score:'',band:''});
  const [retailWorkspaceId,setRetailWorkspaceId]=useState('');

  const operations=useQuery({queryKey:['dropshipping-operations'],queryFn:()=>operationsFn({data:undefined}),enabled:session==='yes',retry:false});
  const retail=useQuery({queryKey:['retail-workspaces-for-dropshipping'],queryFn:()=>retailListFn({data:undefined}),enabled:session==='yes',retry:false});
  const opportunities=operations.data?.opportunities??[];
  const selected=useMemo(()=>opportunities.find(row=>row.id===selectedId)??opportunities[0]??null,[opportunities,selectedId]);
  const selectedSignals=(operations.data?.signals??[]).filter(row=>row.opportunity_id===selected?.id);
  const selectedOffers=(operations.data?.suppliers??[]).filter(row=>row.opportunity_id===selected?.id);
  const selectedSnapshots=(operations.data?.snapshots??[]).filter(row=>row.opportunity_id===selected?.id);
  const evidenceClasses=new Set(selectedSignals.map(row=>row.signal_type).filter(type=>['search','marketplace','supplier'].includes(type)));
  const derivedEvidenceStatus=evidenceClasses.size>=2?'ready':selectedSignals.length?'partial':'none';
  const latestSnapshot=selectedSnapshots[0];
  const previousSnapshot=selectedSnapshots[1];
  const scoreDelta=latestSnapshot?.opportunity_score!=null&&previousSnapshot?.opportunity_score!=null?Number(latestSnapshot.opportunity_score)-Number(previousSnapshot.opportunity_score):null;
  const retailRows=retail.data??[];
  const activeRetailWorkspace=retailWorkspaceId||selected?.retail_workspace_id||retailRows[0]?.id||'';

  const invalidate=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['dropshipping-operations']}),qc.invalidateQueries({queryKey:['retail-workspaces-for-dropshipping']})]);};

  const researchAndSave=useMutation({
    mutationFn:async()=>{
      const niche=research.niche.trim();
      const market=research.market.trim()||'global market';
      const query=research.mode==='seo'
        ?`Dropshipping SEO research for ${niche} in ${market}. Use current public web evidence to identify rising buyer-intent searches, long-tail opportunities, seasonality and saturation. Separate observed evidence from inference and never invent search volume. Prioritise a practical test plan.`
        :`Dropshipping product research for ${niche} in ${market}. Use current public web evidence to identify rising or top-selling product themes, demand signals, saturation, price positioning, delivery/returns risk, supplier considerations and marketplace-policy risk. Separate observed evidence from inference and never invent sales volume. Rank practical tests.`;
      const result=await researchFn({data:{query:query.slice(0,600)}});
      return saveResearchFn({data:{name:`${niche} · ${market}`,niche,targetMarket:market,mode:research.mode,provider:result.provider??null,model:result.model??null,report:result.report??'',sources:toSources(result.sources)}});
    },
    onSuccess:async(row)=>{setSelectedId(row.id);await invalidate();toast({title:'Research saved to opportunity pipeline',description:'The report and source URLs are now persistent evidence, not a temporary result.'});},
    onError:error=>toast({variant:'destructive',title:'Could not save live research',description:friendlyMessage(error)}),
  });

  const createManual=useMutation({
    mutationFn:()=>saveOpportunityFn({data:{name:manual.name,niche:manual.niche||null,targetMarket:manual.market||null,status:'watching',channels:[],scoreInputs:{},economics:{},complianceStatus:'unknown',evidenceStatus:'none'}}),
    onSuccess:async(row)=>{setManual({name:'',niche:'',market:manual.market});setSelectedId(row.id);await invalidate();toast({title:'Opportunity added'});},
    onError:error=>toast({variant:'destructive',title:'Could not add opportunity',description:friendlyMessage(error)}),
  });

  const changeStatus=async(nextStatus)=>{
    if(!selected)return;
    try{
      const row=await saveOpportunityFn({data:{id:selected.id,commerceWorkspaceId:selected.commerce_workspace_id,retailWorkspaceId:selected.retail_workspace_id,websiteProjectId:selected.website_project_id,name:selected.name,niche:selected.niche,targetMarket:selected.target_market,status:nextStatus,channels:selected.channels??[],opportunityScore:selected.opportunity_score,scoreBand:selected.score_band,scoreInputs:selected.score_inputs??{},economics:selected.economics??{},complianceStatus:selected.compliance_status??'unknown',evidenceStatus:selected.evidence_status??'none',researchSummary:selected.research_summary,notes:selected.notes}});
      await invalidate();toast({title:'Opportunity stage updated',description:`${row.name} → ${nextStatus}`});
    }catch(error){toast({variant:'destructive',title:'Could not update stage',description:friendlyMessage(error)});}
  };

  const addSignal=useMutation({
    mutationFn:()=>signalFn({data:{opportunityId:selected.id,signalType:signal.signalType,sourceProvider:signal.sourceProvider||null,sourceRef:signal.sourceRef||null,metricName:signal.metricName||null,metricValue:toNumber(signal.metricValue),confidence:signal.confidence,payload:{enteredFrom:'dropshipping-opportunity-pipeline'}}}),
    onSuccess:async()=>{setSignal(v=>({...v,sourceRef:'',metricName:'',metricValue:''}));await invalidate();toast({title:'Evidence signal saved'});},
    onError:error=>toast({variant:'destructive',title:'Could not save evidence',description:friendlyMessage(error)}),
  });

  const addOffer=useMutation({
    mutationFn:()=>offerFn({data:{opportunityId:selected.id,provider:offer.provider||null,supplierLabel:offer.supplierLabel,supplierSku:offer.supplierSku||null,sourceRef:offer.sourceRef||null,role:offer.role,currency:offer.currency,unitCost:toNumber(offer.unitCost),shippingCost:toNumber(offer.shippingCost),estimatedDeliveryDays:toNumber(offer.estimatedDeliveryDays),supplierScore:toNumber(offer.supplierScore),scoreInputs:{},evidence:{enteredFrom:'dropshipping-opportunity-pipeline'}}}),
    onSuccess:async()=>{setOffer(v=>({...v,supplierLabel:'',supplierSku:'',sourceRef:'',unitCost:'',shippingCost:'',estimatedDeliveryDays:'',supplierScore:''}));await invalidate();toast({title:'Supplier offer saved'});},
    onError:error=>toast({variant:'destructive',title:'Could not save supplier offer',description:friendlyMessage(error)}),
  });

  const capture=useMutation({
    mutationFn:()=>snapshotFn({data:{opportunityId:selected.id,opportunityScore:toNumber(snapshot.score),scoreBand:snapshot.band||null,scoreInputs:{source:'operator-review'},economics:selected.economics??{},supplierSummary:{offers:selectedOffers.length,primary:selectedOffers.find(row=>row.role==='primary')?.supplier_label??null},evidenceStatus:derivedEvidenceStatus}}),
    onSuccess:async()=>{await invalidate();toast({title:'Opportunity snapshot captured',description:'Trend history now has another point for heating/cooling comparisons.'});},
    onError:error=>toast({variant:'destructive',title:'Could not capture snapshot',description:friendlyMessage(error)}),
  });

  const createRetailWorkspace=useMutation({
    mutationFn:()=>retailWorkspaceFn({data:{business_name:`${selected?.niche||'Dropshipping'} Operations`,business_type:'ecommerce',currency:'GBP',timezone:'Europe/London',notes:'Created from Dropshipping Hub for supplier, catalogue and order operations.',ai_preferences:{source:'dropshipping-hub'}}}),
    onSuccess:async(row)=>{setRetailWorkspaceId(row.id);await invalidate();toast({title:'Retail operations workspace created'});},
    onError:error=>toast({variant:'destructive',title:'Could not create Retail workspace',description:friendlyMessage(error)}),
  });

  const promote=useMutation({
    mutationFn:async()=>{
      const workspace=retailRows.find(row=>row.id===activeRetailWorkspace);
      if(!workspace)throw new Error('Create or select a Retail ecommerce workspace first.');
      if(selected.compliance_status==='blocked')throw new Error('Blocked opportunities cannot be promoted until compliance is resolved.');
      const item=await retailCatalogFn({data:{workspace_id:workspace.id,name:selected.name,item_type:'product',category:selected.niche||undefined,description:(selected.research_summary||selected.notes||'').slice(0,5000)||undefined,cost_price:0,sale_price:0,currency:workspace.currency||'GBP',tax_rate:0,track_inventory:false,reorder_point:0,reorder_quantity:0,active:true,metadata:{source:'dropshipping-hub',opportunityId:selected.id,evidenceStatus:derivedEvidenceStatus,complianceStatus:selected.compliance_status}}});
      await linkPromotionFn({data:{opportunityId:selected.id,retailWorkspaceId:workspace.id,promotedCatalogItemId:item.id}});
      return item;
    },
    onSuccess:async(item)=>{await invalidate();toast({title:'Promoted to Retail catalogue',description:`${item.name} is now an internal catalogue item. This did not publish it to any marketplace.`});},
    onError:error=>toast({variant:'destructive',title:'Could not promote opportunity',description:friendlyMessage(error)}),
  });

  const promoteSupplier=async(row)=>{
    try{
      const workspace=retailRows.find(item=>item.id===activeRetailWorkspace);
      if(!workspace)throw new Error('Create or select a Retail ecommerce workspace first.');
      const website=/^https?:\/\//i.test(row.source_ref||'')&&String(row.source_ref).length<=500?row.source_ref:undefined;
      const supplier=await retailSupplierFn({data:{workspace_id:workspace.id,name:row.supplier_label,website,lead_time_days:row.estimated_delivery_days??0,minimum_order_amount:0,currency:row.currency||workspace.currency||'GBP',status:'active',notes:`Promoted from Dropshipping Hub opportunity ${selected.name}. Provider: ${row.provider||'not specified'}.`}});
      await linkSupplierFn({data:{offerId:row.id,retailSupplierId:supplier.id}});
      await invalidate();toast({title:'Supplier added to Retail master',description:'The opportunity offer now points to the shared supplier record.'});
    }catch(error){toast({variant:'destructive',title:'Could not promote supplier',description:friendlyMessage(error)});}
  };

  if(session==='no')return null;
  return <div className="mt-5 space-y-5">
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10"><BookOpenCheck className="h-4 w-4 text-violet-300"/></span><div><h2 className="text-sm font-semibold text-white">Persistent opportunity pipeline</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Turn cited research into a durable watchlist. Blackstar stores source provenance, supplier offers and score history; Retail remains authoritative for real suppliers, products and orders.</p></div></div><button onClick={()=>operations.refetch()} className={button}><RefreshCw className="mr-1 inline h-3 w-3"/>Refresh</button></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-violet-400/15 bg-violet-500/[.03] p-4"><p className="text-xs font-medium text-white">Research & save</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Niche / product space"><input className={control} value={research.niche} onChange={e=>setResearch({...research,niche:e.target.value})} placeholder="compact travel accessories"/></Field><Field label="Target market"><input className={control} value={research.market} onChange={e=>setResearch({...research,market:e.target.value})}/></Field></div><div className="mt-2 flex gap-2"><select className={control} value={research.mode} onChange={e=>setResearch({...research,mode:e.target.value})}><option value="products">Product opportunity research</option><option value="seo">SEO/search research</option></select><button disabled={research.niche.trim().length<2||researchAndSave.isPending} onClick={()=>researchAndSave.mutate()} className={primary}>{researchAndSave.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<><FileSearch className="mr-1 inline h-3.5 w-3.5"/>Research & save</>}</button></div></div>
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="text-xs font-medium text-white">Add manually</p><div className="mt-3 grid gap-2"><Field label="Opportunity name"><input className={control} value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})}/></Field><div className="grid grid-cols-2 gap-2"><Field label="Niche"><input className={control} value={manual.niche} onChange={e=>setManual({...manual,niche:e.target.value})}/></Field><Field label="Market"><input className={control} value={manual.market} onChange={e=>setManual({...manual,market:e.target.value})}/></Field></div><button disabled={!manual.name.trim()||createManual.isPending} onClick={()=>createManual.mutate()} className={button}><Plus className="mr-1 inline h-3 w-3"/>Add to watchlist</button></div></div>
      </div>
      {operations.error&&<p className="mt-3 text-xs text-rose-300">{friendlyMessage(operations.error)}</p>}
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{opportunities.length?opportunities.map(row=>{const signals=(operations.data?.signals??[]).filter(item=>item.opportunity_id===row.id).length;const offers=(operations.data?.suppliers??[]).filter(item=>item.opportunity_id===row.id).length;return <button key={row.id} onClick={()=>setSelectedId(row.id)} className={`rounded-xl border p-3 text-left ${selected?.id===row.id?'border-violet-400/30 bg-violet-500/[.06]':'border-white/[.08] bg-black/20'}`}><div className="flex items-center gap-2"><p className="line-clamp-1 text-xs font-medium text-white">{row.name}</p><span className="ml-auto rounded-full border border-white/10 px-2 py-.5 text-[9px] text-zinc-500">{row.status}</span></div><p className="mt-1 text-[10px] text-zinc-500">{row.niche||'No niche'} · {row.target_market||'No market'}</p><p className="mt-2 text-[10px] text-zinc-600">{signals} evidence · {offers} supplier offers · {row.opportunity_score??'—'}/100</p></button>}):<p className="col-span-full rounded-xl border border-dashed border-white/10 p-5 text-xs text-zinc-500">No saved opportunities yet. Use live research or add one manually.</p>}</div>
    </section>

    {selected&&<>
      <section className={panel}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.16em] text-violet-300">Selected opportunity</p><h2 className="mt-1 text-lg font-semibold text-white">{selected.name}</h2><p className="mt-1 text-xs text-zinc-500">{selected.niche||'Uncategorised'} · {selected.target_market||'market not set'} · evidence {derivedEvidenceStatus}</p></div><div className="flex flex-wrap gap-2"><select className="rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white" value={selected.status} onChange={e=>changeStatus(e.target.value)}>{['watching','validating','test','shortlisted','approved','rejected','launched','archived'].map(value=><option key={value}>{value}</option>)}</select>{selected.research_summary&&<button onClick={()=>navigate('/research')} className={button}>Research workspace <ExternalLink className="ml-1 inline h-3 w-3"/></button>}</div></div>{selected.research_summary&&<p className="mt-4 line-clamp-4 whitespace-pre-wrap text-[11px] leading-5 text-zinc-500">{selected.research_summary}</p>}</section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={panel}><Header icon={BarChart3} title="Evidence & trend history" desc="Only observed evidence should be stored as observed. Two independent evidence classes are required before this panel marks evidence ready."/><div className="mt-4 grid gap-2 sm:grid-cols-2"><select className={control} value={signal.signalType} onChange={e=>setSignal({...signal,signalType:e.target.value})}>{['search','marketplace','supplier','research','social','competitor','price','fulfilment'].map(value=><option key={value}>{value}</option>)}</select><select className={control} value={signal.confidence} onChange={e=>setSignal({...signal,confidence:e.target.value})}>{['observed','high','medium','low','inferred'].map(value=><option key={value}>{value}</option>)}</select><input className={control} placeholder="Provider / source" value={signal.sourceProvider} onChange={e=>setSignal({...signal,sourceProvider:e.target.value})}/><input className={control} placeholder="Source URL / safe reference" value={signal.sourceRef} onChange={e=>setSignal({...signal,sourceRef:e.target.value})}/><input className={control} placeholder="Metric name" value={signal.metricName} onChange={e=>setSignal({...signal,metricName:e.target.value})}/><input className={control} type="number" placeholder="Metric value (optional)" value={signal.metricValue} onChange={e=>setSignal({...signal,metricValue:e.target.value})}/></div><button disabled={addSignal.isPending} onClick={()=>addSignal.mutate()} className={`${button} mt-2`}>Save evidence signal</button><div className="mt-4 rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex justify-between text-xs"><span className="text-zinc-400">Evidence readiness</span><span className={derivedEvidenceStatus==='ready'?'text-emerald-300':'text-amber-300'}>{derivedEvidenceStatus} · {evidenceClasses.size}/3 core classes</span></div><div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><input className={control} type="number" min="0" max="100" placeholder="Score 0-100" value={snapshot.score} onChange={e=>setSnapshot({...snapshot,score:e.target.value})}/><input className={control} placeholder="Band / label" value={snapshot.band} onChange={e=>setSnapshot({...snapshot,band:e.target.value})}/><button disabled={capture.isPending} onClick={()=>capture.mutate()} className={button}>Snapshot</button></div>{scoreDelta!=null&&<p className={`mt-2 text-[10px] ${scoreDelta>0?'text-emerald-300':scoreDelta<0?'text-rose-300':'text-zinc-500'}`}>Latest score movement: {scoreDelta>0?'+':''}{scoreDelta} points since previous snapshot.</p>}</div><div className="mt-3 max-h-52 space-y-2 overflow-auto">{selectedSignals.slice(0,20).map(row=><div key={row.id} className="rounded-lg border border-white/[.07] p-2"><div className="flex gap-2 text-[10px]"><span className="text-white">{row.signal_type}</span><span className="text-zinc-600">{row.source_provider||'manual'}</span><span className="ml-auto text-zinc-600">{row.confidence}</span></div>{row.source_ref&&/^https?:\/\//i.test(row.source_ref)&&<a className="mt-1 block truncate text-[9px] text-violet-300" href={row.source_ref} target="_blank" rel="noreferrer">{row.source_ref}</a>}</div>)}</div></section>

        <section className={panel}><Header icon={Truck} title="Supplier offers & backup sourcing" desc="Track opportunity-specific offers here. Promote proven suppliers into Retail instead of duplicating the supplier master."/><div className="mt-4 grid gap-2 sm:grid-cols-2"><input className={control} placeholder="Supplier / offer name" value={offer.supplierLabel} onChange={e=>setOffer({...offer,supplierLabel:e.target.value})}/><input className={control} placeholder="Provider" value={offer.provider} onChange={e=>setOffer({...offer,provider:e.target.value})}/><input className={control} placeholder="Supplier SKU" value={offer.supplierSku} onChange={e=>setOffer({...offer,supplierSku:e.target.value})}/><input className={control} placeholder="Source URL / safe ref" value={offer.sourceRef} onChange={e=>setOffer({...offer,sourceRef:e.target.value})}/><input className={control} type="number" step="0.01" placeholder="Unit cost" value={offer.unitCost} onChange={e=>setOffer({...offer,unitCost:e.target.value})}/><input className={control} type="number" step="0.01" placeholder="Shipping cost" value={offer.shippingCost} onChange={e=>setOffer({...offer,shippingCost:e.target.value})}/><input className={control} type="number" placeholder="Delivery days" value={offer.estimatedDeliveryDays} onChange={e=>setOffer({...offer,estimatedDeliveryDays:e.target.value})}/><input className={control} type="number" min="0" max="100" placeholder="Supplier score" value={offer.supplierScore} onChange={e=>setOffer({...offer,supplierScore:e.target.value})}/><select className={control} value={offer.role} onChange={e=>setOffer({...offer,role:e.target.value})}>{['candidate','primary','backup','rejected'].map(value=><option key={value}>{value}</option>)}</select><input className={control} maxLength={8} value={offer.currency} onChange={e=>setOffer({...offer,currency:e.target.value.toUpperCase()})}/></div><button disabled={!offer.supplierLabel.trim()||addOffer.isPending} onClick={()=>addOffer.mutate()} className={`${button} mt-2`}>Save supplier offer</button><div className="mt-3 space-y-2">{selectedOffers.map(row=><div key={row.id} className="rounded-lg border border-white/[.07] p-3"><div className="flex items-center gap-2"><span className="text-xs text-white">{row.supplier_label}</span><span className="rounded-full border border-white/10 px-2 py-.5 text-[9px] text-zinc-500">{row.role}</span>{row.retail_supplier_id?<span className="ml-auto text-[9px] text-emerald-300">Retail supplier linked</span>:<button disabled={!activeRetailWorkspace} onClick={()=>promoteSupplier(row)} className="ml-auto text-[9px] text-violet-300">Promote to supplier master</button>}</div><p className="mt-1 text-[10px] text-zinc-600">{row.provider||'provider not set'} · {row.currency} {row.unit_cost??'—'} + ship {row.shipping_cost??'—'} · {row.estimated_delivery_days??'—'} days · score {row.supplier_score??'—'}</p></div>)}</div></section>
      </div>

      <section className={panel}><Header icon={Store} title="Promote into shared Retail operations" desc="Retail owns the real supplier master, catalogue, fulfilment and orders. Promotion here is internal only; marketplace publication still requires the provider integration and approval flow."/><div className="mt-4 flex flex-wrap gap-2">{retailRows.length?<select className="rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white" value={activeRetailWorkspace} onChange={e=>setRetailWorkspaceId(e.target.value)}>{retailRows.map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select>:<button disabled={createRetailWorkspace.isPending} onClick={()=>createRetailWorkspace.mutate()} className={button}><Plus className="mr-1 inline h-3 w-3"/>Create ecommerce operations workspace</button>}<button disabled={!activeRetailWorkspace||Boolean(selected.promoted_catalog_item_id)||selected.compliance_status==='blocked'||promote.isPending} onClick={()=>promote.mutate()} className={primary}>{selected.promoted_catalog_item_id?'Already in catalogue':'Promote to Retail catalogue'}</button><button onClick={()=>navigate('/retail-hub')} className={button}>Open Retail Hub <ExternalLink className="ml-1 inline h-3 w-3"/></button>{selected.status!=='archived'&&<button onClick={()=>changeStatus('archived')} className={button}><Archive className="mr-1 inline h-3 w-3"/>Archive</button>}</div><p className="mt-3 text-[10px] leading-4 text-zinc-600">A catalogue promotion does not create a marketplace listing, purchase supplier stock, charge a customer or spend advertising budget.</p></section>
    </>}
  </div>;
}

function Field({label,children}){return <label><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>}
function Header({icon:Icon,title,desc}){return <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10"><Icon className="h-4 w-4 text-violet-300"/></span><div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">{desc}</p></div></div>}
