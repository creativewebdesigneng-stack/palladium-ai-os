import { useState } from 'react';
import { Save, Play, Rocket, Send } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ConfigLeft from '@/components/agent-builder/ConfigLeft';
import LivePreview from '@/components/agent-builder/LivePreview';
import VersionDeployment from '@/components/agent-builder/VersionDeployment';
import AnimatedBrain from '@/components/visual/AnimatedBrain';

const DEFAULT_CONFIG = {
  name: 'Research Agent',
  description: 'Synthesises market briefs from web + internal data.',
  role: 'Market research analyst',
  personality: 'Analytical, concise, helpful',
  instructions: 'Research the topic, cite sources, then summarise key findings with confidence levels.',
  goals: 'Deliver weekly market briefs\nFlag emerging trends',
  rules: 'Never fabricate citations\nFlag low-confidence claims',
  provider: 'anthropic', model: 'Claude Sonnet 4.6',
  temperature: 0.4, context: '128K tokens', reasoning: 'Medium',
  tools: ['web_search', 'files', 'slack'],
  memory: ['short', 'long', 'project'],
  permissions: ['read', 'write', 'execute'],
};

export default function AgentBuilder() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [deployment, setDeployment] = useState('Testing');

  const update = (fn) => setConfig((c) => fn(c));

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-25"><AnimatedBrain /></div>
      <PageHeader eyebrow="Builder" title="Agent Builder" description="Design, test and deploy AI agents in a visual environment."
        action={
          <div className="flex flex-wrap gap-2">
            <button className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Save className="h-4 w-4" />Save</button>
            <button className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Play className="h-4 w-4" />Test</button>
            <button className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Send className="h-4 w-4" />Publish</button>
            <button className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90"><Rocket className="h-4 w-4" />Deploy</button>
          </div>
        } />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]">
          <ConfigLeft config={config} update={update} />
        </div>
        <div className="h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]">
          <LivePreview config={config} />
        </div>
      </div>

      <div className="mt-4"><VersionDeployment deployment={deployment} setDeployment={setDeployment} /></div>
    </>
  );
}