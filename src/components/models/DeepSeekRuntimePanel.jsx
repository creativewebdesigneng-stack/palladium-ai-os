import { Cpu, Gauge, Network, Server, Sparkles } from 'lucide-react';
import { DEEPSEEK_ARCHITECTURE_FEATURES, DEEPSEEK_RUNTIME_OPTIONS, DEEPSEEK_V3_PROFILES } from '@/lib/runtime/deepseek-v3-profiles';

export default function DeepSeekRuntimePanel({ configured }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[.06] via-white/[.025] to-violet-500/[.05]">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Sparkles className="h-5 w-5" /></div>
          <div><h2 className="text-sm font-semibold text-white">DeepSeek V3 Runtime</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-400">Hosted and self-hosted DeepSeek V3/V3.1 support through PalladiumAI's existing provider-neutral model gateway. Credentials stay server-side; agents retain the same Harness, tools, approvals, memory and audit controls.</p></div>
          <span className={`ml-auto rounded-full border px-2.5 py-1 text-[10px] font-medium ${configured ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}>{configured ? 'Hosted runtime configured' : 'Add DEEPSEEK_API_KEY to activate'}</span>
        </div>
      </div>
      <div className="grid gap-4 p-5 xl:grid-cols-[1.4fr_.8fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEEPSEEK_V3_PROFILES.map((profile) => (
              <article key={profile.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-cyan-300" /><p className="text-xs font-semibold text-white">{profile.label}</p></div>
                <p className="mt-2 text-[11px] text-violet-200">{profile.parameters}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-500"><span>{profile.layers} layers</span><span>{profile.heads} heads</span><span>{profile.routedExperts} routed experts</span><span>{profile.activatedExperts} active/token</span><span>{profile.dtype.toUpperCase()}</span><span>{(profile.contextTokens / 1000).toFixed(0)}K context</span></div>
              </article>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Info icon={Network} title="Architecture" items={DEEPSEEK_ARCHITECTURE_FEATURES} />
          <Info icon={Server} title="Deployment runtimes" items={DEEPSEEK_RUNTIME_OPTIONS} />
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Gauge className="h-4 w-4 text-cyan-300" />Endpoint contract</div><p className="mt-2 text-[10px] leading-5 text-zinc-500">Hosted: DEEPSEEK_API_KEY with optional DEEPSEEK_BASE_URL. Self-hosted SGLang, vLLM, LMDeploy and compatible servers use PalladiumAI's existing OpenAI-compatible endpoint configuration.</p></div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, title, items }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Icon className="h-4 w-4 text-cyan-300" />{title}</div><ul className="mt-2 space-y-1 text-[10px] leading-4 text-zinc-500">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
