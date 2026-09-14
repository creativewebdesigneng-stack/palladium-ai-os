import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {CheckCircle2,ExternalLink,Link2,Loader2,RefreshCw,ShieldCheck,Store,Truck,Unplug} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {getDropshippingReadiness} from '@/lib/dropshipping/dropshipping-readiness.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const statusStyle={native:'border-violet-400/25 bg-violet-500/[.06] text-violet-200',ready:'border-emerald-400/25 bg-emerald-500/[.05] text-emerald-200',configured:'border-amber-400/25 bg-amber-500/[.05] text-amber-200',needs_connection:'border-white/[.08] bg-black/20 text-zinc-500'};
const statusLabel={native:'native',ready:'executable',configured:'configured',needs_connection:'connect'};

function TargetCard({target}){
  const actions=target.actions??[];
  return <div className={`rounded-xl border p-4 ${statusStyle[target.status]||statusStyle.needs_connection}`}>
    <div className="flex items-start gap-2"><div className="min-w-0"><p className="truncate text-xs font-medium text-white">{target.label}</p><p className="mt-1 text-[9px] uppercase tracking-[.12em] opacity-60">{target.kind}</p></div><span className="ml-auto rounded-md border border-current/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">{statusLabel[target.status]||target.status}</span></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg border border-white/[.06] bg-black/20 p-2"><p className="text-sm font-semibold text-white">{target.deployedActions}</p><p className="text-[8px] text-zinc-600">actions</p></div><div className="rounded-lg border border-white/[.06] bg-black/20 p-2"><p className="text-sm font-semibold text-white">{target.readActions}</p><p className="text-[8px] text-zinc-600">reads</p></div><div className="rounded-lg border border-white/[.06] bg-black/20 p-2"><p className="text-sm font-semibold text-white">{target.governedActions}</p><p className="text-[8px] text-zinc-600">governed</p></div></div>
    {target.providerIds?.length>0&&<p className="mt-2 truncate text-[9px] text-zinc-600">Runtime: {target.providerIds.join(', ')}</p>}
    {actions.length>0?<div className="mt-3 space-y-1.5">{actions.slice(0,4).map(action=><div key={`${action.provider}:${action.action}`} className="rounded-lg border border-white/[.06] bg-black/20 px-2.5 py-2"><div className="flex items-center gap-2"><p className="truncate text-[9px] text-zinc-300">{action.action}</p>{action.requiresApproval&&<ShieldCheck className="ml-auto h-3 w-3 shrink-0 text-amber-300"/>}</div></div>)}{actions.length>4&&<p className="text-[9px] text-zinc-600">+{actions.length-4} more live capabilities</p>}</div>:<p className="mt-3 text-[10px] leading-4 text-zinc-600">No executable capability is currently advertised for this account.</p>}
  </div>;
}

export default function DropshippingConnectionMatrix(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const readinessFn=useServerFn(getDropshippingReadiness);
  const query=useQuery({queryKey:['dropshipping-live-readiness'],queryFn:()=>readinessFn(),enabled:session==='yes',retry:false,staleTime:30_000});
  if(session==='no')return null;
  const data=query.data;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10"><Link2 className="h-4 w-4 text-emerald-300"/></span><div><h2 className="text-sm font-semibold text-white">Live channel & supplier readiness</h2><p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">This matrix is generated from Blackstar's authenticated integration capability runtime, not a static partner logo list. A channel is marked executable only when the connected account advertises a deployed action. High-impact writes remain approval-gated.</p></div></div>
      <div className="flex gap-2"><button onClick={()=>query.refetch()} disabled={query.isFetching} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">{query.isFetching?<Loader2 className="mr-1 inline h-3 w-3 animate-spin"/>:<RefreshCw className="mr-1 inline h-3 w-3"/>}Refresh</button><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-emerald-400/20 px-3 py-2 text-xs text-emerald-200">Manage Integrations <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>
    </div>

    {query.error&&<div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/[.05] p-3 text-xs text-rose-200">{friendlyMessage(query.error)}</div>}
    {query.isLoading&&<div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin"/>Inspecting live integration capabilities…</div>}

    {data&&<>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><div className="rounded-xl border border-violet-400/20 bg-violet-500/[.04] p-3"><p className="text-[9px] uppercase text-violet-300">Native</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.native}</p></div><div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.04] p-3"><p className="text-[9px] uppercase text-emerald-300">Executable</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.ready}</p></div><div className="rounded-xl border border-amber-400/20 bg-amber-500/[.04] p-3"><p className="text-[9px] uppercase text-amber-300">Configured</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.configured}</p></div><div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[9px] uppercase text-zinc-600">Need connection</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.needsConnection}</p></div><div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[9px] uppercase text-zinc-600">Live actions</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.deployedActions}</p></div><div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[9px] uppercase text-zinc-600">Approval actions</p><p className="mt-1 text-xl font-semibold text-white">{data.summary.governedActions}</p></div></div>

      <div className="mt-5"><div className="flex items-center gap-2"><Store className="h-4 w-4 text-violet-300"/><h3 className="text-xs font-semibold text-white">Sales channels</h3></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.channels.map(target=><TargetCard key={target.id} target={target}/>)}</div></div>
      <div className="mt-5"><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-cyan-300"/><h3 className="text-xs font-semibold text-white">Suppliers, fulfilment & shipping</h3></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.suppliers.map(target=><TargetCard key={target.id} target={target}/>)}</div></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.03] p-3 text-[10px] leading-5 text-zinc-500"><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-300"/>Shopify and Etsy can surface bounded built-in Blackstar actions when the user's corresponding connection exists. Other providers are exposed only when their actual connected integration advertises capabilities.</div><div className="rounded-xl border border-white/[.08] bg-black/20 p-3 text-[10px] leading-5 text-zinc-600"><Unplug className="mr-1 inline h-3 w-3"/>“Need connection” does not mean unsupported forever; it means Blackstar currently has no executable capability evidence for this account/provider. Credentials remain in Integrations and are never entered into the Dropshipping Hub.</div></div>
    </>}
  </section>;
}
