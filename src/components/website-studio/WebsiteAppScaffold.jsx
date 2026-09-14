import {useMemo,useState} from 'react';
import {Database,FormInput,KeyRound,Plus,Trash2} from 'lucide-react';

const defaultConfig={forms:[],collections:[],auth:{enabled:false,providers:[]}};
const textField=(name)=>({name,type:'text',required:false});

export default function WebsiteAppScaffold({config,setConfig}){
  const safe=useMemo(()=>({
    forms:Array.isArray(config?.forms)?config.forms:[],
    collections:Array.isArray(config?.collections)?config.collections:[],
    auth:{enabled:Boolean(config?.auth?.enabled),providers:Array.isArray(config?.auth?.providers)?config.auth.providers:[]},
  }),[config]);
  const [formName,setFormName]=useState('');
  const [collectionName,setCollectionName]=useState('');
  const addForm=()=>{if(!formName.trim())return;setConfig({...safe,forms:[...safe.forms,{name:formName.trim(),fields:[textField('name'),textField('email')],submitAction:'blackstar-public-form'}]});setFormName('')};
  const addCollection=()=>{if(!collectionName.trim())return;setConfig({...safe,collections:[...safe.collections,{name:collectionName.trim(),fields:[{name:'id',type:'uuid'},{name:'created_at',type:'timestamp'}],storage:'blackstar-cms'}]});setCollectionName('')};
  const toggleAuth=()=>setConfig({...safe,auth:{...safe.auth,enabled:!safe.auth.enabled}});
  const toggleProvider=(provider)=>{const next=safe.auth.providers.includes(provider)?safe.auth.providers.filter(p=>p!==provider):[...safe.auth.providers,provider];setConfig({...safe,auth:{...safe.auth,providers:next}})};
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-orange-300"><Database className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Full-stack app scaffold</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Public forms use Blackstar&apos;s trusted submission runtime and published CMS items are packaged into generated deployments. Authentication remains scaffold-only until its provider runtime is provisioned.</p>

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
        <p className="mt-3 text-[10px] leading-4 text-zinc-600">Selecting a provider records intent only. Website Studio will not claim auth is live until credentials, callback URLs and provider configuration are actually provisioned.</p>
      </Panel>
    </div>

    <style>{`.field{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.65rem;padding:.55rem .65rem;font-size:.75rem;color:white;outline:none}.add{display:flex;align-items:center;justify-content:center;border:1px solid rgba(251,146,60,.2);background:rgba(251,146,60,.05);border-radius:.65rem;padding:.5rem;color:#fdba74}`}</style>
  </section>
}
function Panel({icon:Icon,title,children}){return <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-orange-300"/><p className="text-xs font-medium text-white">{title}</p></div><div className="mt-3">{children}</div></div>}
