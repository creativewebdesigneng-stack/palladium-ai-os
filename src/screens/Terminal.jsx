import { Activity, Cpu, LockKeyhole, Server, TerminalSquare } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function Terminal() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Terminal"
        description="Secure command execution is not enabled in this PalladiumAI deployment."
      />

      <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-100">No live sandbox executor connected</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-amber-100/70">
              PalladiumAI does not currently expose a backend shell from this page. Commands, process lists, environment variables, ports and machine metrics are intentionally unavailable until a properly isolated execution service is connected.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StateCard icon={TerminalSquare} title="Shell" value="Unavailable" text="No command is executed from the browser." />
        <StateCard icon={Cpu} title="CPU & memory" value="No telemetry" text="No fabricated host or container metrics are shown." />
        <StateCard icon={Activity} title="Processes & logs" value="No telemetry" text="Process and log views require a real isolated runtime." />
        <StateCard icon={Server} title="Ports & network" value="No telemetry" text="Listening ports and network state are not simulated." />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Required before terminal execution can be enabled">
          <ul className="space-y-2 text-xs leading-5 text-zinc-400">
            <li>• Per-session isolated container or microVM execution.</li>
            <li>• Strict CPU, memory, filesystem, network and runtime limits.</li>
            <li>• Authentication and workspace ownership checks for every session.</li>
            <li>• Command allow/deny policy, timeouts, output limits and cancellation.</li>
            <li>• Secret redaction plus immutable command and execution audit records.</li>
          </ul>
        </Panel>
        <Panel title="Current safety boundary">
          <p className="text-xs leading-6 text-zinc-400">
            The UI cannot run commands on the PalladiumAI server, the deployment host or your computer. This is intentional. A terminal will only return when there is a real sandbox backend whose isolation and authorization rules can be enforced server-side.
          </p>
        </Panel>
      </div>
    </>
  );
}

function StateCard({ icon: Icon, title, value, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
