import {useMemo,useState} from 'react';
import {Database,FormInput,KeyRound,Plus,Trash2} from 'lucide-react';

const textField=(name)=>({name,type:'text',required:false});

export default function WebsiteAppScaffold({config,setConfig}){
  const safe=useMemo(()=>({
    forms:Array.isArray(config?.forms)?config.forms:[],
    collections:Array.isArray(config?.collections)?config.collections:[],
    auth:{
      enabled:Boolean(config?.auth?.enabled),
      providers:Array.isArray(config?.auth?.providers)?config.auth.providers:[],
      supabaseUrl:typeof config?.auth?.supabaseUrl==='string'?config.auth.supabaseUrl:'',
      publishableKey:typeof config?.auth?.publishableKey==='string'?config.auth.publishableKey:'',
      allowSignUp:config?.auth?.allowSignUp!==false,
      redirectPath:typeof config?.auth?.redirectPath==='string'?config.auth.redirectPath:'/',
    },
  }),[config]);
  const [formName,setFormName]=useState('');
  const [collectionName,setCollectionName]=useState('');
  const addForm=()=>{if(!formName.trim())return;setConfig({...safe,forms:[...safe.forms,{name:formName.trim(),fields:[textField('name'),textField('email')],submitAction:'blackstar-public-form'}]});setFormName('')};
  const addCollection=()=>{if(!collectionName.trim())return;setConfig({...safe,collections:[...safe.collections,{name:collectionName.trim(),fields:[{name:'id',type:'uuid'},{name:'created_at',type:'timestamp'}],storage:'blackstar-cms'}]});setCollectionName('')};
  const updateAuth=(patch)=>setConfig({...safe,auth:{...safe.auth,...patch}});
  const toggleAuth=()=>updateAuth({enabled:!safe.auth.enabled});
  const toggleProvider=(provider)=>{const next=safe.auth.providers.includes(provider)?safe.auth.providers.filter(p=>p!==provider):[...safe.auth.providers,provider];updateAuth({providers:next})};
  const authReady=safe.auth.enabled&&safe.auth.providers.length>0&&/^https:\/\//.test(safe.auth.supabaseUrl)&&safe.auth.publishableKey.startsWith('sb_publishable_');

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-orange-300"><Database className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Full-stack app scaffold</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Public forms use Blackstar&apos;s trusted submission runtime, published CMS items ship with generated deployments, and authentication can connect to a dedicated Supabase project for the generated site.</p>

    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      <Panel icon={FormInput} title="Forms">
        <div className="flex gap-2"><input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Contact form" className="field flex-1"/><button onClick={addForm} className="add"><Plus className="h-3.5 w-3.5"/></button></div>
        <div className="mt-2 space-y-2">{safe.forms.map((form,i)=><div key={form.name+i} className="flex items-center gap-2 rounded-lg border border-white/[.07] p-2"><span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{form.name}</span><span className="text-[9px] text-emerald-500">Blackstar form · {form.fields?.length||0} fields</span><button onClick={()=>setConfig({...safe,forms:safe.forms.filter((_,x)=>x!==i)})} className="text-zinc-700 hover:text-rose-300"><Trash2 className="h-3 w-3"/></button></div>)}</div>
      </Panel>

      <Panel icon={Database} title="Data collections">
        <div className="flex gap-2"><input value={collectionName} onChange={e=>setCollectionName(e.target.value)} placeholder="Leads" className="field flex-1"/><button onClick={addCollection} className="add"><Plus className="h-3.5 w-3.5"/></button></div>
        <div className="mt-2 space-y-2">{safe.collections.map((collection,i)=><div key={collection.name+i} className="flex items-center gap-2 rounded-lg border border-white/[.07] p-2"><span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{collection.name}</span><span className="text-[9px] text-emerald-500">Blackstar CMS</span><button onClick={()=>setConfig({...safe,collections:safe.collections.filter((_,x)=>x!==i)})} className="text-zinc-700 hover:text-rose-300"><Trash2 className="h-3 w-3"/></button></div>)}</div>
        <p className="mt-3 text-[10px] leading-4 text-zinc-600">Only items marked Published are exposed to generated sites, and changes take effect on the next preview, publish or GitHub sync.</p>
      </Panel>

      <Panel icon={KeyRound} title="Authentication">
        <button onClick={toggleAuth} className={`w-full rounded-lg border px-3 py-2 text-xs ${safe.auth.enabled?'border-emerald-300/20 bg-emerald-300/[.04] text-emerald-200':'border-white/10 text-zinc-500'}`}>{safe.auth.enabled?'Auth required':'No auth requirement'}</button>
        <div className="mt-2 grid grid-cols-2 gap-2">{['email','google','github','magic-link'].map(provider=><button key={provider} disabled={!safe.auth.enabled} onClick={()=>toggleProvider(provider)} className={`rounded-lg border px-2 py-1.5 text-[10px] disabled:opacity-30 ${safe.auth.providers.includes(provider)?'border-orange-300/20 text-orange-200':'border-white/[.07] text-zinc-600'}`}>{provider}</button>)}</div>
        {safe.auth.enabled&&<div className="mt-3 space-y-2">
          <input value={safe.auth.supabaseUrl} onChange={e=>updateAuth({supabaseUrl:e.target.value})} placeholder="https://your-site.supabase.co" className="field w-full" aria-label="Site Supabase URL"/>
          <input value={safe.auth.publishableKey} onChange={e=>updateAuth({publishableKey:e.target.value})} placeholder="sb_publishable_…" className="field w-full font-mono" aria-label="Site Supabase publishable key" autoComplete="off"/>
          <input value={safe.auth.redirectPath} onChange={e=>updateAuth({redirectPath:e.target.value})} placeholder="/" className="field w-full" aria-label="Authentication redirect path"/>
          <label className="flex items-center gap-2 rounded-lg border border-white/[.07] px-2.5 py-2 text-[10px] text-zinc-400"><input type="checkbox" checked={safe.auth.allowSignUp} onChange={e=>updateAuth({allowSignUp:e.target.checked})}/> Allow new user sign-up</label>
          <div className={`rounded-lg border px-2.5 py-2 text-[10px] ${authReady?'border-emerald-300/15 text-emerald-300':'border-amber-300/15 text-amber-200'}`}>{authReady?'Auth runtime connected':'Add the site Supabase URL, sb_publishable_ key and at least one provider.'}</div>
        </div>}
        <p className="mt-3 text-[10px] leading-4 text-zinc-600">Use a dedicated Supabase project for the generated site. Never paste an <code>sb_secret_</code> or service-role key. For Google, GitHub or magic links, allowlist the generated preview/production/custom-domain redirect URLs in that Supabase project.</p>
      </Panel>
    </div>

    <style>{`.field{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.65rem;padding:.55rem .65rem;font-size:.75rem;color:white;outline:none}.add{display:flex;align-items:center;justify-content:center;border:1px solid rgba(251,146,60,.2);background:rgba(251,146,60,.05);border-radius:.65rem;padding:.5rem;color:#fdba74}`}</style>
  </section>
}
function Panel({icon:Icon,title,children}){return <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-orange-300"/><p className="text-xs font-medium text-white">{title}</p></div><div className="mt-3">{children}</div></div>}
