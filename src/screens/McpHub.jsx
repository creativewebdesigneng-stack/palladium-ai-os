import { Copy, KeyRound, LockKeyhole, Server, ShieldCheck, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS } from '@/lib/mcp/catalog';

const ACCESS = {
  read: { label: 'Read only', cls: 'border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300' },
  write: { label: 'Writes data', cls: 'border-sky-400/20 bg-sky-400/[.08] text-sky-300' },
  approval: { label: 'Consequential approval', cls: 'border-amber-400/20 bg-amber-400/[.08] text-amber-200' },
};

const GROUPS = ['Agents', 'Mission Control', 'Approvals', 'Memory'];

function copy(value) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(value);
}

export default function McpHub() {
  const reads = PALLADIUM_MCP_TOOLS.filter((tool) => tool.access === 'read').length;
  const writes = PALLADIUM_MCP_TOOLS.length - reads;

  return (
    <>
      <PageHeader
        eyebrow="MCP"
        title="MCP Hub"
        description="The live Model Context Protocol surface bundled with PalladiumAI. This page shows the server and tools that actually ship with the application."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-400"><Server className="h-4 w-4" /><span className="text-[11px] uppercase tracking-[.14em]">Server</span></div>
          <p className="text-lg font-semibold text-white">{PALLADIUM_MCP_SERVER.title}</p>
          <p className="mt-1 text-[11px] text-zinc-500">v{PALLADIUM_MCP_SERVER.version} · bundled</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-400"><Wrench className="h-4 w-4" /><span className="text-[11px] uppercase tracking-[.14em]">Tools</span></div>
          <p className="text-lg font-semibold text-white">{PALLADIUM_MCP_TOOLS.length}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{reads} read · {writes} write/approval</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-400"><LockKeyhole className="h-4 w-4" /><span className="text-[11px] uppercase tracking-[.14em]">Authentication</span></div>
          <p className="text-sm font-semibold text-white">{PALLADIUM_MCP_SERVER.auth}</p>
          <p className="mt-1 text-[11px] text-zinc-500">User-scoped bearer identity</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-400"><ShieldCheck className="h-4 w-4" /><span className="text-[11px] uppercase tracking-[.14em]">Scope</span></div>
          <p className="text-sm font-semibold text-white">Private user data</p>
          <p className="mt-1 text-[11px] text-zinc-500">Agents, missions, approvals, memory</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-violet-400/15 bg-violet-400/[.04] p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-semibold text-white">Protocol endpoints</h3>
        </div>
        <p className="mb-3 max-w-3xl text-xs leading-5 text-zinc-400">
          PalladiumAI exposes an OAuth-protected MCP resource. External MCP clients must authenticate as the user; the browser UI does not store or reveal service-role credentials.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            ['MCP resource', PALLADIUM_MCP_SERVER.resourcePath],
            ['Tool discovery', PALLADIUM_MCP_SERVER.listToolsPath],
          ].map(([label, path]) => (
            <div key={path} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.12em] text-zinc-500">{label}</p>
                <code className="text-xs text-zinc-200">{path}</code>
              </div>
              <button onClick={() => copy(path)} className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.06] hover:text-white" aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {GROUPS.map((group) => {
          const tools = PALLADIUM_MCP_TOOLS.filter((tool) => tool.area === group);
          return (
            <section key={group}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{group}</h3>
                <span className="text-[11px] text-zinc-500">{tools.length} tools</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {tools.map((tool) => {
                  const access = ACCESS[tool.access];
                  return (
                    <article key={tool.name} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{tool.title}</p>
                          <code className="text-[11px] text-violet-300">{tool.name}</code>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${access.cls}`}>{access.label}</span>
                      </div>
                      <p className="text-xs leading-5 text-zinc-400">{tool.description}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[.05] px-4 py-3 text-xs leading-5 text-amber-100/80">
        <strong className="text-amber-100">Approval safety:</strong> the <code>decide_approval</code> tool can only reject a pending request. Consequential approvals — including anything involving money — must be confirmed by the user in the Approval Centre, so spend limits and execution gates cannot be bypassed over MCP.
      </div>

    </>
  );
}
