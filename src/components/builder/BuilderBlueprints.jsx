import { useMemo, useState } from 'react';
import { Check, Clipboard, Code2, ExternalLink, LayoutTemplate, Sparkles } from 'lucide-react';

const BLUEPRINTS = [
  {
    id: 'saas',
    name: 'SaaS Product',
    source: 'Open SaaS inspired',
    description: 'Production SaaS foundation that reuses PalladiumAI auth, billing, files, email, analytics, background jobs, admin and deployment systems.',
    prompt: `Build a production SaaS application inside PalladiumAI. Reuse the existing PalladiumAI authentication, organisation/RBAC, Stripe billing, Files, notifications/email, Product Analytics, background Workflows/Tasks, audit logging and deployment integrations. Do not create parallel auth, billing, storage, analytics or admin systems. Include responsive public marketing pages, authenticated application shell, onboarding, pricing/billing management, admin controls, tests and deployment-ready environment configuration.`,
    capabilities: ['Native auth + organisations', 'Existing Stripe billing', 'Files + storage', 'Product Analytics', 'Jobs via Tasks/Workflows', 'Admin + audit', 'Deployment-ready'],
  },
  {
    id: 'visual-react',
    name: 'Visual React App',
    source: 'Plasmic inspired',
    description: 'Component-driven visual build brief with reusable design systems, variants, slots, state and real PalladiumAI data sources.',
    prompt: `Build a reusable React application inside PalladiumAI using a visual-component architecture. Create responsive reusable components with variants, slots, state, design tokens and accessible interactions. Bind components to existing PalladiumAI server functions and database/runtime systems instead of mock data. Reuse current auth/RBAC, integrations and deployment flow. Keep generated components editable in code and suitable for HTML Studio/Builder iteration. Include loading, empty, error and permission states plus focused tests.`,
    capabilities: ['Reusable components', 'Variants + slots', 'Responsive states', 'Real data bindings', 'RBAC-aware UI', 'Editable React output', 'Builder + HTML Studio'],
  },
];

export default function BuilderBlueprints() {
  const [selected, setSelected] = useState('saas');
  const [copied, setCopied] = useState(false);
  const blueprint = useMemo(() => BLUEPRINTS.find((item) => item.id === selected) ?? BLUEPRINTS[0], [selected]);
  const copy = async () => {
    await navigator.clipboard.writeText(blueprint.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Native build blueprints</h2></div><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Plasmic and Open SaaS capabilities are folded into PalladiumAI's existing Builder instead of creating another visual builder, authentication stack, billing system or deployment pipeline.</p></div>
      <a href="/html-studio" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">Open HTML Studio <ExternalLink className="h-3.5 w-3.5" /></a>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-2">{BLUEPRINTS.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected === item.id ? 'border-violet-400/30 bg-violet-400/[.08]' : 'border-white/10 bg-black/20 hover:bg-white/[.03]'}`}><p className="text-sm font-medium text-white">{item.name}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-violet-300/70">{item.source}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p></button>)}</div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">{blueprint.name} brief</h3></div><button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy brief'}</button></div><p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/5 bg-[#0d0f15] p-3 text-xs leading-5 text-zinc-400">{blueprint.prompt}</p><div className="mt-3 flex flex-wrap gap-2">{blueprint.capabilities.map((capability) => <span key={capability} className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[10px] text-zinc-400">{capability}</span>)}</div><div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[.04] p-3"><Code2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><p className="text-[11px] leading-5 text-zinc-500">Paste this brief into the existing PalladiumAI Builder request. The current Builder remains responsible for model planning, sandbox installation/build/typecheck/tests, GitHub approval, repair proposals and Vercel deployment.</p></div></div>
    </div>
  </section>;
}
