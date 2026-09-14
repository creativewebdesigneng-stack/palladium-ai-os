import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Activity,AlertTriangle,Boxes,ExternalLink,Loader2,PackageCheck,RotateCcw,ShoppingCart,Truck,Workflow} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {buildDropshippingControlTower} from '@/lib/dropshipping/dropshipping-control-tower';
import {getRetailOperations,listRetailWorkspaces} from '@/lib/retail/retail-operations.functions';
import {getRetailAdvancedOperations} from '@/lib/retail/retail-advanced.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const severityClass={critical:'border-rose-400/25 bg-rose-500/[.06] text-rose-200',high:'border-amber-400/25 bg-amber-500/[.05] text-amber-200',medium:'border-yellow-400/20 bg-yellow-500/[.04] text-yellow-100',low:'border-white/10 bg-white/[.02] text-zinc-300'};

function Metric({label,value,sub}){return <div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p>{sub&&<p className="mt-1 text-[10px] text-zinc-600">{sub}</p>}</div>}
function Empty({children}){return <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-zinc-600">{children}</div>}

export default function DropshippingControlTower(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const getOperationsFn=useServerFn(getRetailOperations);
  const getAdvancedFn=useServerFn(getRetailAdvancedOperations);
  const [workspaceId,setWorkspaceId]=useState('');

  const workspaces=useQuery({queryKey:['dropship-control-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerceWorkspaces=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerceWorkspaces.length)setWorkspaceId(ecommerceWorkspaces[0].id)},[workspaceId,ecommerceWorkspaces]);
  const operations=useQuery({queryKey:['dropship-control-ops',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const advanced=useQuery({queryKey:['dropship-control-advanced',workspaceId],queryFn:()=>getAdvancedFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const tower=useMemo(()=>buildDropshippingControlTower({catalog:operations.data?.catalog,orders:operations.data?.orders,returns:advanced.data?.returns,demandSignals:advanced.data?.demandSignals,reorderProposals:advanced.data?.reorderProposals}),[operations.data,advanced.data]);
  const current=ecommerceWorkspaces.find(row=>row.id===workspaceId);
  const loading=operations.isFetching||advanced.isFetching;
  const error=operations.error||advanced.error||workspaces.error;
  const money=(value)=>new Intl.NumberFormat(undefined,{style:'currency',currency:current?.currency||'GBP',maximumFractionDigits:2}).format(Number(value||0));

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/10"><Activity className="h-4 w-4 text-sky-300"/></span><div><h2 className="text-sm font-semibold text-white">Dropshipping Operations Control Tower</h2><p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">Run post-listing operations from the same authoritative Retail records Blackstar already uses. The tower watches dropship-linked orders, fulfilment, tracking, supplier-managed stock, returns and reorder signals while leaving external supplier, carrier, refund and marketplace writes behind existing approval/integration controls.</p></div></div>
      <button onClick={()=>navigate('/retail-hub')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Retail Operations <ExternalLink className="ml-1 inline h-3 w-3"/></button>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <select className={control} value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}><option value="">Select ecommerce operations workspace</option>{ecommerceWorkspaces.map(row=><option key={row.id} value={row.id}>{row.business_name} · {row.currency}</option>)}</select>
      <div className="flex items-center gap-2">{loading&&<Loader2 className="h-4 w-4 animate-spin text-zinc-500"/>}<button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Connections</button></div>
    </div>
    {error&&<div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
    {!workspaceId&&<div className="mt-4"><Empty>Create or select an ecommerce workspace in the Durable Product Pipeline first. Blackstar will then aggregate its dropshipping operations here.</Empty></div>}

    {workspaceId&&<>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Dropship products" value={tower.metrics.products} sub={`${tower.metrics.suppliers} linked suppliers`}/>
        <Metric label="Open orders" value={tower.metrics.openOrders} sub={`${tower.metrics.linkedOrders} linked total`}/>
        <Metric label="Fulfilment exceptions" value={tower.metrics.fulfilmentExceptions} sub="tracking / delay watch"/>
        <Metric label="Open returns" value={tower.metrics.openReturns} sub={`${tower.metrics.openReorders} reorder proposals`}/>
        <Metric label="Recorded paid revenue" value={money(tower.metrics.grossRevenue)} sub="linked Retail orders only"/>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300"/><p className="text-xs font-medium text-white">Exception queue</p><span className="ml-auto text-[10px] text-zinc-600">{tower.alerts.length} active</span></div>
          <p className="mt-1 text-[10px] leading-4 text-zinc-600">Prioritised operational signals only. Blackstar does not mark supplier acceptance, delivery, refunds or external writes complete without authoritative provider evidence.</p>
          <div className="mt-3 space-y-2">{tower.alerts.length?tower.alerts.slice(0,18).map(alert=><div key={alert.id} className={`rounded-xl border p-3 ${severityClass[alert.severity]||severityClass.low}`}><div className="flex items-start gap-2"><span className="mt-0.5 rounded-md border border-current/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">{alert.severity}</span><div><p className="text-xs font-medium">{alert.title}</p><p className="mt-1 text-[10px] leading-4 opacity-70">{alert.detail}</p></div></div></div>):<Empty>No active dropshipping exceptions were detected from the linked Retail records.</Empty>}</div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-cyan-300"/><p className="text-xs font-medium text-white">Supplier & stock watch</p></div><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Critical" value={tower.metrics.criticalStockRisks}/><Metric label="High" value={tower.metrics.highStockRisks}/></div><div className="mt-3 space-y-2">{tower.demandSignals.slice(0,8).map(signal=><div key={signal.item_id} className="rounded-lg border border-white/[.07] p-3"><div className="flex items-center gap-2"><p className="text-[11px] font-medium text-zinc-200">{signal.name||'Product'}</p><span className="ml-auto text-[9px] uppercase text-zinc-600">{signal.risk}</span></div><p className="mt-1 text-[10px] leading-4 text-zinc-600">{signal.reason}</p></div>)}</div></div>
          <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-violet-300"/><p className="text-xs font-medium text-white">Marketplace linkage quality</p></div><p className="mt-3 text-2xl font-semibold text-white">{tower.metrics.unlinkedMarketplaceOrders}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Online/marketplace/social orders not linked to a Dropshipping Hub product are kept out of dropship KPIs instead of being silently mixed in. Link imported line items to authoritative catalog products before relying on automation.</p></div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-sky-300"/><p className="text-xs font-medium text-white">Fulfilment queue</p></div><div className="mt-3 space-y-2">{tower.fulfilmentQueue.slice(0,8).map(order=><div key={order.id} className="rounded-lg border border-white/[.07] p-3"><div className="flex items-center gap-2"><p className="text-[11px] text-zinc-200">{order.order_number||order.id}</p><span className="ml-auto text-[9px] text-zinc-600">{order.fulfilment_status||'unfulfilled'}</span></div><p className="mt-1 text-[10px] text-zinc-600">{order.customer_name||'Customer'} · {money(order.total)}</p></div>)}{!tower.fulfilmentQueue.length&&<Empty>No active dropship fulfilment records.</Empty>}</div></div>
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-fuchsia-300"/><p className="text-xs font-medium text-white">Returns & recovery</p></div><div className="mt-3 space-y-2">{tower.openReturns.slice(0,8).map(ret=><div key={ret.id} className="rounded-lg border border-white/[.07] p-3"><div className="flex items-center gap-2"><p className="text-[11px] text-zinc-200">{ret.return_number||ret.id}</p><span className="ml-auto text-[9px] text-zinc-600">{ret.status}</span></div><p className="mt-1 text-[10px] text-zinc-600">{ret.reason||'No reason recorded'}{ret.refund_amount?` · ${money(ret.refund_amount)}`:''}</p></div>)}{!tower.openReturns.length&&<Empty>No open dropship-linked returns.</Empty>}</div></div>
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-300"/><p className="text-xs font-medium text-white">Automation handoffs</p></div><p className="mt-2 text-[10px] leading-4 text-zinc-600">Use Blackstar's existing governed systems for execution. The Hub coordinates context; it does not bypass marketplace, supplier or financial approvals.</p><div className="mt-3 grid gap-2"><button onClick={()=>navigate('/retail-hub')} className="rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-zinc-300">Orders, returns & reorder execution</button><button onClick={()=>navigate('/commerce-studio')} className="rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-zinc-300">Commerce channels & listings</button><button onClick={()=>navigate('/agents')} className="rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-zinc-300">Dropshipping AI agents</button><button onClick={()=>navigate('/workflows')} className="rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-zinc-300"><Workflow className="mr-1 inline h-3 w-3"/>Governed workflows</button></div></div>
      </div>
    </>}
  </section>;
}
