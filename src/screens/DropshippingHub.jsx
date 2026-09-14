import {useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Activity,BarChart3,Bot,Boxes,Calculator,ExternalLink,Globe2,Loader2,Megaphone,PackageCheck,Plug,Search,ShieldCheck,ShoppingBag,Sparkles,Store,Truck,Users,WalletCards} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import {Empty,Failed} from '@/components/business/live';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {getCommerceProviderCapabilities,getIntegratedCapabilityOverview,saveCommerceWorkspace} from '@/lib/platform/integrated-capabilities.functions';
import {saveWebsiteStudioProject} from '@/lib/website-studio/website-studio.functions';
import {DROPSHIP_AGENTS,DROPSHIP_CHANNELS,assessChannelCompliance,buildDropshipStoreBrief,calculateOpportunityScore,calculateSupplierScore,calculateUnitEconomics,dropshipProjectSlug} from '@/lib/dropshipping/dropshipping';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const label='mb-1.5 block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500';
const n=(value)=>Number(value)||0;

export default function DropshippingHub(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const qc=useQueryClient();
  const overviewFn=useServerFn(getIntegratedCapabilityOverview);
  const capabilitiesFn=useServerFn(getCommerceProviderCapabilities);
  const saveCommerceFn=useServerFn(saveCommerceWorkspace);
  const saveWebsiteFn=useServerFn(saveWebsiteStudioProject);
  const [channel,setChannel]=useState('shopify');
  const [workspace,setWorkspace]=useState({name:'',connectionRef:'',currency:'GBP'});
  const [signals,setSignals]=useState({demand:70,searchMomentum:70,competition:50,margin:65,shipping:65,supplierReliability:70,seasonality:50,returnRisk:25,complianceRisk:10});
  const [economics,setEconomics]=useState({sellPrice:39.99,productCost:9,shippingCost:4,marketplaceFeePct:10,paymentFeePct:3,adCost:7,returnsReservePct:5,taxReservePct:0});
  const [supplier,setSupplier]=useState({reliability:80,stockStability:75,shippingSpeed:70,quality:80,returns:75,landedCost:70});
  const [compliance,setCompliance]=useState({channel:'shopify',fulfilmentModel:'wholesale-supplier',originalDesign:false,productionPartnerDisclosed:false,restrictedProduct:false,ipRisk:false});
  const [brand,setBrand]=useState({brandName:'',niche:'',audience:'',products:'',channels:['blackstar-site','shopify']});

  const overview=useQuery({queryKey:['dropshipping-integrated-overview'],queryFn:()=>overviewFn({data:undefined}),enabled:session==='yes',retry:false});
  const capabilities=useQuery({queryKey:['dropshipping-provider-capabilities',channel],queryFn:()=>capabilitiesFn({data:{provider:channel}}),enabled:session==='yes'&&channel!=='blackstar-site',retry:false});
  const opportunity=useMemo(()=>calculateOpportunityScore(signals),[signals]);
  const unit=useMemo(()=>calculateUnitEconomics(economics),[economics]);
  const supplierScore=useMemo(()=>calculateSupplierScore(supplier),[supplier]);
  const channelCheck=useMemo(()=>assessChannelCompliance(compliance),[compliance]);

  const saveConnection=useMutation({
    mutationFn:()=>saveCommerceFn({data:{provider:channel==='shopify'?'shopify':'integration',name:workspace.name,connectionRef:workspace.connectionRef||null,currency:workspace.currency}}),
    onSuccess:async()=>{await qc.invalidateQueries({queryKey:['dropshipping-integrated-overview']});toast({title:'Dropshipping workspace saved',description:'Credentials remain in Blackstar Integrations; this hub stores only the connection reference.'});},
    onError:(error)=>toast({variant:'destructive',title:'Could not save workspace',description:friendlyMessage(error)}),
  });

  const createStore=useMutation({
    mutationFn:async()=>{
      const products=brand.products.split(/\n|,/).map(v=>v.trim()).filter(Boolean);
      const brief=buildDropshipStoreBrief({...brand,products});
      const name=brand.brandName.trim()||`${brand.niche.trim()||'Dropship'} Store`;
      const slug=`${dropshipProjectSlug(name)}-${Date.now().toString(36).slice(-5)}`;
      const html=`<main><section class="hero"><p class="eyebrow">${escapeHtml(brand.niche||'Curated products')}</p><h1>${escapeHtml(name)}</h1><p>Built for ${escapeHtml(brand.audience||'your customers')} with clear shipping, returns and trusted product information.</p><a href="#shop">Shop the collection</a></section><section id="shop"><h2>Featured products</h2><div class="products">${products.slice(0,8).map(p=>`<article><h3>${escapeHtml(p)}</h3><p>Product details, supplier evidence and delivery promises must be verified before publishing.</p></article>`).join('')||'<article><h3>Add your first winning product</h3><p>Use Dropshipping Hub Product Scout to validate demand, margin, supplier quality and channel eligibility.</p></article>'}</div></section></main>`;
      const css='body{margin:0;background:#09090b;color:#f4f4f5;font-family:Inter,system-ui,sans-serif}.hero{padding:8rem 6vw;max-width:980px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:#a78bfa}.hero h1{font-size:clamp(3rem,8vw,7rem);margin:.2em 0}.hero a{display:inline-block;margin-top:1.5rem;padding:.9rem 1.2rem;border-radius:999px;background:#7c3aed;color:white;text-decoration:none}#shop{padding:4rem 6vw}.products{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.products article{border:1px solid #27272a;border-radius:18px;padding:1.5rem;background:#111114}';
      return saveWebsiteFn({data:{name,slug,prompt:`Build a conversion-focused, policy-compliant dropshipping storefront for ${brand.niche||'the selected niche'}.`,brief,pages:brief.pages.map((page,index)=>({id:`page-${index+1}`,name:page,path:page==='Home'?'/':`/${dropshipProjectSlug(page)}`})),designTokens:{theme:'blackstar-commerce'},appConfig:{commerce:{enabled:true,source:'dropshipping-hub',channels:brand.channels}},gitConfig:{},domainConfig:{},html,css,javascript:'',framework:'html',status:'draft'}});
    },
    onSuccess:(project)=>{toast({title:'Store created in Website Studio',description:`${project.name} is ready for design, products, forms, CMS, auth and publishing.`});navigate('/website-studio');},
    onError:(error)=>toast({variant:'destructive',title:'Could not create Website Studio project',description:friendlyMessage(error)}),
  });

  const liveCapabilities=capabilities.data??[];
  const commerceRows=overview.data?.commerce??[];
  return <>
    <PageHeader eyebrow="Business · Commerce · AI" title="Dropshipping Hub" description="Research products, validate suppliers and margins, connect sales channels, orchestrate approved AI agents, build a branded Website Studio storefront and operate orders without duplicating provider credentials." />
    {session==='no'&&<Failed message="Sign in to use Dropshipping Hub."/>}
    {overview.error&&<Failed message={friendlyMessage(overview.error)}/>} 

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Store} label="Commerce workspaces" value={commerceRows.length} detail="Blackstar connected workspaces"/>
      <Metric icon={Activity} label="Opportunity score" value={`${opportunity.score}/100`} detail={opportunity.band}/>
      <Metric icon={WalletCards} label="Modelled margin" value={`${unit.marginPct}%`} detail={`${unit.profit.toFixed(2)} profit / order`}/>
      <Metric icon={PackageCheck} label="Supplier score" value={`${supplierScore.score}/100`} detail={supplierScore.band}/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
      <div className="space-y-5">
        <section className={panel}>
          <SectionTitle icon={Plug} title="Stores, marketplaces & fulfilment connections" desc="Inspect real provider capabilities. Missing connectors stay visibly unconnected rather than being simulated."/>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{DROPSHIP_CHANNELS.map(item=><button key={item.id} onClick={()=>{setChannel(item.id);setCompliance(v=>({...v,channel:item.id}))}} className={`rounded-xl border p-3 text-left ${channel===item.id?'border-violet-400/35 bg-violet-500/[.08]':'border-white/10 bg-black/15'}`}><p className="text-xs font-medium text-white">{item.label}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{item.connection}</p></button>)}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><Field title="Workspace/store name"><input className={control} value={workspace.name} onChange={e=>setWorkspace({...workspace,name:e.target.value})} placeholder="Main dropship store"/></Field><Field title="Integration reference"><input className={control} value={workspace.connectionRef} onChange={e=>setWorkspace({...workspace,connectionRef:e.target.value})} placeholder="Existing connection ID/name"/></Field><Field title="Currency"><input className={control} maxLength={3} value={workspace.currency} onChange={e=>setWorkspace({...workspace,currency:e.target.value.toUpperCase()})}/></Field></div>
          <div className="mt-3 flex flex-wrap gap-2"><button disabled={!workspace.name.trim()||saveConnection.isPending||channel==='blackstar-site'} onClick={()=>saveConnection.mutate()} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{saveConnection.isPending?'Saving…':'Save channel workspace'}</button><button onClick={()=>navigate('/integrations')} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300">Open Integrations</button>{channel==='shopify'&&<button onClick={()=>navigate('/shopify-connect')} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300">Shopify Connect</button>}</div>
          <div className="mt-4 border-t border-white/[.07] pt-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-500">Live capabilities · {channel}</p>{capabilities.isFetching?<Loader2 className="mt-3 h-4 w-4 animate-spin text-zinc-500"/>:liveCapabilities.length?<div className="mt-2 grid gap-2 md:grid-cols-2">{liveCapabilities.map(cap=><div key={`${cap.provider}:${cap.action}`} className="rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex items-center gap-2"><span className="text-xs text-white">{cap.action}</span>{cap.requiresApproval&&<span className="rounded-full border border-amber-400/20 px-2 py-.5 text-[9px] text-amber-300">approval</span>}</div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{cap.description}</p></div>)}</div>:<p className="mt-2 text-xs text-zinc-500">No live provider action is currently exposed for this channel. Connect an approved integration/API first; Blackstar will not pretend the connector exists.</p>}</div>
        </section>

        <section className={panel}>
          <SectionTitle icon={Search} title="Trend Radar & Product Scout" desc="Combine search demand, momentum, competition, margin and operational risk into an explainable opportunity score. Live numbers should come from connected research/marketplace sources; this workbench never invents sales counts."/>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{Object.entries(signals).map(([key,value])=><Field key={key} title={pretty(key)}><input type="number" min="0" max="100" className={control} value={value} onChange={e=>setSignals({...signals,[key]:n(e.target.value)})}/></Field>)}</div>
          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.15em] text-violet-300">Opportunity</p><p className="mt-1 text-3xl font-semibold text-white">{opportunity.score}<span className="text-sm text-zinc-500"> / 100</span></p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">{opportunity.band}</span></div><p className="mt-3 text-[11px] text-zinc-500">{opportunity.explanation.join(' · ')}</p></div>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>navigate('/research')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Research</button><button onClick={()=>navigate('/seo-studio')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open SEO Studio</button><button onClick={()=>navigate('/web-intelligence')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Web Intelligence</button></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className={panel}><SectionTitle icon={Calculator} title="Unit economics" desc="Include supplier cost, delivery, marketplace/payment fees, ads, returns and optional tax reserve before choosing a price."/><div className="mt-4 grid grid-cols-2 gap-3">{Object.entries(economics).map(([key,value])=><Field key={key} title={pretty(key)}><input type="number" step="0.01" className={control} value={value} onChange={e=>setEconomics({...economics,[key]:n(e.target.value)})}/></Field>)}</div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Stat label="Total cost" value={unit.totalCost}/><Stat label="Profit" value={unit.profit}/><Stat label="Margin" value={`${unit.marginPct}%`}/><Stat label="Break-even ROAS" value={unit.breakEvenRoas??'—'}/></div><p className="mt-3 text-[10px] leading-4 text-zinc-600">Tax/VAT fields are planning reserves, not tax advice. Actual marketplace, VAT, customs and payment fees must come from the relevant account/jurisdiction.</p></div>
          <div className={panel}><SectionTitle icon={Truck} title="Supplier scorecard" desc="Prefer operational evidence over the cheapest headline cost."/><div className="mt-4 grid grid-cols-2 gap-3">{Object.entries(supplier).map(([key,value])=><Field key={key} title={pretty(key)}><input type="number" min="0" max="100" className={control} value={value} onChange={e=>setSupplier({...supplier,[key]:n(e.target.value)})}/></Field>)}</div><div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Supplier health</p><p className="mt-1 text-3xl font-semibold text-white">{supplierScore.score}<span className="text-sm text-zinc-500"> / 100</span></p><p className="mt-1 text-xs text-zinc-400">{supplierScore.band}</p></div></div>
        </section>

        <section className={panel}><SectionTitle icon={ShieldCheck} title="Marketplace & product compliance" desc="Blackstar blocks known high-risk fulfilment patterns before listing automation. Provider/product policies still receive a final live check."/><div className="mt-4 grid gap-3 md:grid-cols-3"><Field title="Channel"><select className={control} value={compliance.channel} onChange={e=>setCompliance({...compliance,channel:e.target.value})}>{DROPSHIP_CHANNELS.filter(v=>v.id!=='blackstar-site').map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></Field><Field title="Fulfilment model"><select className={control} value={compliance.fulfilmentModel} onChange={e=>setCompliance({...compliance,fulfilmentModel:e.target.value})}>{['wholesale-supplier','manufacturer','pod','owned-stock','retailer-arbitrage','marketplace-arbitrage'].map(v=><option key={v}>{v}</option>)}</select></Field><div className="space-y-2">{[['originalDesign','Original design'],['productionPartnerDisclosed','Production partner disclosed'],['restrictedProduct','Restricted/regulated product'],['ipRisk','IP/counterfeit concern']].map(([key,text])=><label key={key} className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={compliance[key]} onChange={e=>setCompliance({...compliance,[key]:e.target.checked})}/>{text}</label>)}</div></div><div className={`mt-4 rounded-xl border p-4 ${channelCheck.allowed?'border-emerald-400/20 bg-emerald-500/[.04]':'border-red-400/20 bg-red-500/[.04]'}`}><p className={`text-xs font-semibold ${channelCheck.allowed?'text-emerald-300':'text-red-300'}`}>{channelCheck.status.toUpperCase()}</p>{channelCheck.reasons.map(reason=><p key={reason} className="mt-2 text-[11px] leading-5 text-zinc-400">{reason}</p>)}</div></section>
      </div>

      <div className="space-y-5">
        <section className={panel}><SectionTitle icon={Sparkles} title="Brand & Website Studio" desc="Create a real Blackstar Website Studio project pre-seeded for your niche, audience and selected products."/><div className="mt-4 space-y-3"><Field title="Brand name"><input className={control} value={brand.brandName} onChange={e=>setBrand({...brand,brandName:e.target.value})} placeholder="North Star Goods"/></Field><Field title="Niche"><input className={control} value={brand.niche} onChange={e=>setBrand({...brand,niche:e.target.value})} placeholder="Travel organisers"/></Field><Field title="Audience"><input className={control} value={brand.audience} onChange={e=>setBrand({...brand,audience:e.target.value})} placeholder="Frequent flyers"/></Field><Field title="Products"><textarea className={`${control} min-h-24`} value={brand.products} onChange={e=>setBrand({...brand,products:e.target.value})} placeholder="One product per line or comma separated"/></Field><div><span className={label}>Store targets</span><div className="flex flex-wrap gap-2">{DROPSHIP_CHANNELS.filter(v=>['blackstar-site','shopify','amazon','ebay','etsy'].includes(v.id)).map(v=><button key={v.id} onClick={()=>setBrand({...brand,channels:brand.channels.includes(v.id)?brand.channels.filter(x=>x!==v.id):[...brand.channels,v.id]})} className={`rounded-full border px-3 py-1 text-[10px] ${brand.channels.includes(v.id)?'border-violet-400/30 text-violet-200':'border-white/10 text-zinc-500'}`}>{v.label}</button>)}</div></div><button disabled={createStore.isPending||!brand.niche.trim()} onClick={()=>createStore.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{createStore.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Globe2 className="h-4 w-4"/>}Build branded store</button></div></section>

        <section className={panel}><SectionTitle icon={Bot} title="AI dropshipping team" desc="Agents analyse automatically where safe; external writes, money movement and customer-impacting actions remain approval-gated."/><div className="mt-4 space-y-2">{DROPSHIP_AGENTS.map(agent=><div key={agent.id} className="rounded-xl border border-white/[.08] bg-black/20 p-3"><div className="flex items-center gap-2"><p className="text-xs font-medium text-white">{agent.name}</p>{agent.approval&&<span className="ml-auto rounded-full border border-amber-400/20 px-2 py-.5 text-[9px] text-amber-300">approval on action</span>}</div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{agent.purpose}</p></div>)}</div><button onClick={()=>navigate('/agents')} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Blackstar Agents</button></section>

        <section className={panel}><SectionTitle icon={BarChart3} title="Operations coverage" desc="Everything a dropshipping operator needs, routed to Blackstar's existing systems rather than duplicated."/><div className="mt-4 grid gap-2 sm:grid-cols-2">{[
          [Search,'Hot products & search trends','Research + Web Intelligence'],[Boxes,'Supplier intelligence','Cost, SLA, stock, quality'],[ShoppingBag,'Listings & SEO','Titles, attributes, tags, localisation'],[WalletCards,'Pricing & margins','Fees, CPA, reserves, guardrails'],[Truck,'Orders & fulfilment','Routing, tracking, exceptions'],[Users,'Customer support','Grounded order/policy responses'],[Megaphone,'Marketing','Creative, email, social, testing'],[ShieldCheck,'Risk & compliance','Channel, IP, product safety'],[Store,'Multi-store operations','Inventory/price/order sync'],[Sparkles,'Brand & storefront','Website Studio handoff']].map(([Icon,title,desc])=><div key={title} className="rounded-xl border border-white/[.08] bg-black/20 p-3"><Icon className="h-4 w-4 text-violet-300"/><p className="mt-2 text-xs text-white">{title}</p><p className="mt-1 text-[10px] text-zinc-500">{desc}</p></div>)}</div></section>

        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.035] p-4"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-[11px] leading-5 text-emerald-100/70">Dropshipping Hub never stores marketplace passwords/API secrets. Connections stay in Blackstar Integrations. Listing publication, price writes, refunds, supplier order placement, fulfilment and ad spend must travel through approved provider capabilities and Blackstar approval controls.</p></section>
      </div>
    </div>
  </>;
}

function SectionTitle({icon:Icon,title,desc}){return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10"><Icon className="h-4 w-4 text-violet-300"/></span><div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">{desc}</p></div></div>}
function Field({title,children}){return <label className="block"><span className={label}>{title}</span>{children}</label>}
function Metric({icon:Icon,label:metricLabel,value,detail}){return <div className={panel}><Icon className="h-4 w-4 text-violet-300"/><p className="mt-3 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-zinc-300">{metricLabel}</p><p className="mt-1 text-[10px] text-zinc-600">{detail}</p></div>}
function Stat({label:statLabel,value}){return <div className="rounded-xl border border-white/[.08] bg-black/20 p-3"><p className="text-[10px] text-zinc-500">{statLabel}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>}
function pretty(value){return value.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase())}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
