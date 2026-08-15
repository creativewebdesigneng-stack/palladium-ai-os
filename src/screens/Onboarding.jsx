import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BrainCircuit, Sparkles, Users } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Connect models',
    description: 'Configure the AI models your agents can use.',
    to: '/models',
    icon: BrainCircuit,
    action: 'Open models',
  },
  {
    number: '02',
    title: 'Invite your team',
    description: 'Add teammates and manage your workspace together.',
    to: '/team',
    icon: Users,
    action: 'Open team',
  },
  {
    number: '03',
    title: 'Build an agent',
    description: 'Create your first production AI agent.',
    to: '/agents/new',
    icon: Bot,
    action: 'Create agent',
  },
];

export default function Onboarding() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0c0d13] p-4 text-white">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <Sparkles />
          </span>
          <p className="mt-6 text-xs font-medium uppercase tracking-[.25em] text-violet-400">Welcome to PalladiumAI</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Set up your AI workspace.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            Use these real workspace actions in any order. You can return here from Quick start on your dashboard whenever you need it.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map(({ number, title, description, to, icon: Icon, action }) => (
            <Link
              key={title}
              to={to}
              className="group flex min-h-48 flex-col rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-violet-400/40 hover:bg-white/[.05]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-violet-400">{number}</span>
                <Icon className="h-5 w-5 text-zinc-500 transition group-hover:text-violet-300" />
              </div>
              <p className="mt-5 text-base font-medium text-white">{title}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
              <span className="mt-auto flex items-center gap-1 pt-5 text-xs font-medium text-violet-300">
                {action} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
          <p className="text-xs text-zinc-500">Already set up? Go straight back to your live workspace.</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
            Enter workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
