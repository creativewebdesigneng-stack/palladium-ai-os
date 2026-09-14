import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Database,ExternalLink,Loader2,PackagePlus,Plug,Search,ShieldCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {DROPSHIP_CHANNELS} from '@/lib/dropshipping/dropshipping';
import {buildCatalogReadInputTemplate} from '@/lib/dropshipping/dropshipping-catalog';
import {executeDropshippingCatalogRead,getDropshippingCatalogReadCapabilities} from '@/lib/dropshipping/dropshipping-catalog.functions';
import {buildDropshipCatalogPayload} from '@/lib/dropshipping/dropshipping-pipeline';
import {listRetailWorkspaces,saveRetailCatalogItem} from '@/lib/retail/retail-operations.functions';

const PROVIDERS=[
  ['shopify','Shopify'],['etsy','Etsy'],['amazon','Amazon'],['ebay','eBay'],['woocommerce','WooCommerce'],
  ['printful','Printful'],['printify','Printify'],['gelato','Gelato'],['cjdropshipping','CJdropshipping'],
  ['aliexpress','AliExpress / DSers'],['zendrop','Zendrop'],['spocket','Spocket'],['syncee','Syncee'],
];
const POD=new Set(['printful','printify','gelato']);
const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';

export default function DropshippingCatalogExplorer(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const capsFn=useServerFn(getDropshippingCatalogReadCapabilities);
  const readFn=useServerFn(executeDropshippingCatalogRead);
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const saveCatalogFn=useServerFn(saveRetailCatalogItem);
  const [provider,setProvider]=useState('shopify');
  const [action,setAction]=useState('');
  const [actionInput,setActionInput]=useState('{}');
  const [result,setResult]=useState(null);
  const [workspaceId,setWorkspaceId]=useState('');
  const [channel,setChannel]=useState('shopify');
  const [importing,setImporting]=useState('');

  const capabilities=useQuery({queryKey:['dropship-catalog-capabilities',provider],queryFn:()=>capsFn({data:{provider}}),enabled:session==='yes',retry:false,staleTime:30_000});
  const workspaces=useQuery({queryKey:['dropship-catalog-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerce=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);

  useEffect(()=>{
    const rows=capabilities.data??[];
    if(!rows.some(row=>row.action===action)){
      const first=rows[0];setAction(first?.action||'');setActionInput(JSON.stringify(first?buildCatalogReadInputTemplate(first.inputSchema):{},null,2));setResult(null);
    }
  },[provider,capabilities.data,action]);
  useEffect(()=>{if(!workspaceId&&ecommerce.length)setWorkspaceId(ecommerce[0].id)},[workspaceId,ecommerce]);

  const selectedCap=(capabilities.data??[]).find(row=>row.action===action);
  const runRead=async()=>{
    if(!action)return;
    let parsed;
    try{parsed=JSON.parse(actionInput||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Input must be a JSON object.');}
    catch(error){toast({variant:'destructive',title:'Invalid catalog input',description:error instanceof Error?error.message:'Enter a valid JSON object.'});return;}
    try{setResult(await readFn({data:{provider,action,action_input:parsed}}));}
    catch(error){setResult(null);toast({variant:'destructive',title:'Catalog read failed',description:friendlyMessage(error)});}
  };

  const importCandidate=async(candidate,index)=>{
    if(!workspaceId||importing)return;
    setImporting(`${candidate.sourceId||candidate.name}-${index}`);
    try{
      const workspace=ecommerce.find(row=>row.id===workspaceId);
      const currency=(candidate.currency||workspace?.currency||'GBP').toUpperCase().slice(0,8);
      const payload=buildDropshipCatalogPayload({
        workspaceId,name:candidate.name,sku:candidate.sku||'',category:candidate.category||'',description:candidate.description||'',
        currency,channel,fulfilmentModel:POD.has(provider)?'pod':'wholesale-supplier',stage:'researching',
        evidenceUrl:candidate.url||'',evidenceNotes:`Imported from connected ${provider} via ${action}. Observed listing/catalog values are evidence only. Verify supplier cost, stock, shipping SLA, returns, product safety and target-channel policy before validation or publication.`,
        sourceProvider:provider,sourceAction:action,sourceItemId:candidate.sourceId||'',
        sellPrice:Math.max(0,Number(candidate.price)||0),productCost:0,shippingCost:0,marketplaceFeePct:0,paymentFeePct:0,adCost:0,returnsReservePct:0,taxReservePct:0,
        originalDesign:false,productionPartnerDisclosed:false,restrictedProduct:false,ipRisk:false,
      });
      await saveCatalogFn({data:payload});
      await qc.invalidateQueries({queryKey:['dropshipping-retail-operations',workspaceId]});
      toast({title:'Catalog candidate imported',description:`${candidate.name} is now in the durable product pipeline as researching. Verify economics and compliance before validation.`});
    }catch(error){toast({variant:'destructive',title:'Could not import product',description:friendlyMessage(error)});}
    finally{setImporting('');}
  };

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-500/10"><Database className="h-4 w-4 text-teal-300"/></span><div><h2 className="text-sm font-semibold text-white">Connected Catalog Explorer</h2><p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">Read products/listings from connected providers using only Blackstar capabilities that are live, low-risk and approval-free. Customer, order, payment, fulfilment and write actions are excluded by the server. Importing creates a local research candidate; it does not change the provider.</p></div></div>
      <button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Manage Integrations <ExternalLink className="ml-1 inline h-3 w-3"/></button>
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <label><span className={label}>Connected provider</span><select className={control} value={provider} onChange={e=>{setProvider(e.target.value);setAction('');setResult(null)}}>{PROVIDERS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label><span className={label}>Read-only catalog capability</span><select className={control} value={action} onChange={e=>{const next=(capabilities.data??[]).find(row=>row.action===e.target.value);setAction(e.target.value);setActionInput(JSON.stringify(next?buildCatalogReadInputTemplate(next.inputSchema):{},null,2));setResult(null)}}><option value="">Select capability</option>{(capabilities.data??[]).map(row=><option key={row.action} value={row.action}>{row.action}</option>)}</select></label>
      <label><span className={label}>Import into Retail workspace</span><select className={control} value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}><option value="">Select ecommerce workspace</option>{ecommerce.map(row=><option key={row.id} value={row.id}>{row.business_name} · {row.currency}</option>)}</select></label>
    </div>

    {capabilities.isFetching&&<p className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin"/>Inspecting live catalog capabilities…</p>}
    {capabilities.error&&<div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[.05] p-3 text-xs text-rose-200">{friendlyMessage(capabilities.error)}</div>}
    {!capabilities.isFetching&&!capabilities.error&&(capabilities.data??[]).length===0&&<div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.04] p-3 text-[11px] text-amber-200"><Plug className="mr-1 inline h-3.5 w-3.5"/>This account does not currently advertise a safe executable catalog-read capability for {provider}. Connect/install the provider in Integrations first.</div>}

    {selectedCap&&<div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div><div className="mb-2 flex items-center gap-2"><Search className="h-4 w-4 text-teal-300"/><p className="text-xs font-medium text-white">{selectedCap.description}</p></div><textarea className={`${control} min-h-32 font-mono`} value={actionInput} onChange={e=>setActionInput(e.target.value)}/><button onClick={runRead} className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-medium text-white">Execute safe catalog read</button></div>
      <div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Provider input schema</p><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[9px] leading-4 text-zinc-500">{JSON.stringify(selectedCap.inputSchema??{},null,2)}</pre></div>
    </div>}

    {result&&<div className="mt-5">
      <div className="flex flex-wrap items-center gap-2"><PackagePlus className="h-4 w-4 text-teal-300"/><h3 className="text-xs font-semibold text-white">Connected catalog results</h3><span className="text-[10px] text-zinc-600">{result.candidates.length} normalized candidates · {result.provider} · {result.transport}</span></div>
      <div className="mt-3 flex items-center gap-3"><label className="min-w-60"><span className={label}>Target sales channel</span><select className={control} value={channel} onChange={e=>setChannel(e.target.value)}>{DROPSHIP_CHANNELS.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><span className="mt-5 text-[10px] leading-4 text-zinc-600">Target-channel compliance is evaluated again when the local candidate is saved.</span></div>
      {result.candidates.length===0?<div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500">The provider read succeeded, but Blackstar did not find product/listing-shaped records in the bounded response.</div>:<div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{result.candidates.map((item,index)=><article key={`${item.sourceId||item.name}-${index}`} className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{item.name}</p><p className="mt-1 truncate text-[9px] text-zinc-600">{item.vendor||item.category||item.sourceId||'Connected catalog item'}</p></div>{item.inventory!=null&&<span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">stock {item.inventory}</span>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div><p className="text-zinc-600">Observed price</p><p className="text-zinc-200">{item.price!=null?`${item.currency||''} ${item.price}`:'—'}</p></div><div><p className="text-zinc-600">SKU</p><p className="truncate text-zinc-200">{item.sku||'—'}</p></div></div><p className="mt-3 line-clamp-3 text-[10px] leading-4 text-zinc-500">{item.description||'No description returned by this provider read.'}</p><button disabled={!workspaceId||Boolean(importing)} onClick={()=>importCandidate(item,index)} className="mt-3 w-full rounded-lg border border-teal-400/20 px-2 py-2 text-[10px] text-teal-200 disabled:opacity-40">{importing===`${item.sourceId||item.name}-${index}`?'Importing…':'Import as research candidate'}</button></article>)}</div>}
    </div>}

    <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[.03] p-3 text-[10px] leading-4 text-zinc-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300"/><p>Catalog Explorer never accepts provider credentials and cannot execute approval-required capabilities. Observed provider price/stock is not automatically treated as supplier cost, guaranteed inventory or shipping evidence.</p></div>
  </section>;
}
