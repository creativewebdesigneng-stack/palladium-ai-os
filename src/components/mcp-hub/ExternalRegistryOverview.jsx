import { useState } from 'react';
import CustomServerForm from './CustomServerForm';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCcw, Server, ShieldCheck } from 'lucide-react';
import { getExternalMcpRegistryOverview, saveExternalMcpServer } from '@/lib/mcp/mcp.functions';

export default function ExternalRegistryOverview(){
  const [adding,setAdding]=useState(false);
  const save=useServerFn(saveExternalMcpServer);
  const load=useServerFn(getExternalMcpRegistryOverview);
  const query=useQuery({queryKey:['external-mcp-registry-overview'],queryFn:()=>load({data:{}}),retry:false});
  const servers=query.data?.servers??[];
  return <section className="mb-6 rounded-2xl border border-violet-400/15 bg-white/[.025] p-4" aria-label="External MCP registry">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Server className="h-4 w-4 text-violet-300"/>Your external MCP servers</h2>
      <button type="button" onClick={()=>void query.refetch()} disabled={query.isFetching}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 disabled:opacity-40">
        <RefreshCcw className="h-3.5 w-3.5"/>Refresh external registry
      </button>
    </div>
    <button type="button" onClick={()=>setAdding(true)} className="mt-3 rounded-lg border border-violet-400/30 px-3 py-2 text-xs text-violet-200">Register disabled server</button>
    {adding&&<CustomServerForm onClose={()=>setAdding(false)} onSave={async data=>{await save({data});await query.refetch();}}/>}
    <p className="mt-2 text-xs leading-5 text-zinc-400">Your saved server configurations and last discovery state. A saved or enabled server is not proof of current reachability, authentication or tenant isolation.</p>
    {query.isPending&&<p className="mt-3 text-xs text-zinc-400">Checking your authorised server registry…</p>}
    {query.error&&<p role="alert" className="mt-3 text-xs text-rose-300">{query.error instanceof Error?query.error.message:'Could not verify your server registry.'}</p>}
    {query.isSuccess&&<>
      <p className="mt-3 text-xs text-zinc-300">{servers.length} registered · {servers.filter(server=>server.enabled).length} enabled</p>
      {servers.length===0&&<p className="mt-2 text-xs text-zinc-500">No external MCP servers are registered for your account.</p>}
      {query.data.truncated&&<p className="mt-2 text-xs text-amber-200">Showing the first 100 saved servers.</p>}
      <div className="mt-3 grid max-h-80 gap-2 overflow-auto md:grid-cols-2">
        {servers.map(server=><article key={server.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h3 className="text-xs font-semibold text-white">{server.name}</h3>
          <p className="mt-1 text-[11px] text-zinc-400">{server.enabled?'Enabled configuration':'Disabled'} · {server.cachedToolCount} cached tools</p>
          <p className="mt-1 text-[11px] text-zinc-500">{server.lastDiscoveredAt?`Last discovered: ${server.lastDiscoveredAt}`:'Never discovered'}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{server.requiresApproval?'Server approval required':'Agent tool actions still require approval'} · {server.allowedToolCount?`${server.allowedToolCount} tool names restricted`:'No server tool-name restriction configured'}</p>
        </article>)}
      </div>
    </>}
    <div className="mt-4 grid gap-2 text-xs leading-5 text-zinc-400 md:grid-cols-3">
      <p className="rounded-xl border border-white/10 p-3"><strong className="text-zinc-200">OpenViking</strong><br/>Needs licensing review and an authenticated, tenant-isolated HTTPS MCP service.</p>
      <p className="rounded-xl border border-white/10 p-3"><strong className="text-zinc-200">AgentMemory</strong><br/>Needs a reviewed HTTPS gateway. Its standalone stdio server cannot be connected directly here.</p>
      <p className="rounded-xl border border-white/10 p-3"><strong className="text-zinc-200">Browser Use</strong><br/>Blackstar uses its existing governed Playwright worker. The external Python runtime is not connected.</p>
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-zinc-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>This view does not contact external servers, reveal credentials, enable tools or synchronise memory.</p>
  </section>;
}
