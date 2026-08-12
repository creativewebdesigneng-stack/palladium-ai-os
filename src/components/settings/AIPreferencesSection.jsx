import { Sparkles } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function AIPreferencesSection() {
  return (
    <Panel icon={Sparkles} title="AI Preferences" grad="from-violet-500 to-indigo-500" desc="Defaults applied across chat, agents and workflows.">
      <NotConfigured icon={Sparkles} title="Not configured yet"
        desc="Default model, response style and agent memory preferences aren't stored yet. This section will activate once AI preferences are wired up on the backend." />
    </Panel>
  );
}
