import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Loader2, RotateCcw, Save, Trash2 } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import {
  deleteRetailReturnItem,
  processRetailReturnRestock,
  saveRetailReturnItem,
} from '@/lib/retail/retail-service-automation.functions';

const emptyLine=(returnId='')=>({
  return_id:returnId,
  item_id:'',
  location_id:'',
  quantity:'1',
  condition:'sellable',
  disposition:'restock',
  notes:'',
});

export default function RetailReturnRestocking({ workspaceId, data, onChanged }) {
  const saveFn=useServerFn(saveRetailReturnItem);
  const deleteFn=useServerFn(deleteRetailReturnItem);
  const processFn=useServerFn(processRetailReturnRestock);
  const eligibleReturns=useMemo(
    ()=>(data?.returns??[]).filter(item=>item.restock&&['received','refunded'].includes(item.status)),
    [data?.returns],
  );
  const [line,setLine]=useState(emptyLine(eligibleReturns[0]?.id??''));
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!eligibleReturns.some(item=>item.id===line.return_id)){
      setLine(emptyLine(eligibleReturns[0]?.id??''));
    }
  },[eligibleReturns,line.return_id]);

  const catalog=(data?.catalog??[]).filter(item=>item.track_inventory&&item.item_type!=='service');
  const locations=data?.locations??[];
  const returnItems=data?.returnItems??[];
  const itemName=id=>catalog.find(item=>item.id===id)?.name??'Item';
  const locationName=id=>locations.find(item=>item.id===id)?.name??'No location';
  const linesFor=id=>returnItems.filter(item=>item.return_id===id);

  async function run(key,fn){
    setBusy(key);setError('');
    try{return await fn();}
    catch(err){setError(friendlyMessage(err));throw err;}
    finally{setBusy('');}
  }

  async function saveLine(){
    if(!line.return_id||!line.item_id||busy)return;
    await run('save',async()=>{
      await saveFn({data:{
        workspace_id:workspaceId,
        return_id:line.return_id,
        item_id:line.item_id,
        location_id:line.location_id||null,
        quantity:Number(line.quantity),
        condition:line.condition,
        disposition:line.disposition,
        notes:line.notes,
      }});
      setLine(current=>emptyLine(current.return_id));
      await onChanged?.();
    });
  }

  async function remove(id){
    await run(`delete-${id}`,async()=>{await deleteFn({data:{id}});await onChanged?.();});
  }

  async function process(returnId){
    await run(`process-${returnId}`,async()=>{await processFn({data:{return_id:returnId}});await onChanged?.();});
  }

  return <div className="mt-5 grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
    <section className="rounded-2xl border border-white/[.06] bg-black/25 p-4">
      <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-semibold text-white">Return inspection line</h3></div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-600">Record what physically came back. Only a received/refunded return marked for restocking, with a <strong className="text-zinc-400">sellable + restock</strong> line and an active location, can increase stock.</p>
      {!eligibleReturns.length?<Empty text="No received/refunded return marked for restocking is ready."/>:<>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Return"><select className="retail-input" value={line.return_id} onChange={e=>setLine({...line,return_id:e.target.value})}>{eligibleReturns.map(item=><option key={item.id} value={item.id}>{item.return_number} · {item.customer_name||'Customer'}</option>)}</select></Field>
          <Field label="Tracked item"><select className="retail-input" value={line.item_id} onChange={e=>setLine({...line,item_id:e.target.value})}><option value="">Select item</option>{catalog.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Restock location"><select className="retail-input" value={line.location_id} onChange={e=>setLine({...line,location_id:e.target.value})}><option value="">Select location</option>{locations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Quantity"><input className="retail-input" type="number" min="0.001" step="0.001" value={line.quantity} onChange={e=>setLine({...line,quantity:e.target.value})}/></Field>
          <Field label="Condition"><select className="retail-input" value={line.condition} onChange={e=>setLine({...line,condition:e.target.value})}>{['sellable','opened','damaged','defective','unknown'].map(value=><option key={value} value={value}>{value}</option>)}</select></Field>
          <Field label="Disposition"><select className="retail-input" value={line.disposition} onChange={e=>setLine({...line,disposition:e.target.value})}>{['restock','quarantine','discard','return_to_supplier','inspect'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></Field>
        </div>
        <Field label="Inspection notes" className="mt-3"><textarea className="retail-input min-h-24 py-2" value={line.notes} onChange={e=>setLine({...line,notes:e.target.value})}/></Field>
        <button onClick={saveLine} disabled={busy==='save'||!line.item_id||!line.return_id||Number(line.quantity)<=0} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-100 disabled:opacity-35">{busy==='save'?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save inspected line</button>
      </>}
      {error&&<p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.04] p-3 text-xs text-rose-200">{error}</p>}
    </section>

    <section className="rounded-2xl border border-white/[.06] bg-black/25 p-4">
      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><h3 className="text-sm font-semibold text-white">Atomic restock processing</h3></div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-600">Processing locks the return and eligible lines, increases on-hand inventory, writes a <code>return</code> inventory movement, and marks each line processed in the same database transaction.</p>
      <div className="mt-4 space-y-3">{eligibleReturns.length?eligibleReturns.map(ret=>{
        const lines=linesFor(ret.id);
        const eligible=lines.filter(item=>item.condition==='sellable'&&item.disposition==='restock'&&item.location_id&&Number(item.processed_quantity)<Number(item.quantity));
        return <article key={ret.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-white">{ret.return_number} · {ret.customer_name||'Customer'}</p><p className="mt-1 text-[10px] text-zinc-600">{ret.status} · {lines.length} inspected · {eligible.length} eligible</p></div><button onClick={()=>process(ret.id)} disabled={!eligible.length||busy===`process-${ret.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[10px] text-emerald-200 disabled:opacity-35">{busy===`process-${ret.id}`?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<CheckCircle2 className="h-3.5 w-3.5"/>}Process restock</button></div>
          <div className="mt-3 space-y-2">{lines.length?lines.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[.05] px-3 py-2 text-[10px]"><div><span className="text-zinc-300">{itemName(item.item_id)}</span><span className="text-zinc-600"> · {locationName(item.location_id)} · {Number(item.quantity).toFixed(3)} · {item.condition}/{item.disposition}</span>{Number(item.processed_quantity)>0&&<span className="ml-1 text-emerald-300">· processed {Number(item.processed_quantity).toFixed(3)}</span>}</div>{Number(item.processed_quantity)===0&&<button onClick={()=>remove(item.id)} disabled={busy===`delete-${item.id}`} className="text-zinc-600 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button>}</div>):<p className="text-[10px] text-zinc-600">No inspected lines yet.</p>}</div>
        </article>;
      }):<Empty text="No restockable returns are currently ready."/>}</div>
    </section>
  </div>;
}

function Field({label,className='',children}){return <label className={className}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>;}
function Empty({text}){return <div className="mt-4 rounded-xl border border-dashed border-white/[.07] p-6 text-center text-xs text-zinc-600">{text}</div>;}
