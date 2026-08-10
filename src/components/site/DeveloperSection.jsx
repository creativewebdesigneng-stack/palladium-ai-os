import { motion } from 'framer-motion';
import { Terminal, Code2, Webhook, KeyRound } from 'lucide-react';

const code = `import { Palladium } from '@palladium/sdk';

const ai = new Palladium({ apiKey: process.env.PA_KEY });

// Run an agent on a task
const result = await ai.agents.run('research-analyst', {
  task: 'Summarize the AI analytics market',
  tools: ['web', 'docs'],
});

console.log(result.summary);`;

const features = [
  ['Full SDK', 'TypeScript-first client for agents, tasks & files.', Code2],
  ['Webhooks', 'React to every event in real time.', Webhook],
  ['API keys', 'Scoped, rotatable keys per workspace.', KeyRound],
  ['CLI', 'Scaffold, deploy, and inspect from your terminal.', Terminal],
];

export default function DeveloperSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">For developers</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">A platform you can build on</h2>
          <p className="mt-3 text-zinc-400">Everything in the dashboard is available programmatically. Ship integrations, internal tools, and whole products on top of PalladiumAI.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {features.map(([t, d, I]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <I className="h-5 w-5 text-violet-300" />
                <p className="mt-2 text-sm font-medium text-white">{t}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-rose-400/70" /><span className="h-3 w-3 rounded-full bg-amber-400/70" /><span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            <span className="ml-3 text-xs text-zinc-500">agent.ts</span>
          </div>
          <pre className="overflow-x-auto p-5 text-xs leading-6 text-zinc-300"><code>{code}</code></pre>
        </motion.div>
      </div>
    </div>
  );
}