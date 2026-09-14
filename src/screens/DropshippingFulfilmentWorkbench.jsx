import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {CheckCircle2,ExternalLink,Loader2,PackageCheck,Send,ShieldCheck,Truck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {getRetailOperations,listRetailWorkspaces} from '@/lib/retail/retail-operations.functions';
import {buildDropshippingControlTower} from '@/lib/dropshipping/dropshipping-control-tower';
import {buildDropshipFulfilmentTemplate} from '@/lib/dropshipping/dropshipping-fulfilment';
import {getDropshippingFulfilmentCapabilities,queueDropshippingFulfilmentApproval} from '@/lib/dropshipping/dropshipping-fulfilment.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function DropshippingFulfilmentWorkbench(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const workspacesFn=useServerFn(listRetailWorkspaces);
  const operationsFn=useServerFn(getRetailOperations);
  const capabilitiesFn=useServerFn(getDropshippingFulfilmentCapabilities);
  const queueFn=useServerFn(queueDropshippingFulfilmentApproval);
  const [workspaceId,setWorkspaceId]=useState('');
  const [orderId,setOrderId]=useState('');
  const [capabilityKey,setCapabilityKey]=useState('');
  const [payload,setPayload]=useState('{}');

  const workspaces=useQuery({queryKey:['retail-workspaces'],queryFn:()=>workspacesFn(),enabled:session.ready,retry:false});
  const operations=useQuery({queryKey:['dropshipping-fulfilment-operations',workspaceId],queryFn:()=>operationsFn({data:{workspace_id:workspaceId}}),enabled:session.ready&&Boolean(workspaceId),retry:false});
  const capabilities=useQuery({queryKey:['dropshipping-fulfilment-capabilities'],queryFn:()=>capabilitiesFn(),enabled:session.ready,retry:false});
  const tower=useMemo(()=>buildDropshippingControlTower({catalog:operations.data?.catalog,orders:operations.data?.orders}),[operations.data]);
  const orders=tower.fulfilmentQueue??[];
  const writable=(capabilities.data??[]).filter(row=>row.deployed&&row.requiresApproval);
  const selectedOrder=orders.find(row=>row.id===orderId);
  const selectedCapability=writable.find(row=>`${row.provider}:${row.action}`===capabilityKey);

  useEffect(()=>{
    if(!selectedOrder)return;
    setPayload(JSON.stringify(buildDropshipFulfilmentTemplate(selectedOrder),null,2));
  },[orderId]);

  const queue=useMutation({
    mutationFn:()=>{
      if(!selectedOrder||!selectedCapability)throw new Error('Choose an order and a deployed supplier capability.');
      let parsed;
      try{parsed=JSON.parse(payload)}catch{throw new Error('Provider payload must be valid JSON.');}
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Provider payload must be a JSON object.');
      return queueFn({data:{workspace_id:workspaceId,order_id:selectedOrder.id,provider:selectedCapability.provider,action:selectedCapability.action,action_input:parsed}});
    },
    onSuccess:result=>{
      toast({title:result.reused?'Existing approval found':'Fulfilment approval created',description:result.reused?'The identical supplier action is already awaiting approval.':'Review and approve the immutable supplier payload in Mission Control.'});
      navigate('/mission-control');
    },
    onError:error=>toast({variant:'destructive',title:'Could not queue fulfilment',description:friendlyMessage(error)}),
  });

  return <section className={panel}>
    <div className="flex flex-wrap items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10"><PackageCheck className="h-4 w-4 text-emerald-300"/></span><div><h2 className="text-sm font-semibold text-white">Supplier Fulfilment Workbench</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Route paid dropshipping orders to connected supplier/fulfilment providers through Blackstar approvals. This page prepares an exact provider payload; it never places a supplier order directly.</p></div><span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-300"><ShieldCheck className="h-3 w-3"/>Mission Control gated</span></div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <label><span className="mb-1 block text-[10px] text-zinc-500">Ecommerce workspace</span><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setOrderId('')}}><option value="">Select workspace</option>{(workspaces.data??[]).filter(row=>row.business_type==='ecommerce'||row.business_type==='mixed').map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select></label>
      <label><span className="mb-1 block text-[10px] text-zinc-500">Open dropshipping order</span><select className={control} value={orderId} onChange={e=>setOrderId(e.target.value)} disabled={!workspaceId}><option value="">Select linked paid order</option>{orders.map(order=><option key={order.id} value={order.id}>{order.order_number||order.id} · {order.payment_status} · {order.fulfilment_status}</option>)}</select></label>
      <label className="md:col-span-2"><span className="mb-1 block text-[10px] text-zinc-500">Supplier / fulfilment capability</span><select className={control} value={capabilityKey} onChange={e=>setCapabilityKey(e.target.value)}><option value="">Select deployed approval-gated capability</option>{writable.map(cap=><option key={`${cap.provider}:${cap.action}`} value={`${cap.provider}:${cap.action}`}>{cap.provider} · {cap.action}</option>)}</select></label>
    </div>

    {selectedCapability&&<div className="mt-3 rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-cyan-300"/><p className="text-[11px] text-white">{selectedCapability.description}</p></div><p className="mt-2 break-all text-[9px] leading-4 text-zinc-600">Input schema: {selectedCapability.inputSchemaJson}</p></div>}

    <label className="mt-3 block"><span className="mb-1 block text-[10px] text-zinc-500">Exact provider payload</span><textarea className={`${control} min-h-52 font-mono text-[10px] leading-5`} value={payload} onChange={e=>setPayload(e.target.value)}/></label>
    <p className="mt-2 text-[10px] leading-4 text-zinc-600">The starter payload contains the Retail order reference, line items and shipping address. Adapt it to the selected provider's advertised input schema. Blackstar validates the live capability again server-side before creating an approval.</p>

    <div className="mt-4 flex flex-wrap gap-2"><button disabled={!workspaceId||!orderId||!capabilityKey||queue.isPending} onClick={()=>queue.mutate()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{queue.isPending?<Loader2 className="mr-1 inline h-3 w-3 animate-spin"/>:<Send className="mr-1 inline h-3 w-3"/>}Queue fulfilment approval</button><button onClick={()=>navigate('/mission-control')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Mission Control <ExternalLink className="ml-1 inline h-3 w-3"/></button><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Manage supplier connections</button></div>

    {!operations.isLoading&&workspaceId&&!orders.length&&<div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>No open paid dropshipping fulfilment orders were found in this workspace.</div>}
  </section>;
}
