import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, KeyRound, Server, Gauge, Headset, ArrowRight, Check } from 'lucide-react';

const PERKS = [
  { icon: KeyRound, title: 'SSO & SAML', desc: 'Single sign-on with your identity provider.' },
  { icon: ShieldCheck, title: 'Security & compliance', desc: 'SOC2, audit logs and data residency options.' },
  { icon: Server, title: 'On-premise options', desc: 'Deploy in your cloud or on your infrastructure.' },
  { icon: Gauge, title: 'Dedicated infrastructure', desc: 'Isolated capacity with guaranteed performance.' },
  { icon: Headset, title: 'Priority support & SLA', desc: 'Dedicated success manager and uptime guarantees.' },
  { icon: Building2, title: 'Custom models', desc: 'Bring or fine-tune models for your use case.' },
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
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Need scale, security and control?</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              Enterprise is built for organisations running AI across hundreds or thousands of users — with the governance, infrastructure and support to match.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/payment?plan=enterprise-plus" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Contact Sales <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
                View Plans
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
              >
                <p.icon className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-semibold text-white">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-xs text-zinc-400">
          {['SOC2 Type II', 'GDPR ready', 'Custom SLAs', 'Data residency', 'Dedicated support'].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> {t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}