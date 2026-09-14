import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import ReactMarkdown from 'react-markdown';
import {ExternalLink,FilePenLine,Loader2,Save,Send,ShieldAlert,Sparkles} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {assistantChat} from '@/lib/ai/assistant.functions';
import {DROPSHIP_CHANNELS} from '@/lib/dropshipping/dropshipping';
import {buildDropshippingActionInputTemplate,buildListingDraftPrompt,isDropshipProductBlocked} from '@/lib/dropshipping/dropshipping-listings';
import {getDropshippingListingCapabilities,queueDropshippingListingApproval,saveDropshippingListingDraft} from '@/lib/dropshipping/dropshipping-listings.functions';
import {getRetailOperations,listRetailWorkspaces} from '@/lib/retail/retail-operations.functions';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';

export default function DropshippingListingWorkbench(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const listWorkspacesFn=useServerFn(listRetailWorkspaces);
  const getOperationsFn=useServerFn(getRetailOperations);
  const assistantFn=useServerFn(assistantChat);
  const saveDraftFn=useServerFn(saveDropshippingListingDraft);
  const listingCapabilitiesFn=useServerFn(getDropshippingListingCapabilities);
  const queueApprovalFn=useServerFn(queueDropshippingListingApproval);
  const [workspaceId,setWorkspaceId]=useState('');
  const [itemId,setItemId]=useState('');
  const [channel,setChannel]=useState('shopify');
  const [locale,setLocale]=useState('en-GB');
  const [notes,setNotes]=useState('');
  const [draftText,setDraftText]=useState('');
  const [provider,setProvider]=useState('');
  const [model,setModel]=useState('');
  const [generating,setGenerating]=useState(false);
  const [saving,setSaving]=useState(false);
  const [publishAction,setPublishAction]=useState('');
  const [publishInput,setPublishInput]=useState('{}');
  const [queueing,setQueueing]=useState(false);

  const workspaces=useQuery({queryKey:['dropship-listing-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerceWorkspaces=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerceWorkspaces.length)setWorkspaceId(ecommerceWorkspaces[0].id)},[workspaceId,ecommerceWorkspaces]);

  const operations=useQuery({queryKey:['dropship-listing-operations',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const products=useMemo(()=>((operations.data?.catalog??[]).filter(item=>item.metadata?.source==='dropshipping-hub')),[operations.data?.catalog]);
  const listingCapabilities=useQuery({queryKey:['dropship-listing-capabilities',channel],queryFn:()=>listingCapabilitiesFn({data:{channel}}),enabled:session==='yes'&&channel!=='blackstar-site',retry:false,staleTime:30_000});
  const publishCapabilities=useMemo(()=>((listingCapabilities.data??[]).filter(cap=>cap.deployed&&(cap.requiresApproval||cap.risk!=='low'))),[listingCapabilities.data]);
  useEffect(()=>{if(products.length&&!products.some(item=>item.id===itemId))setItemId(products[0].id);if(!products.length)setItemId('')},[products,itemId]);
  const selected=useMemo(()=>products.find(item=>item.id===itemId)??null,[products,itemId]);
  const blocked=selected?isDropshipProductBlocked(selected):false;
  const savedDraft=selected?.metadata?.listing_drafts?.[channel];

  useEffect(()=>{
    if(!selected)return;
    const preferred=selected.metadata?.channel;
    if(typeof preferred==='string'&&DROPSHIP_CHANNELS.some(row=>row.id===preferred))setChannel(preferred);
  },[selected?.id]);

  useEffect(()=>{
    const record=selected?.metadata?.listing_drafts?.[channel];
    if(record&&typeof record==='object'){
      setDraftText(typeof record.text==='string'?record.text:'');
      setProvider(typeof record.provider==='string'?record.provider:'');
      setModel(typeof record.model==='string'?record.model:'');
    }else{setDraftText('');setProvider('');setModel('');}
  },[selected?.id,channel,selected?.metadata?.listing_drafts]);


  const selectPublishAction=(key)=>{
    setPublishAction(key);
    const capability=publishCapabilities.find(cap=>`${cap.provider}:${cap.action}`===key);
    if(!capability||!selected){setPublishInput('{}');return;}
    const template=buildDropshippingActionInputTemplate(capability.inputSchema,selected,savedDraft?.text||draftText);
    setPublishInput(JSON.stringify(template,null,2));
  };

  useEffect(()=>{
    const current=publishCapabilities.find(cap=>`${cap.provider}:${cap.action}`===publishAction);
    if(current)return;
    const first=publishCapabilities[0];
    if(!first){setPublishAction('');setPublishInput('{}');return;}
    const key=`${first.provider}:${first.action}`;
    setPublishAction(key);
    if(selected)setPublishInput(JSON.stringify(buildDropshippingActionInputTemplate(first.inputSchema,selected,savedDraft?.text||draftText),null,2));
  },[channel,publishCapabilities,selected?.id,savedDraft?.generated_at]);

  const queuePublication=async()=>{
    if(!selected||!workspaceId||!savedDraft||!publishAction||queueing)return;
    const capability=publishCapabilities.find(cap=>`${cap.provider}:${cap.action}`===publishAction);
    if(!capability)return;
    let actionInput;
    try{
      actionInput=JSON.parse(publishInput||'{}');
      if(!actionInput||typeof actionInput!=='object'||Array.isArray(actionInput))throw new Error('Payload must be a JSON object.');
    }catch(error){
      toast({variant:'destructive',title:'Invalid provider payload',description:error instanceof Error?error.message:'Enter a valid JSON object.'});
      return;
    }
    setQueueing(true);
    try{
      const result=await queueApprovalFn({data:{workspace_id:workspaceId,item_id:selected.id,channel,provider:capability.provider,action:capability.action,action_input:actionInput}});
      toast({title:'Publication approval queued',description:`${result.provider} · ${result.action} is waiting in Mission Control. No provider write has happened yet.`});
    }catch(error){
      toast({variant:'destructive',title:'Could not queue publication approval',description:friendlyMessage(error)});
    }finally{setQueueing(false);}
  };

  const persist=async(text,nextProvider=provider,nextModel=model,{quiet=false}={})=>{
    if(!selected||!workspaceId||!text.trim())return;
    setSaving(true);
    try{
      await saveDraftFn({data:{workspace_id:workspaceId,item_id:selected.id,channel,text:text.trim(),...(nextProvider?{provider:nextProvider}:{}),...(nextModel?{model:nextModel}:{})}});
      await qc.invalidateQueries({queryKey:['dropship-listing-operations',workspaceId]});
      await qc.invalidateQueries({queryKey:['dropshipping-retail-operations',workspaceId]});
      if(!quiet)toast({title:'Listing draft saved',description:`The ${channel} draft is stored on the durable product record. It has not been published.`});
    }catch(error){toast({variant:'destructive',title:'Could not save listing draft',description:friendlyMessage(error)});throw error;}finally{setSaving(false);}
  };

  const generate=async()=>{
    if(!selected||blocked||generating)return;
    setGenerating(true);
    try{
      const prompt=buildListingDraftPrompt(selected,channel,locale,notes);
      const result=await assistantFn({data:{message:prompt,history:[]}});
      setDraftText(result.text);setProvider(result.provider);setModel(result.model);
      try{await persist(result.text,result.provider,result.model,{quiet:true});toast({title:'Grounded listing draft generated',description:`Drafted for ${channel} and persisted to the product record. Publication still requires a separate approved provider action.`});}catch{/* persist already surfaced the error; keep generated text editable in this session */}
    }catch(error){toast({variant:'destructive',title:'Could not generate listing draft',description:friendlyMessage(error)});}finally{setGenerating(false);}
  };

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10"><FilePenLine className="h-4 w-4 text-fuchsia-300"/></span><div><h2 className="text-sm font-semibold text-white">Multi-channel listing workbench</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Generate channel-specific copy from a saved product's evidence, compliance and economics snapshot. Drafts persist on the Retail Operations catalog record; no button here can publish, change price, spend money or place a supplier order.</p></div></div><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Provider connections <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="text-xs font-medium text-white">Draft source</p><label className="mt-3 block"><span className={label}>Operations workspace</span><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setItemId('')}}><option value="">Select workspace</option>{ecommerceWorkspaces.map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select></label><label className="mt-3 block"><span className={label}>Persisted product</span><select className={control} value={itemId} onChange={e=>setItemId(e.target.value)} disabled={!workspaceId||operations.isFetching}><option value="">Select product</option>{products.map(item=><option key={item.id} value={item.id}>{item.name} · {item.metadata?.lifecycle_stage||'saved'}</option>)}</select></label>{operations.isFetching&&<p className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading durable product records…</p>}{operations.error&&<p className="mt-3 text-[11px] text-rose-300">{friendlyMessage(operations.error)}</p>}</div>

        {selected&&<div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="text-xs font-medium text-white">{selected.name}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">{selected.metadata?.lifecycle_stage||'saved'} · {selected.metadata?.fulfilment_model||'model n/a'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-500"><span>Price {selected.sale_price??'—'} {selected.currency}</span><span>Margin {selected.metadata?.unit_economics?.marginPct??'—'}%</span><span>Opportunity {selected.metadata?.opportunity_score??'—'}</span><span>Supplier {selected.metadata?.supplier_score??'—'}</span></div>{selected.metadata?.evidence?.url&&<a href={selected.metadata.evidence.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-300">Open evidence <ExternalLink className="h-3 w-3"/></a>}</div>}

        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><label className="block"><span className={label}>Target channel</span><select className={control} value={channel} onChange={e=>setChannel(e.target.value)}>{DROPSHIP_CHANNELS.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label className="mt-3 block"><span className={label}>Locale</span><input className={control} value={locale} maxLength={40} onChange={e=>setLocale(e.target.value)} placeholder="en-GB"/></label><label className="mt-3 block"><span className={label}>Operator instructions</span><textarea className={`${control} min-h-20`} value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} placeholder="Tone, audience, positioning. Treat these as instructions, not verified product facts."/></label></div>

        {blocked&&<div className="rounded-xl border border-red-400/20 bg-red-500/[.04] p-4"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-300"/><p className="text-xs font-medium text-red-300">Compliance block</p></div><p className="mt-2 text-[10px] leading-4 text-zinc-500">This product cannot enter the listing-draft flow until its persisted compliance block is resolved. Blackstar will not generate launch copy around a known blocker.</p></div>}
      </aside>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><button disabled={!selected||blocked||generating||saving} onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{generating?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{generating?'Generating grounded draft…':'Generate & persist draft'}</button><button disabled={!selected||blocked||!draftText.trim()||saving||generating} onClick={()=>persist(draftText)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save revision</button>{savedDraft&&<span className="ml-auto text-[9px] uppercase tracking-wide text-zinc-600">stored draft · approval required</span>}</div><textarea className={`${control} mt-4 min-h-[360px] font-mono leading-5`} value={draftText} onChange={e=>setDraftText(e.target.value)} placeholder="Choose a saved product and generate a grounded channel draft, or edit an existing persisted draft."/><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600">{provider&&<span>Provider: {provider}</span>}{model&&<span>Model: {model}</span>}<span>Maximum persisted draft: 16,000 characters</span></div></div>

        {draftText&&<div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="mb-3 text-xs font-medium text-white">Draft preview</p><div className="prose-chat text-xs leading-6 text-zinc-300"><ReactMarkdown>{draftText}</ReactMarkdown></div></div>}

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.035] p-4">
          <div className="flex flex-wrap items-start gap-3"><div><p className="text-[11px] font-medium text-emerald-200">Approved provider publication</p><p className="mt-1 max-w-3xl text-[10px] leading-5 text-zinc-500">Select a live governed capability from the connected ${channel} provider. Blackstar validates the exact JSON input through the provider adapter, pins the transport, and queues it in Mission Control. The provider write occurs only after approval.</p></div><button onClick={()=>navigate('/mission-control')} className="ml-auto rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-300">Mission Control <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>
          {channel==='blackstar-site'?<p className="mt-3 text-[10px] text-zinc-500">Website Studio uses its native publish workflow, so marketplace action approval is not used for this target.</p>:listingCapabilities.isFetching?<p className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Discovering live provider actions…</p>:listingCapabilities.error?<p className="mt-3 text-[10px] text-rose-300">{friendlyMessage(listingCapabilities.error)}</p>:publishCapabilities.length===0?<p className="mt-3 text-[10px] leading-5 text-amber-200/80">No deployed governed write capability is currently advertised for this channel. Connect or authorize a provider action in Integrations before trying to publish.</p>:<>
            <label className="mt-3 block"><span className={label}>Live governed action</span><select className={control} value={publishAction} onChange={e=>selectPublishAction(e.target.value)}>{publishCapabilities.map(cap=><option key={`${cap.provider}:${cap.action}`} value={`${cap.provider}:${cap.action}`}>{cap.provider} · {cap.action} · {cap.risk}</option>)}</select></label>
            {publishCapabilities.find(cap=>`${cap.provider}:${cap.action}`===publishAction)&&<div className="mt-3 grid gap-3 xl:grid-cols-2"><div><span className={label}>Exact provider action input</span><textarea className={`${control} min-h-48 font-mono leading-5`} value={publishInput} onChange={e=>setPublishInput(e.target.value)}/><button onClick={()=>selectPublishAction(publishAction)} disabled={!selected} className="mt-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400 disabled:opacity-40">Rebuild from product evidence</button></div><div><span className={label}>Provider input schema</span><pre className="max-h-48 overflow-auto rounded-xl border border-white/[.08] bg-black/30 p-3 text-[9px] leading-4 text-zinc-500">{JSON.stringify(publishCapabilities.find(cap=>`${cap.provider}:${cap.action}`===publishAction)?.inputSchema??{},null,2)}</pre></div></div>}
            <button disabled={!selected||blocked||!savedDraft||!publishAction||queueing} onClick={queuePublication} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{queueing?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}{queueing?'Validating & queueing…':'Queue exact action for approval'}</button>
          </>}
        </div>

        <div className="rounded-xl border border-amber-400/15 bg-amber-500/[.035] p-4"><p className="text-[11px] font-medium text-amber-200">Publication boundary</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">Draft generation never publishes. Marketplace/store execution only uses a live connected capability after Mission Control approval. The approval record locks the prepared provider, action, input and transport so the UI cannot change them after review.</p></div>
      </div>
    </div>
  </section>;
}
