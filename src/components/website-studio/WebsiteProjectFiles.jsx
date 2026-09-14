import {useMemo,useState} from 'react';
import {FolderTree,FileCode2,Download,Copy,Check} from 'lucide-react';
import {buildWebsiteProjectManifest,websiteManifestTree} from '@/lib/website-studio/website-project';

export default function WebsiteProjectFiles({project}){
  const [copied,setCopied]=useState('');
  const manifest=useMemo(()=>buildWebsiteProjectManifest({
    name:project.name||'Website',
    slug:project.slug||'website',
    framework:project.framework||'html',
    html:project.html||'',
    css:project.css||'',
    javascript:project.javascript||'',
    pages:project.pages||[],
    designTokens:project.design_tokens||project.designTokens||{},
    brief:project.brief||{},
    appConfig:project.app_config||{},
  }),[project]);
  const tree=useMemo(()=>websiteManifestTree(manifest),[manifest]);
  const copy=async(path)=>{const file=manifest.files.find(f=>f.path===path);if(!file)return;await navigator.clipboard.writeText(file.content);setCopied(path);setTimeout(()=>setCopied(''),1200)};
  const download=()=>{
    const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(project.slug||'website')+'.blackstar-site.json';a.click();URL.revokeObjectURL(url);
  };
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-blue-300"><FolderTree className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Project files</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Website Studio packages the current project into a deterministic file manifest for Git/deployment adapters. This export is not itself a deployment.</p></div><button onClick={download} className="flex items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-300/[.05] px-3 py-2 text-xs text-blue-100"><Download className="h-3.5 w-3.5"/>Export manifest</button></div>
    <div className="mt-4 space-y-2">{tree.map(path=><div key={path} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/20 p-3"><FileCode2 className="h-4 w-4 text-zinc-600"/><code className="min-w-0 flex-1 truncate text-xs text-zinc-300">{path}</code><button onClick={()=>copy(path)} className="rounded-lg p-1.5 text-zinc-600 hover:text-blue-300" aria-label={'Copy '+path}>{copied===path?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}</button></div>)}</div>
  </section>
}
