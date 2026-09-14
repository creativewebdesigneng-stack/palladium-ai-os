import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Boxes,CheckCircle2,Database,ExternalLink,Loader2,PackagePlus,ShieldCheck,Store,Truck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {DROPSHIP_CHANNELS,assessChannelCompliance,calculateUnitEconomics} from '@/lib/dropshipping/dropshipping';
import {buildDropshipCatalogPayload} from '@/lib/dropshipping/dropshipping-pipeline';
import {getRetailOperations,listRetailWorkspaces,saveRetailCatalogItem,saveRetailSupplier,saveRetailWorkspace} from '@/lib/retail/retail-operations.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';
const n=(value)=>Number(value)||0;
const safeScore=(value)=>value===''?null:n(value);

const initialProduct={
  name:'',sku:'',category:'',description:'',currency:'GBP',channel:'shopify',fulfilmentModel:'wholesale-supplier',stage:'researching',evidenceUrl:'',evidenceNotes:'',opportunityScore:'',supplierScore:'',
  sellPrice:39.99,productCost:9,shippingCost:4,marketplaceFeePct:10,paymentFeePct:3,adCost:7,returnsReservePct:5,taxReservePct:0,
  originalDesign:false,productionPartnerDisclosed:false,restrictedProduct:false,ipRisk:false,
};

export default function DropshippingProductPipeline(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const getOperationsFn=useServerFn(getRetailOperations);
  const saveWorkspaceFn=useServerFn(saveRetailWorkspace);
  const saveSupplierFn=useServerFn(saveRetailSupplier);
  const saveCatalogFn=useServerFn(saveRetailCatalogItem);
  const [workspaceId,setWorkspaceId]=useState('');
  const [workspaceName,setWorkspaceName]=useState('');
  const [workspaceCurrency,setWorkspaceCurrency]=useState('GBP');
  const [supplierId,setSupplierId]=useState('');
  const [newSupplier,setNewSupplier]=useState({name:'',website:'',leadTimeDays:'',minimumOrderAmount:'',notes:''});
  const [product,setProduct]=useState(initialProduct);

  const workspaces=useQuery({queryKey:['dropshipping-retail-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerceWorkspaces=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerceWorkspaces.length)setWorkspaceId(ecommerceWorkspaces[0].id)},[workspaceId,ecommerceWorkspaces]);
  useEffect(()=>{const current=ecommerceWorkspaces.find(row=>row.id===workspaceId);if(current?.currency)setProduct(value=>({...value,currency:current.currency}))},[workspaceId,ecommerceWorkspaces]);

  const operations=useQuery({queryKey:['dropshipping-retail-operations',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const suppliers=operations.data?.suppliers??[];
  const candidates=useMemo(()=>((operations.data?.catalog??[]).filter(item=>item.metadata?.source==='dropshipping-hub')),[operations.data?.catalog]);
  const economics=useMemo(()=>calculateUnitEconomics(product),[product]);
  const compliance=useMemo(()=>assessChannelCompliance({channel:product.channel,fulfilmentModel:product.fulfilmentModel,originalDesign:product.originalDesign,productionPartnerDisclosed:product.productionPartnerDisclosed,restrictedProduct:product.restrictedProduct,ipRisk:product.ipRisk}),[product]);

  const createWorkspace=useMutation({
    mutationFn:()=>saveWorkspaceFn({data:{business_name:workspaceName.trim(),business_type:'ecommerce',currency:workspaceCurrency.trim().toUpperCase(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',notes:'Created from Dropshipping Hub for durable product, supplier and order operations.',ai_preferences:{source:'dropshipping-hub',inventory_model:'supplier-managed'}}}),
    onSuccess:async(row)=>{setWorkspaceId(row.id);setWorkspaceName('');await qc.invalidateQueries({queryKey:['dropshipping-retail-workspaces']});toast({title:'Operations workspace created',description:'Dropshipping products can now flow into Blackstar Retail Operations without duplicating the order/inventory backend.'});},
    onError:(error)=>toast({variant:'destructive',title:'Could not create operations workspace',description:friendlyMessage(error)}),
  });

  const createSupplier=useMutation({
    mutationFn:async()=>{
      const website=normaliseOptionalHttpUrl(newSupplier.website,'Supplier website');
      return saveSupplierFn({data:{workspace_id:workspaceId,name:newSupplier.name.trim(),website,lead_time_days:newSupplier.leadTimeDays===''?undefined:n(newSupplier.leadTimeDays),minimum_order_amount:newSupplier.minimumOrderAmount===''?undefined:n(newSupplier.minimumOrderAmount),currency:product.currency,notes:newSupplier.notes.trim()||'Supplier added from Dropshipping Hub. Verify current stock, SLA, returns and product compliance before external actions.',status:'active'}});
    },
    onSuccess:async(row)=>{setSupplierId(row.id);setNewSupplier({name:'',website:'',leadTimeDays:'',minimumOrderAmount:'',notes:''});await qc.invalidateQueries({queryKey:['dropshipping-retail-operations',workspaceId]});toast({title:'Supplier saved',description:'Supplier details now live in Blackstar Retail Operations and can be reused across products.'});},
    onError:(error)=>toast({variant:'destructive',title:'Could not save supplier',description:friendlyMessage(error)}),
  });

  const saveCandidate=useMutation({
    mutationFn:()=>{
      const payload=buildDropshipCatalogPayload({
        workspaceId,supplierId:supplierId||null,name:product.name,sku:product.sku,category:product.category,description:product.description,currency:product.currency,
        channel:product.channel,fulfilmentModel:product.fulfilmentModel,stage:product.stage,evidenceUrl:product.evidenceUrl,evidenceNotes:product.evidenceNotes,
        opportunityScore:safeScore(product.opportunityScore),supplierScore:safeScore(product.supplierScore),originalDesign:product.originalDesign,productionPartnerDisclosed:product.productionPartnerDisclosed,restrictedProduct:product.restrictedProduct,ipRisk:product.ipRisk,
        sellPrice:n(product.sellPrice),productCost:n(product.productCost),shippingCost:n(product.shippingCost),marketplaceFeePct:n(product.marketplaceFeePct),paymentFeePct:n(product.paymentFeePct),adCost:n(product.adCost),returnsReservePct:n(product.returnsReservePct),taxReservePct:n(product.taxReservePct),
      });
      return saveCatalogFn({data:payload});
    },
    onSuccess:async(row)=>{await qc.invalidateQueries({queryKey:['dropshipping-retail-operations',workspaceId]});setProduct(value=>({...initialProduct,currency:value.currency,channel:value.channel,fulfilmentModel:value.fulfilmentModel}));toast({title:'Product saved to durable pipeline',description:`${row.name} is now persisted in Blackstar Retail Operations with its dropshipping validation snapshot.`});},
    onError:(error)=>toast({variant:'destructive',title:'Could not save product',description:friendlyMessage(error)}),
  });

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10"><Database className="h-4 w-4 text-violet-300"/></span><div><h2 className="text-sm font-semibold text-white">Durable product pipeline</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Promote researched products into Blackstar's existing Retail Operations data model so supplier evidence, pricing, compliance state and future orders survive page refreshes. Dropship inventory stays supplier-managed rather than being misreported as owned stock.</p></div></div><button onClick={()=>navigate('/retail-hub')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Retail Operations <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <div className="space-y-5">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Store className="h-4 w-4 text-violet-300"/><p className="text-xs font-medium text-white">Operations workspace</p>{workspaces.isFetching&&<Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500"/>}</div>{workspaces.error&&<p className="mt-2 text-xs text-rose-300">{friendlyMessage(workspaces.error)}</p>}<div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setSupplierId('')}}><option value="">Select an ecommerce workspace</option>{ecommerceWorkspaces.map(row=><option key={row.id} value={row.id}>{row.business_name} · {row.currency}</option>)}</select><button onClick={()=>navigate('/retail-hub')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Manage operations</button></div><div className="mt-3 grid gap-2 md:grid-cols-[1fr_110px_auto]"><input className={control} value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} placeholder="New dropshipping operation"/><input className={control} maxLength={8} value={workspaceCurrency} onChange={e=>setWorkspaceCurrency(e.target.value.toUpperCase())}/><button disabled={createWorkspace.isPending||!workspaceName.trim()} onClick={()=>createWorkspace.mutate()} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{createWorkspace.isPending?'Creating…':'Create ecommerce workspace'}</button></div></div>

        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-cyan-300"/><p className="text-xs font-medium text-white">Supplier record</p></div><div className="mt-3 grid gap-3 md:grid-cols-2"><Field title="Existing supplier"><select className={control} value={supplierId} onChange={e=>setSupplierId(e.target.value)} disabled={!workspaceId}><option value="">No supplier linked yet</option>{suppliers.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field title="New supplier name"><input className={control} value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier,name:e.target.value})} placeholder="Verified supplier" disabled={!workspaceId}/></Field><Field title="Supplier website"><input className={control} value={newSupplier.website} onChange={e=>setNewSupplier({...newSupplier,website:e.target.value})} placeholder="https://supplier.example" disabled={!workspaceId}/></Field><Field title="Lead time days"><input type="number" min="0" max="3650" className={control} value={newSupplier.leadTimeDays} onChange={e=>setNewSupplier({...newSupplier,leadTimeDays:e.target.value})} disabled={!workspaceId}/></Field><Field title="Minimum order"><input type="number" min="0" step="0.01" className={control} value={newSupplier.minimumOrderAmount} onChange={e=>setNewSupplier({...newSupplier,minimumOrderAmount:e.target.value})} disabled={!workspaceId}/></Field><Field title="Supplier notes"><input className={control} value={newSupplier.notes} onChange={e=>setNewSupplier({...newSupplier,notes:e.target.value})} placeholder="Returns, SLA, stock evidence…" disabled={!workspaceId}/></Field></div><button disabled={!workspaceId||!newSupplier.name.trim()||createSupplier.isPending} onClick={()=>createSupplier.mutate()} className="mt-3 rounded-xl border border-cyan-400/20 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40">{createSupplier.isPending?'Saving supplier…':'Add supplier to operations'}</button></div>

        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><PackagePlus className="h-4 w-4 text-emerald-300"/><p className="text-xs font-medium text-white">Product decision record</p></div><div className="mt-3 grid gap-3 md:grid-cols-3"><Field title="Product name"><input className={control} value={product.name} onChange={e=>setProduct({...product,name:e.target.value})} placeholder="Compression packing cubes"/></Field><Field title="SKU"><input className={control} value={product.sku} onChange={e=>setProduct({...product,sku:e.target.value})} placeholder="Optional"/></Field><Field title="Category"><input className={control} value={product.category} onChange={e=>setProduct({...product,category:e.target.value})} placeholder="Travel accessories"/></Field><Field title="Channel"><select className={control} value={product.channel} onChange={e=>setProduct({...product,channel:e.target.value})}>{DROPSHIP_CHANNELS.filter(row=>row.id!=='blackstar-site').map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></Field><Field title="Fulfilment model"><select className={control} value={product.fulfilmentModel} onChange={e=>setProduct({...product,fulfilmentModel:e.target.value})}>{['wholesale-supplier','manufacturer','pod','owned-stock','retailer-arbitrage','marketplace-arbitrage'].map(value=><option key={value}>{value}</option>)}</select></Field><Field title="Pipeline stage"><select className={control} value={product.stage} onChange={e=>setProduct({...product,stage:e.target.value})}>{['researching','validated','testing','paused','rejected'].map(value=><option key={value}>{value}</option>)}</select></Field></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['sellPrice','Sell price'],['productCost','Product cost'],['shippingCost','Shipping cost'],['marketplaceFeePct','Marketplace fee %'],['paymentFeePct','Payment fee %'],['adCost','Ad cost / order'],['returnsReservePct','Returns reserve %'],['taxReservePct','Tax reserve %']].map(([key,title])=><Field key={key} title={title}><input type="number" min="0" step="0.01" className={control} value={product[key]} onChange={e=>setProduct({...product,[key]:e.target.value})}/></Field>)}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2"><Field title="Opportunity score (optional)"><input type="number" min="0" max="100" className={control} value={product.opportunityScore} onChange={e=>setProduct({...product,opportunityScore:e.target.value})} placeholder="Copy from Product Scout"/></Field><Field title="Supplier score (optional)"><input type="number" min="0" max="100" className={control} value={product.supplierScore} onChange={e=>setProduct({...product,supplierScore:e.target.value})} placeholder="Copy from Supplier scorecard"/></Field><Field title="Evidence URL"><input className={control} value={product.evidenceUrl} onChange={e=>setProduct({...product,evidenceUrl:e.target.value})} placeholder="https://current-source.example/product"/></Field><Field title="Evidence / validation notes"><textarea className={`${control} min-h-20`} value={product.evidenceNotes} onChange={e=>setProduct({...product,evidenceNotes:e.target.value})} placeholder="What was observed, what is inferred, delivery evidence, returns constraints…"/></Field></div>
          <Field title="Product description"><textarea className={`${control} min-h-20`} value={product.description} onChange={e=>setProduct({...product,description:e.target.value})} placeholder="Grounded product description or internal validation summary"/></Field>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{[['originalDesign','Original design'],['productionPartnerDisclosed','Production partner disclosed'],['restrictedProduct','Restricted / regulated product'],['ipRisk','IP / counterfeit concern']].map(([key,title])=><label key={key} className="flex items-center gap-2 rounded-xl border border-white/[.08] p-3 text-xs text-zinc-400"><input type="checkbox" checked={product[key]} onChange={e=>setProduct({...product,[key]:e.target.checked})}/>{title}</label>)}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniStat title="Modelled profit" value={`${economics.profit.toFixed(2)} ${product.currency}`}/><MiniStat title="Modelled margin" value={`${economics.marginPct}%`}/><MiniStat title="Compliance" value={compliance.status}/></div>
          {!compliance.allowed&&<div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[.04] p-3"><p className="text-xs font-medium text-red-300">This record will be stored as blocked, not launch-ready.</p>{compliance.reasons.map(reason=><p key={reason} className="mt-1 text-[10px] leading-4 text-zinc-500">{reason}</p>)}</div>}
          <button disabled={!workspaceId||!product.name.trim()||saveCandidate.isPending} onClick={()=>saveCandidate.mutate()} className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{saveCandidate.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}Save product to durable pipeline</button>
        </div>
      </div>

      <aside className="space-y-4"><div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-violet-300"/><p className="text-xs font-medium text-white">Saved products</p><span className="ml-auto text-[10px] text-zinc-600">{candidates.length}</span></div>{!workspaceId?<p className="mt-3 text-[11px] leading-5 text-zinc-500">Select or create an ecommerce operations workspace to load its durable product pipeline.</p>:operations.isFetching?<Loader2 className="mt-3 h-4 w-4 animate-spin text-zinc-500"/>:operations.error?<p className="mt-3 text-xs text-rose-300">{friendlyMessage(operations.error)}</p>:candidates.length?<div className="mt-3 space-y-2">{candidates.slice(0,20).map(item=><div key={item.id} className="rounded-xl border border-white/[.07] p-3"><div className="flex items-start gap-2"><div className="min-w-0"><p className="truncate text-xs font-medium text-white">{item.name}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-zinc-600">{item.metadata?.channel||'channel n/a'} · {item.metadata?.lifecycle_stage||'saved'}</p></div><span className={`ml-auto rounded-full border px-2 py-.5 text-[9px] ${item.active?'border-emerald-400/20 text-emerald-300':'border-zinc-600/30 text-zinc-500'}`}>{item.active?'active':'held'}</span></div><div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-zinc-500"><span>Cost {item.cost_price??'—'} {item.currency}</span><span>Price {item.sale_price??'—'} {item.currency}</span><span>Opp. {item.metadata?.opportunity_score??'—'}</span><span>Margin {item.metadata?.unit_economics?.marginPct??'—'}%</span></div>{item.metadata?.evidence?.url&&<a href={item.metadata.evidence.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-violet-300">Evidence <ExternalLink className="h-3 w-3"/></a>}</div>)}</div>:<p className="mt-3 text-[11px] leading-5 text-zinc-500">No Dropshipping Hub products are persisted in this workspace yet.</p>}</div>
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.035] p-4"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-[11px] leading-5 text-emerald-100/70">Saving a candidate does not publish a listing, place a supplier order, charge a customer or spend ad budget. Those actions stay behind Blackstar's connected-provider approval controls.</p></div></aside>
    </div>
  </section>;
}

function Field({title,children}){return <label className="block"><span className={label}>{title}</span>{children}</label>}
function MiniStat({title,value}){return <div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[10px] text-zinc-500">{title}</p><p className="mt-1 text-sm font-semibold capitalize text-white">{value}</p></div>}
function normaliseOptionalHttpUrl(value,title){const trimmed=value.trim();if(!trimmed)return undefined;let url;try{url=new URL(trimmed)}catch{throw new Error(`${title} must be a valid http(s) URL.`)}if(!['http:','https:'].includes(url.protocol))throw new Error(`${title} must use http or https.`);return url.toString().slice(0,500)}
