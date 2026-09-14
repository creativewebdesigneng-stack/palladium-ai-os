import { useEffect, useMemo, useState } from 'react';
import { Code2, Monitor, Tablet, Smartphone, Plus, Save, Trash2, ExternalLink, Sparkles, Rocket, FolderKanban, Blocks, History, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { createWebsiteSeed } from '@/lib/website-studio/website-seed';
import { createWebsiteStudioRevision, deleteWebsiteStudioProject, listWebsiteStudioProjects, listWebsiteStudioRevisions, saveWebsiteStudioProject } from '@/lib/website-studio/website-studio.functions';
import { appendWebsiteBlock, WEBSITE_BLOCKS } from '@/lib/website-studio/website-blocks';
import { generateWebsiteIteration } from '@/lib/website-studio/website-ai.functions';

const blank={id:null,name:'',slug:'',prompt:'',brief:{},pages:[],design_tokens:{},html:'',css:'',javascript:'',framework:'html',status:'draft',preview_url:null,production_url:null,deployment_provider:null,deployment_id:null};
const widths={desktop:'100%',tablet:'820px',mobile:'390px'};

function documentForPreview(project){
  const css=project.css||'';
  const js=project.javascript||'';
  const html=project.html||'<!doctype html><html><body></body></html>';
  return html.replace('</head>',`<style>${css}</style></head>`).replace('</body>',`<script>${js.replace(/<\/script/gi,'<\\/script')}<\/script></body>`);
}

export default function WebsiteStudio(){
  const [projects,setProjects]=useState([]);
  const [draft,setDraft]=useState(blank);
  const [mode,setMode]=useState('desktop');
  const [tab,setTab]=useState('html');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [revisions,setRevisions]=useState([]);
  const [aiInstruction,setAiInstruction]=useState('');
  const [aiMeta,setAiMeta]=useState(null);

  const refresh=async()=>{try{setProjects(await listWebsiteStudioProjects({data:{}}));}catch(e){setError(e instanceof Error?e.message:'Could not load website projects.')}};
  const loadRevisions=async(projectId)=>{if(!projectId)return setRevisions([]);try{setRevisions(await listWebsiteStudioRevisions({data:{projectId}}));}catch(e){setError(e instanceof Error?e.message:'Could not load revisions.')}};
  useEffect(()=>{void refresh()},[]);
  useEffect(()=>{void loadRevisions(draft.id)},[draft.id]);

  const preview=useMemo(()=>documentForPreview(draft),[draft]);

  const createFromPrompt=()=>{
    if(!draft.name.trim())return setError('Give the website a project name first.');
    const seed=createWebsiteSeed(draft.name,draft.prompt);
    setDraft({...blank,...seed,design_tokens:seed.designTokens,status:'draft'});
    setNotice('Starter site generated locally. AI prompt-to-code generation will build on this project model rather than bypassing it.');
    setError('');
  };

  const save=async()=>{
    setBusy(true);setError('');setNotice('');
    try{
      const out=await saveWebsiteStudioProject({data:{
        id:draft.id??undefined,name:draft.name,slug:draft.slug,prompt:draft.prompt||undefined,brief:draft.brief||{},
        pages:draft.pages||[],designTokens:draft.design_tokens||draft.designTokens||{},html:draft.html||'',css:draft.css||'',
        javascript:draft.javascript||'',framework:draft.framework||'html',status:draft.status||'draft',
        previewUrl:draft.preview_url||null,productionUrl:draft.production_url||null,
        deploymentProvider:draft.deployment_provider||null,deploymentId:draft.deployment_id||null,
      }});
      setDraft(out);setNotice('Website project saved.');await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Could not save website project.')}finally{setBusy(false)}
  };

  const remove=async(id)=>{setBusy(true);try{await deleteWebsiteStudioProject({data:{id}});if(draft.id===id)setDraft(blank);await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not delete website project.')}finally{setBusy(false)}};
  const snapshot=()=>({name:draft.name,slug:draft.slug,prompt:draft.prompt,brief:draft.brief||{},pages:draft.pages||[],design_tokens:draft.design_tokens||draft.designTokens||{},html:draft.html||'',css:draft.css||'',javascript:draft.javascript||'',framework:draft.framework||'html',status:draft.status||'draft'});
  const saveRevision=async()=>{if(!draft.id)return setError('Save the website project before creating revisions.');setBusy(true);try{await createWebsiteStudioRevision({data:{projectId:draft.id,label:'Revision '+new Date().toLocaleString(),snapshot:snapshot()}});await loadRevisions(draft.id);setNotice('Revision saved.')}catch(e){setError(e instanceof Error?e.message:'Could not save revision.')}finally{setBusy(false)}};
  const restoreRevision=(revision)=>{setDraft({...draft,...revision.snapshot,id:draft.id,design_tokens:revision.snapshot.design_tokens||{}});setNotice('Revision restored into the editor. Save the project to persist it.')};
  const addBlock=(blockId)=>setDraft({...draft,html:appendWebsiteBlock(draft.html||'',blockId)});
  const runAiIteration=async()=>{
    if(aiInstruction.trim().length<5)return setError('Describe what you want Blackstar to change.');
    setBusy(true);setError('');setNotice('');
    try{
      if(draft.id){
        await createWebsiteStudioRevision({data:{projectId:draft.id,label:'Before AI change · '+new Date().toLocaleString(),snapshot:snapshot()}});
      }
      const result=await generateWebsiteIteration({data:{
        projectId:draft.id??undefined,
        instruction:aiInstruction,
        name:draft.name||'Website',
        brief:draft.brief||{},
        pages:draft.pages||[],
        designTokens:draft.design_tokens||draft.designTokens||{},
        html:draft.html||'',
        css:draft.css||'',
        javascript:draft.javascript||'',
      }});
      setDraft({...draft,html:result.html,css:result.css,javascript:result.javascript,pages:result.pages,design_tokens:result.designTokens});
      setAiMeta({provider:result.provider,model:result.model,summary:result.summary});
      setAiInstruction('');
      setNotice('AI iteration applied in the editor. Review the preview and save when ready.');
      if(draft.id)await loadRevisions(draft.id);
    }catch(e){setError(e instanceof Error?e.message:'Could not generate website iteration.')}finally{setBusy(false)}
  };

  return <div className="space-y-5 pb-10">
    <PageHeader eyebrow="Creator workspace" title="Website Studio" description="Prompt, design, edit, preview and prepare websites for deployment using Blackstar's existing HTML Studio, developer controls and deployment infrastructure." action={<button onClick={()=>setDraft(blank)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-medium text-white"><Plus className="h-4 w-4"/>New website</button>}/>
    {(error||notice)&&<div className={`rounded-xl border p-3 text-xs ${error?'border-rose-400/20 bg-rose-500/10 text-rose-200':'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error||notice}</div>}

    <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-violet-300"/><p className="text-xs font-semibold text-white">Website projects</p></div>
        <div className="mt-3 space-y-2">{projects.length===0?<p className="py-8 text-center text-xs text-zinc-600">No website projects yet.</p>:projects.map(p=><button key={p.id} onClick={()=>setDraft(p)} className={`w-full rounded-xl border p-3 text-left ${draft.id===p.id?'border-violet-400/30 bg-violet-500/[.08]':'border-white/10 bg-black/15'}`}><p className="truncate text-sm text-white">{p.name}</p><p className="mt-1 text-[10px] text-zinc-500">{p.framework} · {p.status}</p></button>)}</div>
      </aside>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex items-center gap-2 text-violet-300"><Sparkles className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Prompt-to-site brief</span></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2"><input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Website / project name" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"/><input value={draft.slug||''} onChange={e=>setDraft({...draft,slug:e.target.value})} placeholder="site-slug" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"/></div>
          <textarea value={draft.prompt||''} onChange={e=>setDraft({...draft,prompt:e.target.value})} rows={5} placeholder="Describe the website, audience, pages, style, brand, conversion goal and functionality you want…" className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none"/>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={createFromPrompt} className="flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/[.07] px-3 py-2 text-xs text-violet-100"><Sparkles className="h-3.5 w-3.5"/>Generate starter</button><button disabled={busy||!draft.name||!draft.slug} onClick={save} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"><Save className="h-3.5 w-3.5"/>Save project</button>{draft.id&&<button disabled={busy} onClick={()=>remove(draft.id)} className="flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-3.5 w-3.5"/>Delete</button>}</div>
        </section>

        <section className="rounded-2xl border border-violet-300/10 bg-violet-300/[.025] p-4">
          <div className="flex items-center gap-2 text-violet-300"><Sparkles className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">AI website iteration</span></div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Ask Blackstar to redesign, add pages or sections, improve responsiveness, refine copy structure, or change the visual system. Saved projects get an automatic restore point before each AI change.</p>
          <textarea value={aiInstruction} onChange={e=>setAiInstruction(e.target.value)} rows={3} placeholder="Example: Make this a premium architecture studio site with a full-screen hero, projects grid, dark editorial typography and mobile navigation." className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none"/>
          <div className="mt-3 flex flex-wrap items-center gap-2"><button disabled={busy||aiInstruction.trim().length<5} onClick={runAiIteration} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"><Sparkles className="h-3.5 w-3.5"/>Generate change</button>{aiMeta&&<span className="text-[10px] text-zinc-600">{aiMeta.provider} · {aiMeta.model} · {aiMeta.summary}</span>}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center gap-2 text-cyan-300"><Blocks className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Visual block library</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{WEBSITE_BLOCKS.map(block=><button key={block.id} onClick={()=>addBlock(block.id)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-cyan-300/20"><p className="text-xs font-medium text-white">{block.name}</p><p className="mt-1 text-[10px] text-zinc-600">{block.category}</p></button>)}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-amber-300"><History className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Revision history</span></div><button disabled={!draft.id||busy} onClick={saveRevision} className="rounded-lg border border-amber-300/20 px-2.5 py-1.5 text-[10px] text-amber-200 disabled:opacity-40">Save restore point</button></div>
          <div className="mt-3 space-y-2">{revisions.length===0?<p className="text-xs text-zinc-600">No restore points yet.</p>:revisions.slice(0,8).map(rev=><div key={rev.id} className="flex items-center justify-between rounded-xl border border-white/[.07] p-3"><div><p className="text-xs text-white">{rev.label}</p><p className="mt-1 text-[10px] text-zinc-600">{new Date(rev.created_at).toLocaleString()}</p></div><button onClick={()=>restoreRevision(rev)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400"><RotateCcw className="h-3 w-3"/>Restore</button></div>)}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1">{[['desktop',Monitor],['tablet',Tablet],['mobile',Smartphone]].map(([m,Icon])=><button key={m} onClick={()=>setMode(m)} className={`rounded-lg p-2 ${mode===m?'bg-violet-500/15 text-violet-200':'text-zinc-600'}`}><Icon className="h-4 w-4"/></button>)}</div>
            <div className="flex flex-wrap gap-2"><Link to="/html-studio" className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400"><Code2 className="h-3 w-3"/>HTML Studio</Link><Link to="/developer-workspace" className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400"><Rocket className="h-3 w-3"/>Developer / deploy</Link>{draft.production_url&&<a href={draft.production_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-[10px] text-emerald-300"><ExternalLink className="h-3 w-3"/>Live site</a>}</div>
          </div>
          <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-[#111] p-4"><iframe title="Website Studio preview" sandbox="allow-scripts" srcDoc={preview} className="mx-auto min-h-[660px] rounded-lg bg-white transition-all" style={{width:widths[mode]}}/></div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex gap-2">{['html','css','javascript','pages','design'].map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-3 py-1.5 text-xs ${tab===x?'bg-white text-black':'border border-white/10 text-zinc-500'}`}>{x}</button>)}</div>
          <Editor tab={tab} draft={draft} setDraft={setDraft}/>
        </section>
      </div>
    </div>
  </div>;
}

function Editor({tab,draft,setDraft}){
  if(tab==='pages')return <textarea value={JSON.stringify(draft.pages||[],null,2)} onChange={e=>{try{setDraft({...draft,pages:JSON.parse(e.target.value)})}catch{}}} rows={18} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-200 outline-none"/>;
  if(tab==='design')return <textarea value={JSON.stringify(draft.design_tokens||draft.designTokens||{},null,2)} onChange={e=>{try{setDraft({...draft,design_tokens:JSON.parse(e.target.value)})}catch{}}} rows={18} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-200 outline-none"/>;
  const key=tab==='javascript'?'javascript':tab;
  return <textarea value={draft[key]||''} onChange={e=>setDraft({...draft,[key]:e.target.value})} rows={22} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none"/>;
}
