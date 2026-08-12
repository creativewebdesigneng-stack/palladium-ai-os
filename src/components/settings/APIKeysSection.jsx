import { KeyRound } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function APIKeysSection() {
  return (
    <Panel icon={KeyRound} title="API Keys" grad="from-sky-500 to-cyan-500" desc="Create and revoke API keys. Secrets are never fully shown.">
      <NotConfigured icon={KeyRound} title="Not configured yet"
        desc="Programmatic API key issuance isn't available yet. You have no active keys." />
    </Panel>
  );
}
