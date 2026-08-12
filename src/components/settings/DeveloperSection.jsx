import { Code2 } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function DeveloperSection() {
  return (
    <Panel icon={Code2} title="Developer Settings" grad="from-zinc-500 to-zinc-700" desc="Advanced controls for builders and integrators.">
      <NotConfigured icon={Code2} title="Not configured yet"
        desc="Developer mode, debug logging and webhook configuration aren't wired up yet." />
    </Panel>
  );
}
