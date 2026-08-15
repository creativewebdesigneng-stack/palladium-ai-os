import { Link } from 'react-router-dom';
import { Bot, Library, MessageSquare, Save, Play, History } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const capabilities = [
  {
    icon: Save,
    title: 'Prompt storage',
    status: 'Not connected',
    text: 'There is no persisted prompt-library backend yet, so this page does not invent saved prompts, favourites or versions.',
  },
  {
    icon: Play,
    title: 'Prompt execution',
    status: 'Use live runtime',
    text: 'Prompt runs belong on provider-backed chat or agent runtime surfaces where the real model response and usage can be recorded.',
  },
  {
    icon: History,
    title: 'Run history',
    status: 'Not connected',
    text: 'Execution history will appear here only after prompt runs have a durable backend record.',
  },
];

export default function Prompts() {
  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Prompt Workspace"
        description="Prompt-library persistence and prompt-specific execution history are not connected yet. Sample templates, saved prompts and fake run history have been removed."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {capabilities.map(({ icon: Icon, title, status, text }) => (
          <section key={title} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</p>
            <p className="mt-1 text-sm font-semibold text-white">{status}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
          </section>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-sm font-semibold text-white">Live alternatives</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          These existing areas already use real workspace or runtime data. Use them until a dedicated prompt store is implemented.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Destination to="/chat" icon={MessageSquare} title="Chat" text="Run prompts against the configured AI runtime." />
          <Destination to="/templates" icon={Library} title="Templates" text="Browse the persisted marketplace/template system." />
          <Destination to="/agents" icon={Bot} title="Agents" text="Store durable instructions and model configuration on real agent records." />
        </div>
      </section>
    </>
  );
}

function Destination({ to, icon: Icon, title, text }) {
  return (
    <Link to={to} className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[.04]">
      <span className="flex items-center gap-2 text-sm font-medium text-white"><Icon className="h-4 w-4 text-violet-300" />{title}</span>
      <span className="mt-1 block text-[11px] leading-5 text-zinc-500">{text}</span>
    </Link>
  );
}
