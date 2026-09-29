import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Building2,
  KeyRound,
  Network,
  Route,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

const CAPABILITIES = [
  { icon: ShieldCheck, title: 'Approval governance', desc: 'Keep consequential external writes on Blackstar’s existing approval and policy rails.' },
  { icon: Activity, title: 'Operational visibility', desc: 'Inspect live runtime state, failures, activity and audit evidence across governed work.' },
  { icon: Network, title: 'Multi-provider integrations', desc: 'Connect services through provider-specific OAuth, APIs and MCP without locking the platform to one connector.' },
  { icon: KeyRound, title: 'Authenticated workspaces', desc: 'Use signed-in workspace boundaries and scoped data access across supported product surfaces.' },
  { icon: Route, title: 'Existing workflow infrastructure', desc: 'Reuse durable workflows, agents, approvals and runtime routing instead of duplicating control systems.' },
  { icon: Building2, title: 'Business operating surfaces', desc: 'Coordinate Company, Industry, Finance, Retail and other operating hubs from the same Blackstar platform.' },
];

export default function EnterpriseSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-[#0c0d14] to-violet-500/15 p-10 sm:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(245,158,11,.2),transparent_55%)]" />
        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-zinc-300">
              <Building2 className="h-3.5 w-3.5 text-amber-400" /> Enterprise
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Governed intelligence infrastructure for larger operations.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              Blackstar’s enterprise direction builds on the same bounded intelligence, provider routing, approval, audit and runtime architecture already used across the platform.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/pricing" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Review plans <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/business" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
                Explore business
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((capability, index) => (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
              >
                <capability.icon className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-semibold text-white">{capability.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{capability.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
