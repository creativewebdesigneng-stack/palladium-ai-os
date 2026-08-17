import { useState } from 'react';
import { Save, Play, Rocket, Send, Loader2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ConfigLeft from '@/components/agent-builder/ConfigLeft';
import LivePreview from '@/components/agent-builder/LivePreview';
import VersionDeployment from '@/components/agent-builder/VersionDeployment';
import AnimatedBrain from '@/components/visual/AnimatedBrain';
import { useToast } from '@/components/ui/use-toast';
import { createAgent, updateAgent } from '@/lib/agents/agents.functions';

const DEFAULT_CONFIG = {
  name: 'Research Agent',
  description: 'Synthesises market briefs from web + internal data.',
  role: 'Market research analyst',
  personality: 'Analytical, concise, helpful',
  instructions: 'Research the topic, cite sources, then summarise key findings with confidence levels.',
  goals: 'Deliver weekly market briefs\nFlag emerging trends',
  rules: 'Never fabricate citations\nFlag low-confidence claims',
  provider: 'openai', model: 'gpt-5-mini',
  temperature: 0.4, context: '128K tokens', reasoning: 'Medium',
  tools: ['web_search', 'web_fetch', 'file_analysis', 'memory_search'],
  memory: ['short', 'long', 'project'],
  permissions: ['read', 'write', 'execute'],
};

export default function AgentBuilder() {
  const { toast } = useToast();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [deployment, setDeployment] = useState('Testing');
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState(null);

  const update = (fn) => setConfig((c) => fn(c));

  const payloadFor = (status) => ({
    name: config.name,
    description: config.description,
    category: config.role || 'custom',
    purpose: [config.role, config.goals].filter(Boolean).join('\n\n'),
    personality: config.personality,
    system_prompt: config.rules,
    model: config.model,
    model_provider: config.provider,
    temperature: config.temperature,
    max_tokens: 4096,
    memory_enabled: (config.memory || []).length > 0,
    requires_approval: true,
    autonomy: (config.permissions || []).includes('execute') ? 'supervised' : 'manual',
    instructions: config.instructions,
    allowed_tools: config.tools || [],
    preferences: {
      context: config.context,
      reasoning: config.reasoning,
      memory_types: config.memory || [],
      permissions: config.permissions || [],
    },
    status,
  });

  const saveAgent = async (status = deployment === 'Published' ? 'active' : 'draft') => {
    setSaving(true);
    try {
      const data = payloadFor(status);
      const saved = agentId
        ? await updateAgent({ data: { id: agentId, ...data } })
        : await createAgent({ data });
      const id = saved?.agent?.id ?? saved?.id ?? agentId ?? null;
      setAgentId(id);
      toast({
        title: status === 'active' ? 'Agent published' : 'Agent saved',
        description: status === 'active'
          ? `${config.name} is active in your AI workforce.`
          : `${config.name} is saved and ready for a real runtime test.`,
      });
      return id;
    } catch (e) {
      console.error('[agent-builder]', e);
      toast({ title: 'Could not save this agent', description: e?.message || 'Please try again.', variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setDeployment('Testing');
    const id = await saveAgent('draft');
    if (id) {
      toast({ title: 'Test mode ready', description: 'Use the console on the right to send a real task to this agent.' });
    }
  };

  const handlePublish = async () => {
    setDeployment('Published');
    await saveAgent('active');
  };

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-25"><AnimatedBrain /></div>
      <PageHeader eyebrow="Builder" title="Agent Builder" description="Design, test and deploy AI agents in a visual environment."
        action={
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={() => saveAgent()} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
            <button disabled={saving} onClick={handleTest} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Play className="h-4 w-4" />Test</button>
            <button disabled={saving} onClick={handlePublish} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Send className="h-4 w-4" />Publish</button>
            <button disabled={saving} onClick={handlePublish} className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90 disabled:opacity-50"><Rocket className="h-4 w-4" />Deploy</button>
          </div>
        } />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]">
          <ConfigLeft config={config} update={update} />
        </div>
        <div className="h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]">
          <LivePreview config={config} agentId={agentId} />
        </div>
      </div>

      <div className="mt-4"><VersionDeployment deployment={deployment} setDeployment={setDeployment} /></div>
    </>
  );
}