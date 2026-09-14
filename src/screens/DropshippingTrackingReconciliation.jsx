import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {CheckCircle2,ExternalLink,Loader2,RefreshCw,ShieldCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {getRetailOperations,listRetailWorkspaces} from '@/lib/retail/retail-operations.functions';
import {orderHasDropshipProduct} from '@/lib/dropshipping/dropshipping-fulfilment';
import {getDropshippingReconciliationCapabilities,readDropshippingFulfilmentEvidence,reconcileDropshippingFulfilmentEvidence} from '@/lib/dropshipping/dropshipping-reconciliation.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';
function Field({title,children}){return <label className="block"><span className={label}>{title}</span>{children}</label>}

export default function DropshippingTrackingReconciliation(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const getOperationsFn=useServerFn(getRetailOperations);
  const capsFn=useServerFn(getDropshippingReconciliationCapabilities);
  const readFn=useServerFn(readDropshippingFulfilmentEvidence);
  const reconcileFn=useServerFn(reconcileDropshippingFulfilmentEvidence);
  const [workspaceId,setWorkspaceId]=useState('');
  const [orderId,setOrderId]=useState('');
  const [capabilityKey,setCapabilityKey]=useState('');
  const [payload,setPayload]=useState('{}');
  const [evidence,setEvidence]=useState(null);
  const [mapping,setMapping]=useState({fulfilment_status:'shipped',carrier:'',tracking_number:''});

  const workspaces=useQuery({queryKey:['dropship-reconcile-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerce=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerce.length)setWorkspaceId(ecommerce[0].id)},[workspaceId,ecommerce]);
  const operations=useQuery({queryKey:['dropship-reconcile-operations',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const orders=useMemo(()=>{
    const catalog=operations.data?.catalog??[];
    return (operations.data?.orders??[]).filter(order=>orderHasDropshipProduct(order,catalog)&&!['cancelled','refunded'].includes(String(order.status||''))&&String(order.fulfilment_status||'')!=='returned');
  },[operations.data]);
  useEffect(()=>{if(orderId&&!orders.some(order=>order.id===orderId)){setOrderId('');setEvidence(null)}},[orders,orderId]);

  const caps=useQuery({queryKey:['dropship-reconcile-capabilities'],queryFn:()=>capsFn(),enabled:session==='yes',retry:false,staleTime:30000});
  const rows=caps.data??[];
  const selected=rows.find(row=>(row.provider+':'+row.action+':'+row.transport)===capabilityKey);
  const currentOrder=orders.find(order=>order.id===orderId);

  const read=useMutation({
    mutationFn:()=>{
      if(!selected)throw new Error('Choose a live read capability.');
      let actionInput;
      try{actionInput=JSON.parse(payload)}catch{throw new Error('Provider input must be valid JSON.')}
      if(!actionInput||typeof actionInput!=='object'||Array.isArray(actionInput))throw new Error('Provider input must be a JSON object.');
      return readFn({data:{workspace_id:workspaceId,order_id:orderId,provider:selected.provider,action:selected.action,transport:selected.transport,action_input:actionInput}});
    },
    onSuccess:result=>{
      setEvidence(result);
      setMapping(value=>({...value,carrier:result.order?.carrier||value.carrier,tracking_number:result.order?.tracking_number||value.tracking_number,fulfilment_status:result.order?.fulfilment_status||value.fulfilment_status}));
      toast({title:'Authoritative provider evidence saved',description:'Review the provider result, then map only verified carrier/tracking/status fields into Retail Operations.'});
    },
    onError:error=>toast({variant:'destructive',title:'Could not read provider state',description:friendlyMessage(error)}),
  });

  const reconcile=useMutation({
    mutationFn:()=>reconcileFn({data:{workspace_id:workspaceId,order_id:orderId,evidence_id:evidence.evidence.id,fulfilment_status:mapping.fulfilment_status,carrier:mapping.carrier||undefined,tracking_number:mapping.tracking_number||undefined}}),
    onSuccess:async result=>{
      await qc.invalidateQueries({queryKey:['dropship-reconcile-operations',workspaceId]});
      setEvidence(null);
      toast({title:'Retail fulfilment reconciled',description:(result.order.order_number||'Order')+' now reflects the verified provider evidence.'});
    },
    onError:error=>toast({variant:'destructive',title:'Could not reconcile fulfilment',description:friendlyMessage(error)}),
  });

  if(session==='no')return null;
  return <section className={panel+' mt-5'}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10"><RefreshCw className="h-4 w-4 text-emerald-300"/></span><div><h2 className="text-sm font-semibold text-white">Tracking & Fulfilment Reconciliation</h2><p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">Read authoritative state from a connected supplier or carrier using low-risk provider capabilities, persist the evidence server-side, then map verified tracking/status back into Retail Operations. Browser clients cannot create or alter evidence records.</p></div></div>
      <button onClick={()=>navigate('/retail-hub')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Retail Operations <ExternalLink className="ml-1 inline h-3 w-3"/></button>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field title="Workspace"><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setOrderId('');setEvidence(null)}}><option value="">Select ecommerce workspace</option>{ecommerce.map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select></Field>
          <Field title="Dropship order"><select className={control} value={orderId} onChange={e=>{setOrderId(e.target.value);setEvidence(null)}} disabled={!workspaceId}><option value="">Select linked order</option>{orders.map(order=><option key={order.id} value={order.id}>{order.order_number||order.id} · {order.fulfilment_status||'unfulfilled'}</option>)}</select></Field>
        </div>
        {currentOrder&&<div className="mt-3 rounded-lg border border-white/[.07] p-3 text-[10px] text-zinc-500">Current: <span className="text-zinc-200">{currentOrder.fulfilment_status||'unfulfilled'}</span>{currentOrder.carrier?' · '+currentOrder.carrier:''}{currentOrder.tracking_number?' · '+currentOrder.tracking_number:''}</div>}
        <Field title="Low-risk provider read"><select className={control+' mt-3'} value={capabilityKey} onChange={e=>{setCapabilityKey(e.target.value);setPayload('{}');setEvidence(null)}}><option value="">Choose supplier/carrier read action</option>{rows.map(row=>{const key=row.provider+':'+row.action+':'+row.transport;return <option key={key} value={key}>{row.provider} · {row.action}</option>})}</select></Field>
        {!caps.isFetching&&!rows.length&&<p className="mt-2 text-[10px] leading-4 text-zinc-600">No deployed low-risk supplier/carrier read capability is available. Connect a provider that exposes order, shipment or tracking reads through Integrations.</p>}
        {selected&&<details className="mt-3 rounded-lg border border-white/[.07] p-3"><summary className="cursor-pointer text-[10px] text-zinc-400">Provider input schema</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-[9px] text-zinc-600">{selected.inputSchemaJson}</pre></details>}
        <Field title="Exact read payload"><textarea className={control+' mt-3 min-h-40 font-mono text-[10px]'} value={payload} onChange={e=>setPayload(e.target.value)} spellCheck={false}/></Field>
        <button disabled={!workspaceId||!orderId||!selected||read.isPending} onClick={()=>read.mutate()} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{read.isPending?<Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="mr-1 inline h-3.5 w-3.5"/>}Read & save provider evidence</button>
      </div>

      <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-xs font-medium text-white">Verified reconciliation mapping</p></div>
        {!evidence?<p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-[10px] leading-5 text-zinc-600">Run a live provider read first. Reconciliation stays disabled until Blackstar has a server-written evidence record for this exact order.</p>:<>
          <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-500/[.03] p-3"><p className="text-[9px] uppercase tracking-wide text-emerald-300">Evidence saved</p><p className="mt-1 break-words text-[10px] leading-4 text-zinc-400">{evidence.summary||'Provider returned structured evidence.'}</p><details className="mt-2"><summary className="cursor-pointer text-[9px] text-zinc-600">Full bounded result</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[9px] text-zinc-600">{JSON.stringify(evidence.evidence.result,null,2)}</pre></details></div>
          <div className="mt-3 grid gap-3"><Field title="Verified fulfilment status"><select className={control} value={mapping.fulfilment_status} onChange={e=>setMapping({...mapping,fulfilment_status:e.target.value})}>{['unfulfilled','picking','packed','shipped','ready_for_collection','collected','delivered','returned'].map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field title="Verified carrier"><input className={control} value={mapping.carrier} onChange={e=>setMapping({...mapping,carrier:e.target.value})} placeholder="Carrier from provider evidence"/></Field><Field title="Verified tracking number"><input className={control} value={mapping.tracking_number} onChange={e=>setMapping({...mapping,tracking_number:e.target.value})} placeholder="Tracking number from provider evidence"/></Field></div>
          <button disabled={reconcile.isPending} onClick={()=>reconcile.mutate()} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{reconcile.isPending?<Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin"/>:<CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>}Reconcile into Retail Operations</button>
          <p className="mt-3 text-[9px] leading-4 text-zinc-600">Evidence expires after 24 hours and can be reconciled once. Fulfilment may move forward only; shipped/delivered/returned states require tracking evidence.</p>
        </>}
      </div>
    </div>
  </section>;
}
