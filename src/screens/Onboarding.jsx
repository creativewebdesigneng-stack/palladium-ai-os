import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BrainCircuit, Orbit, Users } from 'lucide-react';

const steps = [
  { number: '01', title: 'Connect intelligence', description: 'Configure the production models your Blackstar agents can use.', to: '/models', icon: BrainCircuit, action: 'Open runtime models' },
  { number: '02', title: 'Establish your organisation', description: 'Invite teammates and define the workspace that governs shared intelligence.', to: '/team', icon: Users, action: 'Open organisation' },
  { number: '03', title: 'Deploy an agent', description: 'Bring your first executable intelligence node online.', to: '/agents/new', icon: Bot, action: 'Deploy agent' },
];

export default function Onboarding() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050507] p-4 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,.16),transparent_34%),linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-violet-300/10 bg-black/55 p-6 shadow-[0_36px_120px_rgba(0,0,0,.48)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/30 to-transparent" />
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.08] shadow-[0_0_36px_rgba(139,92,246,.1)]"><Orbit className="h-7 w-7 text-violet-300" /></span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.3em] text-violet-300/70">BLACKSTAR · INITIALISATION</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Bring your intelligence infrastructure online.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-500">Complete these real platform actions in any order. Every step configures an authoritative part of your Blackstar workspace rather than a simulated onboarding state.</p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map(({ number, title, description, to, icon: Icon, action }) => (
            <Link key={title} to={to} className="group flex min-h-52 flex-col rounded-2xl border border-violet-300/10 bg-white/[.02] p-4 transition hover:border-violet-300/25 hover:bg-violet-400/[.035]">
              <div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[.18em] text-violet-300/70">{number}</span><span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-300/10 bg-black/25"><Icon className="h-4 w-4 text-zinc-500 transition group-hover:text-violet-300" /></span></div>
              <p className="mt-5 text-base font-medium text-white">{title}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p><span className="mt-auto flex items-center gap-1 pt-5 text-xs font-medium text-violet-300">{action} <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-violet-300/[.08] pt-5 sm:flex-row"><p className="text-xs text-zinc-600">Already configured? Return directly to the live command layer.</p><Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 px-5 py-3 text-sm font-semibold text-[#09070d] transition hover:bg-violet-200">Enter Blackstar <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </div>
  );
}
