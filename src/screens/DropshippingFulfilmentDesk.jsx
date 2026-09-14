import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {ExternalLink,Loader2,PackageCheck,ShieldCheck,Truck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {getRetailOperations,listRetailWorkspaces} from '@/lib/retail/retail-operations.functions';
import {getDropshippingFulfilmentCapabilities,queueDropshippingFulfilmentApproval} from '@/lib/dropshipping/dropshipping-fulfilment.functions';
import {orderHasDropshipProduct} from '@/lib/dropshipping/dropshipping-fulfilment';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';

function Field({title,children}){return <label className="block"><span className={label}>{title}</span>{children}</label>}

export default function DropshippingFulfilmentDesk(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const getOperationsFn=useServerFn(getRetailOperations);
  const capabilitiesFn=useServerFn(getDropshippingFulfilmentCapabilities);
  const queueFn=useServerFn(queueDropshippingFulfilmentApproval);
  const [workspaceId,setWorkspaceId]=useState('');
  const [orderId,setOrderId]=useState('');
  const [capabilityKey,setCapabilityKey]=useState('');
  const [payload,setPayload]=useState('{}');

  const workspaces=useQuery({queryKey:['dropship-fulfilment-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerceWorkspaces=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerceWorkspaces.length)setWorkspaceId(ecommerceWorkspaces[0].id)},[workspaceId,ecommerceWorkspaces]);

  const operations=useQuery({queryKey:['dropship-fulfilment-operations',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const capabilities=useQuery({queryKey:['dropship-fulfilment-capabilities'],queryFn:()=>capabilitiesFn(),enabled:session==='yes',retry:false,staleTime:30_000});
  const orders=useMemo(()=>{
    const catalog=operations.data?.catalog??[];
    return (operations.data?.orders??[]).filter(order=>orderHasDropshipProduct(order,catalog)&&!['completed','cancelled','refunded'].includes(String(order.status||''))&&!['delivered','returned','collected'].includes(String(order.fulfilment_status||'')));
  },[operations.data]);
  useEffect(()=>{if(orderId&&!orders.some(order=>order.id===orderId))setOrderId('')},[orders,orderId]);

  const rows=capabilities.data??[];
  const selected=rows.find(row=>`${row.provider}:${row.action}`===capabilityKey);
  const grouped=useMemo(()=>{
    const map=new Map();
    for(const row of rows){const list=map.get(row.provider)??[];list.push(row);map.set(row.provider,list)}
    return [...map.entries()];
  },[rows]);

  const queue=useMutation({
    mutationFn:()=>{
      if(!selected)throw new Error('Choose a live supplier or shipping capability.');
      let actionInput;
      try{actionInput=JSON.parse(payload)}catch{throw new Error('Provider input must be valid JSON.')}
      if(!actionInput||typeof actionInput!=='object'||Array.isArray(actionInput))throw new Error('Provider input must be a JSON object.');
      return queueFn({data:{workspace_id:workspaceId,order_id:orderId,provider:selected.provider,action:selected.action,action_input:actionInput}});
    },
    onSuccess:result=>toast({title:result.reused?'Existing approval reused':'Fulfilment approval created',description:`${result.provider} · ${result.action} is ready in Mission Control. No supplier/order write occurs until the approval executes.`}),
    onError:error=>toast({variant:'destructive',title:'Could not queue fulfilment',description:friendlyMessage(error)}),
  });

  if(session==='no')return null;
  const currentOrder=orders.find(order=>order.id===orderId);
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/10"><Truck className="h-4 w-4 text-cyan-300"/></span><div><h2 className="text-sm font-semibold text-white">Fulfilment Execution Desk</h2><p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">Turn an authoritative dropship-linked Retail order into an exact supplier or shipping-provider action. Blackstar prepares the connected provider payload, fingerprints it, and creates a Mission Control approval. It never silently places a supplier order, buys inventory, creates a label or marks an order fulfilled.</p></div></div>
      <button onClick={()=>navigate('/mission-control')} className="rounded-xl border border-cyan-400/20 px-3 py-2 text-xs text-cyan-200">Mission Control <ExternalLink className="ml-1 inline h-3 w-3"/></button>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field title="Retail operations workspace"><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setOrderId('')}}><option value="">Select ecommerce workspace</option>{ecommerceWorkspaces.map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select></Field>
            <Field title="Dropship-linked open order"><select className={control} value={orderId} onChange={e=>setOrderId(e.target.value)} disabled={!workspaceId}><option value="">Select order</option>{orders.map(order=><option key={order.id} value={order.id}>{order.order_number||order.id} · {order.fulfilment_status||'unfulfilled'} · {order.currency||''} {Number(order.total||0).toFixed(2)}</option>)}</select></Field>
          </div>
          {operations.isFetching&&<p className="mt-3 text-[10px] text-zinc-500"><Loader2 className="mr-1 inline h-3 w-3 animate-spin"/>Loading authoritative Retail orders…</p>}
          {operations.error&&<p className="mt-3 text-xs text-rose-300">{friendlyMessage(operations.error)}</p>}
          {workspaceId&&!operations.isFetching&&!orders.length&&<p className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-[10px] leading-4 text-zinc-600">No open orders are linked to Dropshipping Hub catalog products in this workspace. Imported marketplace orders must be linked to authoritative catalog items before fulfilment automation is allowed.</p>}
          {currentOrder&&<div className="mt-3 grid gap-2 sm:grid-cols-3"><Stat label="Status" value={currentOrder.status||'open'}/><Stat label="Fulfilment" value={currentOrder.fulfilment_status||'unfulfilled'}/><Stat label="Tracking" value={currentOrder.tracking_number||'not recorded'}/></div>}
        </div>

        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
          <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-300"/><p className="text-xs font-medium text-white">Live supplier / shipping capability</p>{capabilities.isFetching&&<Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500"/>}</div>
          {capabilities.error&&<p className="mt-3 text-xs text-rose-300">{friendlyMessage(capabilities.error)}</p>}
          <select className={`${control} mt-3`} value={capabilityKey} onChange={e=>{setCapabilityKey(e.target.value);setPayload('{}')}}>
            <option value="">Choose a deployed approval-gated action</option>
            {grouped.map(([provider,providerRows])=><optgroup key={provider} label={provider}>{providerRows.map(row=><option key={`${row.provider}:${row.action}`} value={`${row.provider}:${row.action}`}>{row.action}{row.requiresApproval?' · approval':''}</option>)}</optgroup>)}
          </select>
          {!capabilities.isFetching&&!rows.length&&<p className="mt-3 text-[10px] leading-4 text-zinc-600">No deployed supplier/shipping capability is available for this account yet. Connect Printful, Printify, CJdropshipping, Shippo, ShipStation or another supported provider through Integrations first.</p>}
          {selected&&<div className="mt-3 rounded-lg border border-white/[.07] p-3"><div className="flex gap-2"><p className="text-[11px] text-zinc-200">{selected.provider} · {selected.action}</p>{selected.requiresApproval&&<ShieldCheck className="ml-auto h-3.5 w-3.5 text-amber-300"/>}</div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{selected.description}</p><details className="mt-2"><summary className="cursor-pointer text-[9px] text-zinc-600">Provider input schema</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[9px] text-zinc-500">{selected.inputSchemaJson}</pre></details></div>}
        </div>
      </div>

      <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300"/><p className="text-xs font-medium text-white">Exact provider payload</p></div>
        <p className="mt-1 text-[10px] leading-4 text-zinc-600">Enter only the fields required by the selected connected provider. The server validates/prepares this payload against the provider adapter before any approval is created.</p>
        <textarea className={`${control} mt-3 min-h-72 font-mono text-[10px]`} value={payload} onChange={e=>setPayload(e.target.value)} spellCheck={false}/>
        <button disabled={!workspaceId||!orderId||!selected||queue.isPending} onClick={()=>queue.mutate()} className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{queue.isPending?<Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin"/>:<ShieldCheck className="mr-1 inline h-3.5 w-3.5"/>}Prepare & request approval</button>
        <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/[.03] p-3 text-[10px] leading-4 text-zinc-500">Duplicate pending/approved payloads are fingerprinted server-side. A previously approved action cannot be silently replayed against the same order revision. Failed immutable actions are retried from Mission Control rather than recreated.</div>
      </div>
    </div>
  </section>;
}

function Stat({label,value}){return <div className="rounded-lg border border-white/[.07] bg-black/20 p-2.5"><p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 truncate text-[11px] text-zinc-200">{String(value)}</p></div>}
