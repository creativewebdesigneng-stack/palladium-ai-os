import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Users, Workflow, Bot } from 'lucide-react';

export default function WorkforceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <div className="absolute -inset-10 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_50px_rgba(139,92,246,.4)]">
          <Sparkles className="h-12 w-12 text-white" />
        </div>
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Build your AI workforce</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">Create teams of AI employees that work together like a real company — managers delegate, specialists execute, and your business runs itself.</p>

      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {[[Users, 'Hire AI employees', 'Assign roles, models & tools'], [Workflow, 'Form departments', 'Group agents into teams'], [Bot, 'Automate the work', 'Tasks run autonomously']].map(([Icon, t, d], i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium text-white">{t}</p>
            <p className="text-xs text-zinc-500">{d}</p>
          </div>
        ))}
      </div>

      <Link to="/agents/new" className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30">
        Create Workforce <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}