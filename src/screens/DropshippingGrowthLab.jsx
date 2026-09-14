import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Bot,CheckCircle2,ExternalLink,Loader2,Plug,Search,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {getCommerceProviderCapabilities} from '@/lib/platform/integrated-capabilities.functions';
import {createAgent} from '@/lib/agents/agents.functions';
import {DROPSHIP_AGENTS} from '@/lib/dropshipping/dropshipping';
import {DROPSHIP_SUPPLIER_NETWORK,calculateKeywordOpportunity,trendEvidenceStatus} from '@/lib/dropshipping/dropshipping-growth';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const input='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function DropshippingGrowthLab(){
  const navigate=useNavigate();
  const {toast}=useToast();
  const capsFn=useServerFn(getCommerceProviderCapabilities);
  const [supplier,setSupplier]=useState('printful');
  const [keyword,setKeyword]=useState('');
  const [seo,setSeo]=useState({searchMomentum:70,buyerIntent:70,relevance:80,competition:50,commercialValue:65});
  const [evidence,setEvidence]=useState({hasSearchSource:false,hasMarketplaceSource:false,hasSupplierSource:false});
  const [creating,setCreating]=useState('');
  const supplierCaps=useQuery({queryKey:['dropship-supplier-capabilities',supplier],queryFn:()=>capsFn({data:{provider:supplier}}),retry:false});
  const kw=useMemo(()=>calculateKeywordOpportunity(seo),[seo]);
  const proof=useMemo(()=>trendEvidenceStatus(evidence),[evidence]);

  const provisionAgent=async(agent)=>{
    if(creating)return;
    setCreating(agent.id);
    try{
      const result=await createAgent({data:{
        name:`Dropshipping ${agent.name}`,
        description:agent.purpose,
        category:'Commerce',
        purpose:agent.purpose,
        model_provider:'openai',
        model:'gpt-5-mini',
        memory_enabled:true,
        requires_approval:true,
        autonomy:'supervised',
        instructions:`You are Blackstar's ${agent.name} for a dropshipping operation. Use connected Blackstar research, files, commerce and approved integration tools only. Never invent sales, search-volume, supplier-stock, shipping or margin data. Distinguish evidence from inference. Respect marketplace rules, product restrictions, IP rights, delivery promises and customer-protection requirements. Any external write, listing publication, price change, refund, fulfilment, supplier purchase or advertising spend must remain approval-gated.`,
        allowed_tools:['web','files'],
        preferences:{source:'dropshipping-hub',role:agent.id,approvalRequired:true},
        status:'draft',
      }});
      toast({title:'Dropshipping agent created',description:`${result.name||agent.name} was created as a supervised draft agent.`});
    }catch(error){toast({variant:'destructive',title:'Could not create agent',description:friendlyMessage(error)});}finally{setCreating('');}
  };

  return <div className="mt-5 space-y-5">
    <section className={panel}>
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10"><Truck className="h-4 w-4 text-cyan-300"/></span><div><h2 className="text-sm font-semibold text-white">Supplier & fulfilment network</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">Blackstar can inspect any supplier/shipping provider that is actually exposed through Integrations. These cards are integration targets, not claims that every API is already connected.</p></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{DROPSHIP_SUPPLIER_NETWORK.map(item=><button key={item.id} onClick={()=>setSupplier(item.id)} className={`rounded-xl border p-3 text-left ${supplier===item.id?'border-cyan-400/30 bg-cyan-500/[.06]':'border-white/[.08] bg-black/20'}`}><p className="text-xs font-medium text-white">{item.label}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">{item.kind}</p><p className="mt-2 text-[10px] leading-4 text-zinc-500">{item.notes}</p></button>)}</div>
      <div className="mt-4 rounded-xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2"><Plug className="h-4 w-4 text-cyan-300"/><p className="text-xs font-medium text-white">Live capability check · {supplier}</p>{supplierCaps.isFetching&&<Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500"/>}</div>{supplierCaps.error?<p className="mt-2 text-[11px] text-amber-300">{friendlyMessage(supplierCaps.error)}</p>:(supplierCaps.data??[]).length?<div className="mt-3 grid gap-2 md:grid-cols-2">{supplierCaps.data.map(cap=><div key={`${cap.provider}:${cap.action}`} className="rounded-lg border border-white/[.07] p-3"><div className="flex gap-2"><span className="text-[11px] text-white">{cap.action}</span>{cap.requiresApproval&&<span className="ml-auto text-[9px] text-amber-300">approval</span>}</div><p className="mt-1 text-[10px] text-zinc-500">{cap.description}</p></div>)}</div>:<p className="mt-2 text-[11px] leading-5 text-zinc-500">No deployed capability is currently advertised for this provider. Connect or install an approved integration before expecting catalogue, inventory, order or fulfilment execution.</p>}</div>
      <div className="mt-3 flex gap-2"><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Manage Integrations</button><button onClick={()=>navigate('/commerce-studio')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Commerce Studio</button></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className={panel}><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10"><Search className="h-4 w-4 text-violet-300"/></span><div><h2 className="text-sm font-semibold text-white">Hot SEO & keyword opportunity</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">Prioritise search terms using momentum, buyer intent, relevance, competition and commercial value. Connect real search/marketplace evidence before treating a keyword as hot.</p></div></div><div className="mt-4"><label className="text-[10px] uppercase tracking-wide text-zinc-500">Keyword / product query</label><input className={`${input} mt-1.5`} value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. compression packing cubes"/></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(seo).map(([key,value])=><label key={key}><span className="mb-1 block text-[10px] text-zinc-500">{key.replace(/([A-Z])/g,' $1')}</span><input type="number" min="0" max="100" className={input} value={value} onChange={e=>setSeo({...seo,[key]:Number(e.target.value)||0})}/></label>)}</div><div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[.04] p-4"><p className="text-[10px] uppercase tracking-wide text-violet-300">Keyword opportunity</p><p className="mt-1 text-3xl font-semibold text-white">{kw.score}<span className="text-sm text-zinc-500"> / 100</span></p><p className="mt-1 text-xs text-zinc-400">{kw.band}{keyword?` · ${keyword}`:''}</p></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>navigate('/seo-studio')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">SEO Studio <ExternalLink className="ml-1 inline h-3 w-3"/></button><button onClick={()=>navigate('/research')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Research</button></div></div>

      <div className={panel}><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10"><CheckCircle2 className="h-4 w-4 text-emerald-300"/></span><div><h2 className="text-sm font-semibold text-white">Trend evidence quality</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">A single viral post is not enough. Blackstar promotes a trend to actionable only after multiple evidence classes support it.</p></div></div><div className="mt-4 space-y-2">{[['hasSearchSource','Search / SEO evidence'],['hasMarketplaceSource','Marketplace demand evidence'],['hasSupplierSource','Supplier stock/cost evidence']].map(([key,title])=><label key={key} className="flex items-center justify-between rounded-xl border border-white/[.08] bg-black/20 p-3 text-xs text-zinc-300"><span>{title}</span><input type="checkbox" checked={evidence[key]} onChange={e=>setEvidence({...evidence,[key]:e.target.checked})}/></label>)}</div><div className={`mt-4 rounded-xl border p-4 ${proof.ready?'border-emerald-400/20 bg-emerald-500/[.04]':'border-amber-400/20 bg-amber-500/[.04]'}`}><p className={`text-xs font-semibold ${proof.ready?'text-emerald-300':'text-amber-300'}`}>{proof.ready?'Evidence threshold met':'More evidence required'}</p><p className="mt-1 text-[11px] text-zinc-500">{proof.sources}/3 evidence classes · {proof.confidence} confidence</p></div><p className="mt-3 text-[10px] leading-4 text-zinc-600">A high score is still a research signal, not a guarantee of sales. Blackstar should keep observed marketplace/search data, inferred demand and forecasts visibly separate.</p></div>
    </section>

    <section className={panel}><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-fuchsia-500/10"><Bot className="h-4 w-4 text-fuchsia-300"/></span><div><h2 className="text-sm font-semibold text-white">Deploy your dropshipping AI team</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">Create real Blackstar agents as supervised drafts. They inherit explicit anti-hallucination and approval instructions; creating an agent does not silently publish listings, spend money or place supplier orders.</p></div></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">{DROPSHIP_AGENTS.map(agent=><div key={agent.id} className="rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-fuchsia-300"/><p className="text-xs font-medium text-white">{agent.name}</p></div><p className="mt-2 min-h-16 text-[10px] leading-4 text-zinc-500">{agent.purpose}</p><button disabled={Boolean(creating)} onClick={()=>provisionAgent(agent)} className="mt-3 w-full rounded-lg border border-fuchsia-400/20 px-2 py-1.5 text-[10px] text-fuchsia-200 disabled:opacity-40">{creating===agent.id?'Creating…':'Create supervised agent'}</button></div>)}</div><div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={()=>navigate('/agents')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Agents</button><span className="inline-flex items-center gap-1 text-[10px] text-zinc-600"><ShieldCheck className="h-3 w-3"/>High-impact actions remain approval-gated.</span></div></section>
  </div>;
}
