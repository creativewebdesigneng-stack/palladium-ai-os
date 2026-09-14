import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import ReactMarkdown from 'react-markdown';
import {ExternalLink,FilePenLine,Loader2,Save,Send,ShieldAlert,ShieldCheck,Sparkles} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {assistantChat} from '@/lib/ai/assistant.functions';
import {DROPSHIP_CHANNELS} from '@/lib/dropshipping/dropshipping';
import {buildListingDraftPrompt,isDropshipProductBlocked} from '@/lib/dropshipping/dropshipping-listings';
import {getDropshippingListingApproval,requestDropshippingListingApproval,saveDropshippingListingDraft} from '@/lib/dropshipping/dropshipping-listings.functions';
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
  const requestApprovalFn=useServerFn(requestDropshippingListingApproval);
  const getApprovalFn=useServerFn(getDropshippingListingApproval);
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
  const [requesting,setRequesting]=useState(false);
  const [etsy,setEtsy]=useState({shop_id:'',quantity:'1',who_made:'someone_else',when_made:'2020_2026',taxonomy_id:'',shipping_profile_id:'',readiness_state_id:''});

  const workspaces=useQuery({queryKey:['dropship-listing-workspaces'],queryFn:()=>listWorkspacesFn({data:undefined}),enabled:session==='yes',retry:false});
  const ecommerceWorkspaces=useMemo(()=>((workspaces.data??[]).filter(row=>['ecommerce','mixed'].includes(row.business_type))),[workspaces.data]);
  useEffect(()=>{if(!workspaceId&&ecommerceWorkspaces.length)setWorkspaceId(ecommerceWorkspaces[0].id)},[workspaceId,ecommerceWorkspaces]);

  const operations=useQuery({queryKey:['dropship-listing-operations',workspaceId],queryFn:()=>getOperationsFn({data:{workspace_id:workspaceId}}),enabled:session==='yes'&&Boolean(workspaceId),retry:false});
  const products=useMemo(()=>((operations.data?.catalog??[]).filter(item=>item.metadata?.source==='dropshipping-hub')),[operations.data?.catalog]);
  useEffect(()=>{if(products.length&&!products.some(item=>item.id===itemId))setItemId(products[0].id);if(!products.length)setItemId('')},[products,itemId]);
  const selected=useMemo(()=>products.find(item=>item.id===itemId)??null,[products,itemId]);
  const blocked=selected?isDropshipProductBlocked(selected):false;
  const savedDraft=selected?.metadata?.listing_drafts?.[channel];
  const serverDraftMatches=Boolean(savedDraft&&typeof savedDraft.text==='string'&&savedDraft.text.trim()===draftText.trim());
  const validatedForChannel=Boolean(selected&&selected.metadata?.channel===channel&&selected.metadata?.compliance?.allowed===true);
  const boundedWriter=['shopify','etsy'].includes(channel);
  const etsyReady=channel!=='etsy'||(Number(etsy.shop_id)>0&&Number(etsy.taxonomy_id)>0&&Number(etsy.quantity)>0&&Boolean(etsy.when_made.trim()));

  const approval=useQuery({
    queryKey:['dropshipping-listing-approval',workspaceId,itemId,channel,savedDraft?.approval_request_id??'none'],
    queryFn:()=>getApprovalFn({data:{workspace_id:workspaceId,item_id:itemId,channel}}),
    enabled:session==='yes'&&Boolean(workspaceId&&itemId&&savedDraft?.approval_request_id),retry:false,refetchInterval:query=>{
      const row=query.state.data;
      return row?.status==='pending'||row?.execution_status==='executing'?5000:false;
    },
  });

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

  const persist=async(text,nextProvider=provider,nextModel=model,{quiet=false}={})=>{
    if(!selected||!workspaceId||!text.trim())return;
    setSaving(true);
    try{
      await saveDraftFn({data:{workspace_id:workspaceId,item_id:selected.id,channel,text:text.trim(),...(nextProvider?{provider:nextProvider}:{}),...(nextModel?{model:nextModel}:{})}});
      await qc.invalidateQueries({queryKey:['dropship-listing-operations',workspaceId]});
      await qc.invalidateQueries({queryKey:['dropshipping-retail-operations',workspaceId]});
      await qc.invalidateQueries({queryKey:['dropshipping-listing-approval',workspaceId,itemId,channel]});
      if(!quiet)toast({title:'Listing draft saved',description:`The ${channel} draft is stored on the durable product record. Any older pending approval was invalidated.`});
    }catch(error){toast({variant:'destructive',title:'Could not save listing draft',description:friendlyMessage(error)});throw error;}finally{setSaving(false);}
  };

  const generate=async()=>{
    if(!selected||blocked||generating)return;
    setGenerating(true);
    try{
      const prompt=buildListingDraftPrompt(selected,channel,locale,notes);
      const result=await assistantFn({data:{message:prompt,history:[]}});
      setDraftText(result.text);setProvider(result.provider);setModel(result.model);
      try{await persist(result.text,result.provider,result.model,{quiet:true});toast({title:'Grounded listing draft generated',description:`Drafted for ${channel} and persisted to the product record. Any external write still requires Mission Control approval.`});}catch{/* persist already surfaced the error; keep generated text editable in this session */}
    }catch(error){toast({variant:'destructive',title:'Could not generate listing draft',description:friendlyMessage(error)});}finally{setGenerating(false);}
  };

  const requestApproval=async()=>{
    if(!selected||!workspaceId||!serverDraftMatches||!validatedForChannel||!boundedWriter||!etsyReady||requesting)return;
    setRequesting(true);
    try{
      const etsyData=channel==='etsy'?{
        shop_id:Number(etsy.shop_id),quantity:Number(etsy.quantity),who_made:etsy.who_made,when_made:etsy.when_made.trim(),taxonomy_id:Number(etsy.taxonomy_id),
        ...(Number(etsy.shipping_profile_id)>0?{shipping_profile_id:Number(etsy.shipping_profile_id)}:{}),
        ...(Number(etsy.readiness_state_id)>0?{readiness_state_id:Number(etsy.readiness_state_id)}:{}),
      }:undefined;
      const result=await requestApprovalFn({data:{workspace_id:workspaceId,item_id:selected.id,channel,...(etsyData?{etsy:etsyData}:{})}});
      await qc.invalidateQueries({queryKey:['dropship-listing-operations',workspaceId]});
      await qc.invalidateQueries({queryKey:['dropshipping-listing-approval',workspaceId,itemId,channel]});
      toast({title:result.reused?'Existing approval ready':'Listing approval created',description:'Review the immutable provider action in Mission Control. Approval executes the exact saved draft payload once.'});
    }catch(error){toast({variant:'destructive',title:'Could not prepare listing approval',description:friendlyMessage(error)});}finally{setRequesting(false);}
  };

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10"><FilePenLine className="h-4 w-4 text-fuchsia-300"/></span><div><h2 className="text-sm font-semibold text-white">Multi-channel listing workbench</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Generate grounded channel copy from the saved product record, then hand supported listing writes to Blackstar's immutable Mission Control approval path. Shopify and Etsy currently expose bounded draft-creation writers; other channels remain capability-gated rather than simulated.</p></div></div><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Provider connections <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="text-xs font-medium text-white">Draft source</p><label className="mt-3 block"><span className={label}>Operations workspace</span><select className={control} value={workspaceId} onChange={e=>{setWorkspaceId(e.target.value);setItemId('')}}><option value="">Select workspace</option>{ecommerceWorkspaces.map(row=><option key={row.id} value={row.id}>{row.business_name}</option>)}</select></label><label className="mt-3 block"><span className={label}>Persisted product</span><select className={control} value={itemId} onChange={e=>setItemId(e.target.value)} disabled={!workspaceId||operations.isFetching}><option value="">Select product</option>{products.map(item=><option key={item.id} value={item.id}>{item.name} · {item.metadata?.lifecycle_stage||'saved'}</option>)}</select></label>{operations.isFetching&&<p className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading durable product records…</p>}{operations.error&&<p className="mt-3 text-[11px] text-rose-300">{friendlyMessage(operations.error)}</p>}</div>

        {selected&&<div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="text-xs font-medium text-white">{selected.name}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">{selected.metadata?.lifecycle_stage||'saved'} · {selected.metadata?.fulfilment_model||'model n/a'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-500"><span>Price {selected.sale_price??'—'} {selected.currency}</span><span>Margin {selected.metadata?.unit_economics?.marginPct??'—'}%</span><span>Opportunity {selected.metadata?.opportunity_score??'—'}</span><span>Supplier {selected.metadata?.supplier_score??'—'}</span></div>{selected.metadata?.evidence?.url&&<a href={selected.metadata.evidence.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-300">Open evidence <ExternalLink className="h-3 w-3"/></a>}</div>}

        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><label className="block"><span className={label}>Target channel</span><select className={control} value={channel} onChange={e=>setChannel(e.target.value)}>{DROPSHIP_CHANNELS.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label className="mt-3 block"><span className={label}>Locale</span><input className={control} value={locale} maxLength={40} onChange={e=>setLocale(e.target.value)} placeholder="en-GB"/></label><label className="mt-3 block"><span className={label}>Operator instructions</span><textarea className={`${control} min-h-20`} value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} placeholder="Tone, audience, positioning. Treat these as instructions, not verified product facts."/></label></div>

        {channel==='etsy'&&<div className="rounded-xl border border-orange-400/15 bg-orange-500/[.03] p-4"><p className="text-xs font-medium text-white">Etsy draft requirements</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">These IDs are operational Etsy fields. Product copy and price still come from the persisted Blackstar record. Etsy compliance must already be validated for this product.</p><div className="mt-3 grid grid-cols-2 gap-2"><label><span className={label}>Shop ID</span><input className={control} inputMode="numeric" value={etsy.shop_id} onChange={e=>setEtsy({...etsy,shop_id:e.target.value})}/></label><label><span className={label}>Taxonomy ID</span><input className={control} inputMode="numeric" value={etsy.taxonomy_id} onChange={e=>setEtsy({...etsy,taxonomy_id:e.target.value})}/></label><label><span className={label}>Quantity</span><input className={control} inputMode="numeric" value={etsy.quantity} onChange={e=>setEtsy({...etsy,quantity:e.target.value})}/></label><label><span className={label}>Who made</span><select className={control} value={etsy.who_made} onChange={e=>setEtsy({...etsy,who_made:e.target.value})}><option value="i_did">I did</option><option value="collective">Collective</option><option value="someone_else">Production partner</option></select></label><label className="col-span-2"><span className={label}>When made</span><input className={control} value={etsy.when_made} maxLength={40} onChange={e=>setEtsy({...etsy,when_made:e.target.value})}/></label><label><span className={label}>Shipping profile ID</span><input className={control} inputMode="numeric" value={etsy.shipping_profile_id} onChange={e=>setEtsy({...etsy,shipping_profile_id:e.target.value})}/></label><label><span className={label}>Readiness state ID</span><input className={control} inputMode="numeric" value={etsy.readiness_state_id} onChange={e=>setEtsy({...etsy,readiness_state_id:e.target.value})}/></label></div></div>}

        {blocked&&<div className="rounded-xl border border-red-400/20 bg-red-500/[.04] p-4"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-300"/><p className="text-xs font-medium text-red-300">Compliance block</p></div><p className="mt-2 text-[10px] leading-4 text-zinc-500">This product cannot enter the listing flow until its persisted compliance block is resolved.</p></div>}
      </aside>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><button disabled={!selected||blocked||generating||saving} onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{generating?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{generating?'Generating grounded draft…':'Generate & persist draft'}</button><button disabled={!selected||blocked||!draftText.trim()||saving||generating} onClick={()=>persist(draftText)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save revision</button>{savedDraft&&<span className="ml-auto text-[9px] uppercase tracking-wide text-zinc-600">stored draft · approval required</span>}</div><textarea className={`${control} mt-4 min-h-[360px] font-mono leading-5`} value={draftText} onChange={e=>setDraftText(e.target.value)} placeholder="Choose a saved product and generate a grounded channel draft, or edit an existing persisted draft."/><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600">{provider&&<span>Provider: {provider}</span>}{model&&<span>Model: {model}</span>}<span>Maximum persisted draft: 16,000 characters</span></div></div>

        {draftText&&<div className="rounded-xl border border-white/[.08] bg-black/20 p-4"><p className="mb-3 text-xs font-medium text-white">Draft preview</p><div className="prose-chat text-xs leading-6 text-zinc-300"><ReactMarkdown>{draftText}</ReactMarkdown></div></div>}

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.03] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/><div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-emerald-200">Governed provider action</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">For a supported channel, Blackstar prepares an immutable provider payload from the saved draft and product record. Mission Control must approve it before the provider write. Saving a new revision expires an older pending request.</p></div></div>
          {!boundedWriter&&<p className="mt-3 rounded-lg border border-white/[.08] bg-black/20 p-3 text-[10px] leading-4 text-zinc-600">No bounded listing-create writer is currently built into Blackstar for {channel}. Use the live readiness matrix above to connect capabilities; Blackstar will not simulate publication.</p>}
          {selected&&!validatedForChannel&&<p className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/[.03] p-3 text-[10px] leading-4 text-amber-200">This product was validated for {String(selected.metadata?.channel||'another channel')}. Save a product decision specifically for {channel} before requesting an external listing action.</p>}
          {savedDraft&&!serverDraftMatches&&<p className="mt-3 text-[10px] text-amber-300">Save this revision before requesting approval so the immutable provider payload matches the text you see.</p>}
          <div className="mt-3 flex flex-wrap gap-2"><button disabled={!selected||blocked||!savedDraft||!serverDraftMatches||!validatedForChannel||!boundedWriter||!etsyReady||requesting} onClick={requestApproval} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{requesting?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}{requesting?'Preparing approval…':channel==='etsy'?'Request Etsy draft creation':'Request Shopify draft creation'}</button><button onClick={()=>navigate('/mission-control')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Mission Control <ExternalLink className="ml-1 inline h-3 w-3"/></button></div>
          {approval.data&&<div className="mt-3 rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Approval {approval.data.status}</p>{approval.data.execution_status&&<span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">execution {approval.data.execution_status}</span>}</div>{approval.data.execution_error&&<p className="mt-2 text-[10px] text-rose-300">{approval.data.execution_error}</p>}{approval.data.execution_status==='succeeded'&&<p className="mt-2 text-[10px] leading-4 text-emerald-300">The approved provider action completed. Verify the created draft in the connected store before activating/publishing it.</p>}</div>}
        </div>
      </div>
    </div>
  </section>;
}