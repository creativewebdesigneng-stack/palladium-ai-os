import {useEffect,useState} from 'react';
import {Image as ImageIcon,Plus,Trash2,ExternalLink,UploadCloud,Loader2,LockKeyhole,Copy,Check} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {deleteWebsiteStudioAsset,listWebsiteStudioAssets,saveWebsiteStudioAsset} from '@/lib/website-studio/website-studio.functions';

const blank={name:'',kind:'image',sourceUrl:'',altText:'',provenance:''};
const bucket='website-studio-assets';

function safeFilename(name){
  return String(name||'asset').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-140)||'asset';
}

export default function WebsiteAssetLibrary({projectId}){
  const [assets,setAssets]=useState([]);
  const [signedUrls,setSignedUrls]=useState({});
  const [form,setForm]=useState(blank);
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [copiedAsset,setCopiedAsset]=useState('');

  const hydrateSignedUrls=async(rows)=>{
    const next={};
    await Promise.all((rows||[]).map(async(asset)=>{
      if(!asset.storage_path)return;
      const {data,error}=await supabase.storage.from(bucket).createSignedUrl(asset.storage_path,3600);
      if(!error&&data?.signedUrl)next[asset.id]=data.signedUrl;
    }));
    setSignedUrls(next);
  };

  const load=async()=>{
    if(!projectId){setAssets([]);setSignedUrls({});return}
    try{
      const rows=await listWebsiteStudioAssets({data:{projectId}});
      setAssets(rows);
      await hydrateSignedUrls(rows);
    }catch(e){setError(e instanceof Error?e.message:'Could not load assets.')}
  };

  useEffect(()=>{void load()},[projectId]);

  const saveExternal=async()=>{
    if(!projectId||!form.name.trim()||!form.sourceUrl.trim())return;
    try{
      await saveWebsiteStudioAsset({data:{projectId,name:form.name,kind:form.kind,sourceUrl:form.sourceUrl,altText:form.altText||undefined,provenance:form.provenance||undefined}});
      setForm(blank);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not save asset.')}
  };

  const upload=async(event)=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file||!projectId)return;
    setUploading(true);setError('');
    let storagePath='';
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user)throw new Error('You must be signed in to upload assets.');
      storagePath=`${userData.user.id}/${projectId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const {error:uploadError}=await supabase.storage.from(bucket).upload(storagePath,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(uploadError)throw uploadError;
      try{
        await saveWebsiteStudioAsset({data:{
          projectId,
          name:file.name,
          kind:file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type==='application/pdf'?'document':file.type.includes('font')||file.name.match(/\.(woff2?|ttf|otf)$/i)?'font':'other',
          storagePath,
          altText:'',
          provenance:'Uploaded privately through Blackstar Website Studio',
        }});
      }catch(metadataError){
        await supabase.storage.from(bucket).remove([storagePath]);
        throw metadataError;
      }
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not upload asset.')}
    finally{setUploading(false)}
  };

  const copyReference=async(asset)=>{
    const value=asset.storage_path?`blackstar-asset://${asset.id}`:(asset.source_url||'');
    if(!value)return;
    await navigator.clipboard.writeText(value);
    setCopiedAsset(asset.id);
    setTimeout(()=>setCopiedAsset(''),1200);
  };

  const remove=async(id)=>{
    try{
      const result=await deleteWebsiteStudioAsset({data:{id}});
      if(result.storagePath){
        const {error:storageError}=await supabase.storage.from(bucket).remove([result.storagePath]);
        if(storageError)setError('Asset metadata was deleted, but storage cleanup failed: '+storageError.message);
      }
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not delete asset.')}
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-lime-300"><ImageIcon className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Asset library</span></div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Upload private project assets or register approved external URLs. Private uploads use owner-scoped Supabase Storage and short-lived signed preview URLs.</p>
      </div>
      <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-lime-300/20 bg-lime-300/[.06] px-3 py-2 text-xs text-lime-100 ${!projectId||uploading?'pointer-events-none opacity-40':''}`}>
        {uploading?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<UploadCloud className="h-3.5 w-3.5"/>}
        {uploading?'Uploading…':'Upload file'}
        <input type="file" className="hidden" onChange={upload} accept="image/*,video/mp4,video/webm,application/pdf,.woff,.woff2"/>
      </label>
    </div>

    <div className="mt-3 flex items-start gap-2 rounded-xl border border-lime-300/10 bg-lime-300/[.025] p-3">
      <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300"/>
      <p className="text-[10px] leading-4 text-zinc-600">Uploaded assets stay private in Supabase while editing. Use the copy button to insert a `blackstar-asset://…` reference into HTML/CSS; the publisher rewrites and promotes that asset into the deployment package without making the private bucket public.</p>
    </div>

    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    {!projectId?<p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">Save the website project before adding assets.</p>:<>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="External asset name" className="field"/>
        <select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="field"><option>image</option><option>video</option><option>font</option><option>document</option><option>other</option></select>
        <input value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})} placeholder="https://asset-url…" className="field"/>
        <input value={form.altText} onChange={e=>setForm({...form,altText:e.target.value})} placeholder="Alt text" className="field"/>
        <button onClick={saveExternal} disabled={!form.name.trim()||!form.sourceUrl.trim()} className="flex items-center justify-center gap-2 rounded-xl border border-lime-300/20 bg-lime-300/[.06] px-3 py-2 text-xs text-lime-100 disabled:opacity-40"><Plus className="h-3.5 w-3.5"/>Add URL</button>
      </div>
      <input value={form.provenance} onChange={e=>setForm({...form,provenance:e.target.value})} placeholder="Source / licence / provenance note" className="field mt-2 w-full"/>

      <div className="mt-4 grid gap-2 md:grid-cols-2">{assets.map(asset=>{
        const href=asset.storage_path?signedUrls[asset.id]:asset.source_url;
        return <div key={asset.id} className="flex items-start gap-3 rounded-xl border border-white/[.07] p-3">
          {asset.kind==='image'&&href?<img src={href} alt={asset.alt_text||''} className="h-12 w-12 rounded-lg border border-white/10 object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-black/20"><ImageIcon className="h-4 w-4 text-zinc-700"/></div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{asset.name}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{asset.kind} · {asset.storage_path?'private upload':'external URL'} · {asset.alt_text||'no alt text yet'}</p>
            <p className="mt-1 truncate text-[10px] text-zinc-700">{asset.provenance||'provenance not recorded'}</p>
          </div>
          <button onClick={()=>copyReference(asset)} className="p-1.5 text-zinc-600 hover:text-lime-300" aria-label={'Copy project reference for '+asset.name}>{copiedAsset===asset.id?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}</button>
          {href&&<a href={href} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-600 hover:text-lime-300"><ExternalLink className="h-3.5 w-3.5"/></a>}
          <button onClick={()=>remove(asset.id)} className="p-1.5 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button>
        </div>
      })}</div>
    </>}

    <style>{`.field{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.6rem .7rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(190,242,100,.35)}.field option{background:#11131a}`}</style>
  </section>
}
