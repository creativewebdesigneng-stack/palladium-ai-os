import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Bot,ExternalLink,Loader2,PlayCircle,ShieldCheck,Workflow} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '@/components/ui/use-toast';
import {friendlyMessage} from '@/lib/errors';
import {useSessionReady} from '@/lib/useSessionReady';
import {listAgents} from '@/lib/agents/agents.functions';
import {importWorkflow} from '@/lib/tasks/tasks.functions';
import {buildDropshippingAutomationDefinition,DROPSHIPPING_AUTOMATION_TEMPLATES} from '@/lib/dropshipping/dropshipping-automations';

const panel='rounded-2xl border border-white/10 bg-white/[.03] p-5';
const control='w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function DropshippingAutomationPack(){
  const session=useSessionReady();
  const navigate=useNavigate();
  const {toast}=useToast();
  const [agentId,setAgentId]=useState('');
  const [operationName,setOperationName]=useState('');
  const [creating,setCreating]=useState('');

  const agentsQuery=useQuery({
    queryKey:['dropshipping-automation-agents'],
    queryFn:()=>listAgents({data:{limit:200,withTasks:false}}),
    enabled:session==='yes',
    retry:false,
  });
  const agents=useMemo(()=>((agentsQuery.data?.agents??[]).filter(agent=>{
    const source=agent?.preferences?.source;
    return source==='dropshipping-hub'||String(agent?.category||'').toLowerCase()==='commerce';
  })),[agentsQuery.data]);

  const createTemplate=async(template)=>{
    if(!agentId||creating)return;
    setCreating(template.id);
    try{
      const definition=buildDropshippingAutomationDefinition({templateId:template.id,agentId,operationName});
      const result=await importWorkflow({data:{definition}});
      toast({
        title:'Dropshipping automation created',
        description:`${result.name} was saved as a draft with ${result.steps} steps. Review it in Workflows before activation.`,
      });
    }catch(error){
      toast({variant:'destructive',title:'Could not create automation',description:friendlyMessage(error)});
    }finally{setCreating('');}
  };

  if(session==='no')return null;
  return <section className={`${panel} mt-5`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10"><Workflow className="h-4 w-4 text-indigo-300"/></span>
        <div>
          <h2 className="text-sm font-semibold text-white">Dropshipping Automation Pack</h2>
          <p className="mt-1 max-w-4xl text-[11px] leading-5 text-zinc-500">Provision supervised Blackstar workflows for recurring product research, supplier monitoring, listing review, order exceptions and support triage. Templates use your existing agents and workflow runtime; they are always created as drafts and never bypass Mission Control approvals.</p>
        </div>
      </div>
      <button onClick={()=>navigate('/workflows')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">Open Workflows <ExternalLink className="ml-1 inline h-3 w-3"/></button>
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <label><span className="mb-1.5 block text-[10px] uppercase tracking-[.12em] text-zinc-500">Dropshipping / Commerce agent</span><select className={control} value={agentId} onChange={e=>setAgentId(e.target.value)}><option value="">Choose an existing supervised agent</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.name} · {agent.status}</option>)}</select></label>
      <label><span className="mb-1.5 block text-[10px] uppercase tracking-[.12em] text-zinc-500">Operation / store label (optional)</span><input className={control} value={operationName} onChange={e=>setOperationName(e.target.value)} placeholder="e.g. North Star Goods"/></label>
    </div>

    {agentsQuery.isFetching&&<div className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading your agents…</div>}
    {agentsQuery.error&&<div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[.05] p-3 text-xs text-rose-200">{friendlyMessage(agentsQuery.error)}</div>}
    {!agentsQuery.isFetching&&!agents.length&&<div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.04] p-3 text-[11px] text-amber-200"><Bot className="mr-1 inline h-3.5 w-3.5"/>Create a Dropshipping AI agent in the section above first, or use an existing Commerce agent.</div>}

    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {DROPSHIPPING_AUTOMATION_TEMPLATES.map(template=><article key={template.id} className="flex flex-col rounded-xl border border-white/[.08] bg-black/20 p-4">
        <div className="flex items-start gap-2"><PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"/><div><p className="text-xs font-medium text-white">{template.name.replace('Dropshipping · ','')}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-zinc-600">{template.trigger_type}{template.schedule?` · ${template.schedule}`:''}</p></div></div>
        <p className="mt-3 flex-1 text-[10px] leading-4 text-zinc-500">{template.description}</p>
        <button disabled={!agentId||Boolean(creating)} onClick={()=>createTemplate(template)} className="mt-3 rounded-lg border border-indigo-400/20 px-2.5 py-2 text-[10px] text-indigo-200 disabled:opacity-40">{creating===template.id?'Creating…':'Create draft workflow'}</button>
      </article>)}
    </div>

    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[.03] p-3 text-[10px] leading-4 text-zinc-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"/><p>Scheduled templates do not become active until the owner reviews and activates them. Supplier purchases, listing publication, refunds, fulfilment changes, advertising spend and other external writes remain governed by Blackstar's existing approval and integration controls.</p></div>
  </section>;
}
