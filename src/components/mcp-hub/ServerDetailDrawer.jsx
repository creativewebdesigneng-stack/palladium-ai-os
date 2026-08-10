import { X, Wrench, KeyRound, Database, Users, Activity, ShieldCheck } from 'lucide-react';
import { SECURITY } from './mcpData';

export default function ServerDetailDrawer({ server, onClose, onInstall }) {
  if (!server) return null;
  const sec = SECURITY[server.security];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${server.grad} text-sm font-semibold text-white`}>{server.name[0]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{server.name}</p>
            <p className="text-[11px] text-zinc-500">{server.creator} · v{server.version}</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${sec.cls}`}><ShieldCheck className="mr-1 inline h-2.5 w-2.5" />{sec.label}</span>
          <button onClick={onClose} className="ml-1 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-[13px] leading-relaxed text-zinc-300">{server.desc}</p>

          <Section icon={Wrench} title="Tools">
            <div className="flex flex-wrap gap-1">{server.tools.map(t => <span key={t} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[11px] text-zinc-300">{t}</span>)}</div>
          </Section>

          <Section icon={Database} title="Resources">
            <div className="flex flex-wrap gap-1">{server.resources.map(r => <span key={r} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[11px] text-zinc-300">{r}</span>)}</div>
          </Section>

          <Section icon={KeyRound} title="Permissions">
            <div className="flex flex-wrap gap-1">{server.permissions.map(p => <span key={p} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[11px] font-mono text-zinc-300">{p}</span>)}</div>
          </Section>

          <Section icon={Users} title="Agents using it">
            {server.agents.length ? <div className="space-y-1.5">{server.agents.map(a => <div key={a} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[12px] text-zinc-300"><span className="h-2 w-2 rounded-full bg-violet-400" />{a}</div>)}</div> : <p className="text-[12px] text-zinc-500">No agents using this server yet.</p>}
          </Section>

          <Section icon={Activity} title="Activity">
            {server.activity.length ? <div className="space-y-2">{server.activity.map((e, i) => <div key={i} className="flex gap-2"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" /><div><p className="text-[12px] text-zinc-300">{e.a}</p><p className="text-[10px] text-zinc-600">{e.t}</p></div></div>)}</div> : <p className="text-[12px] text-zinc-500">No recent activity.</p>}
          </Section>
        </div>
        <div className="border-t border-white/10 p-3">
          {server.installed ? (
            <span className="flex items-center justify-center gap-1 rounded-xl border border-emerald-400/20 bg-emerald-400/10 py-2.5 text-sm text-emerald-300">Installed</span>
          ) : (
            <button onClick={onInstall} className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-medium text-white hover:bg-violet-600">Install server</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500"><Icon className="h-3.5 w-3.5" />{title}</p>
      {children}
    </div>
  );
}