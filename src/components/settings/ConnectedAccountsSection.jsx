import { Link2 } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function ConnectedAccountsSection() {
  return (
    <Panel icon={Link2} title="Connected Accounts" grad="from-indigo-500 to-violet-500" desc="Link external services to your account.">
      <NotConfigured icon={Link2} title="Not configured yet"
        desc="OAuth connections to Google, Microsoft, GitHub, Slack and Discord aren't wired up yet. Nothing is connected." />
    </Panel>
  );
}
