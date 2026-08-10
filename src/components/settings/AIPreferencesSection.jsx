import { Sparkles } from 'lucide-react';
import { Panel, Field, Select, ToggleRow } from './shared';
import { AI_MODELS, AGENTS, RESPONSE_STYLES } from './settingsData';

export default function AIPreferencesSection({ data, update }) {
  return (
    <Panel icon={Sparkles} title="AI Preferences" grad="from-violet-500 to-indigo-500" desc="Defaults applied across chat, agents and workflows.">
      <div className="space-y-4">
        <Field label="Default Model" hint="Used when no model is selected.">
          <Select value={data.defaultModel} onChange={(v) => update('defaultModel', v)} options={AI_MODELS.map((m) => `${m.name} · ${m.provider}`)} />
        </Field>
        <Field label="Response Style">
          <Select value={data.responseStyle} onChange={(v) => update('responseStyle', v)} options={RESPONSE_STYLES} />
        </Field>
        <Field label="Default Agent">
          <Select value={data.defaultAgent} onChange={(v) => update('defaultAgent', v)} options={AGENTS.map((a) => a.name)} />
        </Field>
        <ToggleRow label="AI Memory" desc="Let agents remember context across conversations." checked={data.memory} onChange={(v) => update('memory', v)} />
        <ToggleRow label="Automatic Tool Usage" desc="Allow agents to call tools without asking first." checked={data.autoTools} onChange={(v) => update('autoTools', v)} />
        <ToggleRow label="Confirmation Requirements" desc="Require approval before destructive actions." checked={data.confirmation} onChange={(v) => update('confirmation', v)} />
      </div>
    </Panel>
  );
}

export const initialAIPreferences = {
  defaultModel: `${AI_MODELS[0].name} · ${AI_MODELS[0].provider}`,
  responseStyle: 'Balanced',
  defaultAgent: AGENTS[0].name,
  memory: true,
  autoTools: false,
  confirmation: true,
};