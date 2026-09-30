import {useMemo,useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {ExternalLink,Loader2,Pencil,Plus,ShieldCheck,Trash2,Truck} from 'lucide-react';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {deleteDropshippingSupplierEvidence,saveDropshippingSupplierEvidence} from '@/lib/dropshipping/dropshipping-opportunities.functions';
import {supplierEvidenceSummary,supplierLandedCost} from '@/lib/dropshipping/dropshipping-opportunities';

const control='w-full rounded-lg border border-white/10 bg-[#0d0f15] px-2.5 py-2 text-[10px] text-white outline-none focus:border-sky-400/40';
const emptyDraft=(supplierId='')=>({id:'',retail_supplier_id:supplierId,supplier_sku:'',role:'candidate',currency:'GBP',unit_cost:'',shipping_cost:'',minimum_order_quantity:'',estimated_delivery_days:'',stock_status:'unknown',supplier_score:'',evidence_url:'',evidence_note:''});
const numberOrNull=value=>value===''||value==null?null:Number(value);
const evidenceUrl=offer=>{
  const first=Array.isArray(offer?.evidence_urls)?offer.evidence_urls[0]:null;
  return typeof first==='string'?first:typeof first?.url==='string'?first.url:'';
};

export default function DropshippingSupplierEvidence({opportunity,offers=[],suppliers=[],onChanged}){
  const {toast}=useToast();
  const saveFn=useServerFn(saveDropshippingSupplierEvidence);
  const deleteFn=useServerFn(deleteDropshippingSupplierEvidence);
  const eligibleSuppliers=useMemo(()=>suppliers.filter(supplier=>!opportunity.workspace_id||supplier.workspace_id===opportunity.workspace_id),[suppliers,opportunity.workspace_id]);
  const supplierMap=useMemo(()=>new Map(suppliers.map(supplier=>[supplier.id,supplier])),[suppliers]);
  const summary=useMemo(()=>supplierEvidenceSummary(offers),[offers]);
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(()=>emptyDraft());

  const reset=()=>{setDraft(emptyDraft(eligibleSuppliers[0]?.id||''));setEditing(false);};
  const startNew=()=>{setDraft(emptyDraft(eligibleSuppliers[0]?.id||''));setEditing(true);};
  const startEdit=offer=>{
    setDraft({
      id:offer.id,
      retail_supplier_id:offer.retail_supplier_id,
      supplier_sku:offer.supplier_sku||'',
      role:offer.role||'candidate',
      currency:offer.currency||'GBP',
      unit_cost:offer.unit_cost??'',
      shipping_cost:offer.shipping_cost??'',
      minimum_order_quantity:offer.minimum_order_quantity??'',
      estimated_delivery_days:offer.estimated_delivery_days??'',
      stock_status:offer.stock_status||'unknown',
      supplier_score:offer.supplier_score??'',
      evidence_url:evidenceUrl(offer),
      evidence_note:offer.evidence_note||'',
    });
    setEditing(true);
  };

  const save=useMutation({
    mutationFn:()=>saveFn({data:{
      id:draft.id||undefined,
      opportunity_id:opportunity.id,
      retail_supplier_id:draft.retail_supplier_id,
      supplier_sku:draft.supplier_sku||null,
      role:draft.role,
      currency:draft.currency||'GBP',
      unit_cost:numberOrNull(draft.unit_cost),
      shipping_cost:numberOrNull(draft.shipping_cost),
      minimum_order_quantity:numberOrNull(draft.minimum_order_quantity),
      estimated_delivery_days:numberOrNull(draft.estimated_delivery_days),
      stock_status:draft.stock_status,
      supplier_score:numberOrNull(draft.supplier_score),
      evidence_urls:draft.evidence_url?[draft.evidence_url]:[],
      evidence_note:draft.evidence_note||null,
    }}),
    onSuccess:()=>{toast({title:'Supplier evidence saved',description:'The offer is linked to the Retail supplier master and will be included in future opportunity snapshots.'});reset();onChanged?.();},
    onError:error=>toast({variant:'destructive',title:'Could not save supplier evidence',description:friendlyMessage(error)}),
  });

  const remove=useMutation({
    mutationFn:offer=>deleteFn({data:{id:offer.id,opportunity_id:opportunity.id}}),
    onSuccess:()=>{toast({title:'Supplier evidence removed'});onChanged?.();},
    onError:error=>toast({variant:'destructive',title:'Could not remove supplier evidence',description:friendlyMessage(error)}),
  });

  return <div className="mt-3 rounded-xl border border-sky-400/10 bg-sky-500/[.025] p-3">
    <div className="flex flex-wrap items-center gap-2">
      <Truck className="h-3.5 w-3.5 text-sky-300"/>
      <p className="text-[10px] font-medium text-zinc-300">Supplier evidence</p>
      <span className="text-[9px] text-zinc-600">{summary.count} active · {summary.backups} backup{summary.backups===1?'':'s'}</span>
      {summary.lowestLandedCost!=null&&<span className="text-[9px] text-emerald-300">lowest observed landed £{summary.lowestLandedCost.toLocaleString()}</span>}
      {summary.bestScore!=null&&<span className="text-[9px] text-sky-300">best score {summary.bestScore}</span>}
      <button onClick={startNew} disabled={!eligibleSuppliers.length} className="ml-auto rounded-lg border border-sky-400/20 px-2 py-1 text-[9px] text-sky-200 disabled:opacity-40"><Plus className="mr-1 inline h-3 w-3"/>Add supplier</button>
    </div>

    {!eligibleSuppliers.length&&<p className="mt-2 text-[9px] leading-4 text-amber-300/80">Create a supplier in the linked Retail workspace first. Dropshipping keeps Retail as the supplier master instead of duplicating supplier identities.</p>}

    {!!offers.length&&<div className="mt-2 grid gap-2">{offers.map(offer=>{
      const supplier=supplierMap.get(offer.retail_supplier_id);
      const landed=supplierLandedCost(offer);
      const firstUrl=evidenceUrl(offer);
      const offerClass=offer.role==='primary'?'border-emerald-400/20 bg-emerald-400/[.035]':offer.role==='backup'?'border-sky-400/15 bg-sky-400/[.025]':'border-white/[.06] bg-black/15';
      return <div key={offer.id} className={'rounded-lg border px-3 py-2 '+offerClass}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-zinc-200">{supplier?.name||'Retail supplier'}</p>
            <p className="mt-0.5 text-[9px] text-zinc-600">{offer.role} · {(offer.stock_status||'unknown').replaceAll('_',' ')}{offer.supplier_sku?' · SKU '+offer.supplier_sku:''}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={()=>startEdit(offer)} className="rounded-md border border-white/10 p-1 text-zinc-400" aria-label="Edit supplier evidence"><Pencil className="h-3 w-3"/></button>
            <button onClick={()=>remove.mutate(offer)} disabled={remove.isPending} className="rounded-md border border-rose-400/15 p-1 text-rose-300 disabled:opacity-40" aria-label="Delete supplier evidence"><Trash2 className="h-3 w-3"/></button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-zinc-500">
          {offer.unit_cost!=null&&<span>unit {offer.currency||'GBP'} {Number(offer.unit_cost).toLocaleString()}</span>}
          {offer.shipping_cost!=null&&<span>shipping {offer.currency||'GBP'} {Number(offer.shipping_cost).toLocaleString()}</span>}
          {landed!=null&&<span className="text-zinc-300">landed {offer.currency||'GBP'} {landed.toLocaleString()}</span>}
          {offer.estimated_delivery_days!=null&&<span>{offer.estimated_delivery_days}d delivery</span>}
          {offer.minimum_order_quantity!=null&&<span>MOQ {offer.minimum_order_quantity}</span>}
          {offer.supplier_score!=null&&<span>score {Number(offer.supplier_score).toFixed(0)}</span>}
        </div>
        {offer.evidence_note&&<p className="mt-1.5 line-clamp-2 text-[9px] leading-4 text-zinc-500">{offer.evidence_note}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-zinc-600">
          <ShieldCheck className="h-3 w-3 text-emerald-300/70"/><span>Retail-master linked</span>
          {firstUrl&&<a href={firstUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">Evidence <ExternalLink className="ml-0.5 inline h-2.5 w-2.5"/></a>}
          {offer.observed_at&&<span>observed {new Date(offer.observed_at).toLocaleDateString()}</span>}
        </div>
      </div>;
    })}</div>}

    {editing&&<div className="mt-3 rounded-lg border border-white/[.07] bg-black/20 p-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <select className={control} value={draft.retail_supplier_id} onChange={e=>setDraft({...draft,retail_supplier_id:e.target.value})}>
          <option value="">Choose Retail supplier</option>
          {eligibleSuppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.name+(supplier.status!=='active'?' · '+supplier.status:'')}</option>)}
        </select>
        <select className={control} value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>
          <option value="candidate">Candidate</option><option value="primary">Primary</option><option value="backup">Backup</option><option value="rejected">Rejected</option>
        </select>
        <input className={control} placeholder="Supplier SKU" value={draft.supplier_sku} onChange={e=>setDraft({...draft,supplier_sku:e.target.value})}/>
        <input className={control} placeholder="Currency" value={draft.currency} maxLength={8} onChange={e=>setDraft({...draft,currency:e.target.value.toUpperCase()})}/>
        <input className={control} type="number" min="0" step="0.01" placeholder="Unit cost" value={draft.unit_cost} onChange={e=>setDraft({...draft,unit_cost:e.target.value})}/>
        <input className={control} type="number" min="0" step="0.01" placeholder="Shipping cost" value={draft.shipping_cost} onChange={e=>setDraft({...draft,shipping_cost:e.target.value})}/>
        <input className={control} type="number" min="0" step="1" placeholder="Delivery days" value={draft.estimated_delivery_days} onChange={e=>setDraft({...draft,estimated_delivery_days:e.target.value})}/>
        <input className={control} type="number" min="0" step="1" placeholder="Minimum order qty" value={draft.minimum_order_quantity} onChange={e=>setDraft({...draft,minimum_order_quantity:e.target.value})}/>
        <select className={control} value={draft.stock_status} onChange={e=>setDraft({...draft,stock_status:e.target.value})}>
          <option value="unknown">Stock unknown</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="backorder">Backorder</option>
        </select>
        <input className={control} type="number" min="0" max="100" step="1" placeholder="Supplier score 0–100" value={draft.supplier_score} onChange={e=>setDraft({...draft,supplier_score:e.target.value})}/>
        <input className={control+' sm:col-span-2'} placeholder="Public evidence URL" value={draft.evidence_url} onChange={e=>setDraft({...draft,evidence_url:e.target.value})}/>
        <textarea className={control+' min-h-16 sm:col-span-2 xl:col-span-4'} placeholder="Observed price, stock, delivery or supplier evidence. Do not paste credentials." value={draft.evidence_note} onChange={e=>setDraft({...draft,evidence_note:e.target.value})}/>
      </div>
      <div className="mt-2 flex gap-2">
        <button disabled={!draft.retail_supplier_id||save.isPending} onClick={()=>save.mutate()} className="rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-medium text-white disabled:opacity-40">{save.isPending?<Loader2 className="mr-1 inline h-3 w-3 animate-spin"/>:null}{draft.id?'Update offer':'Save offer'}</button>
        <button onClick={reset} className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400">Cancel</button>
      </div>
    </div>}
  </div>;
}
