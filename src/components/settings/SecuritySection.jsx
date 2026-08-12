import { ShieldCheck } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function SecuritySection() {
  return (
    <Panel icon={ShieldCheck} title="Security" grad="from-rose-500 to-red-500" desc="Authentication and account protection.">
      <NotConfigured icon={ShieldCheck} title="Not configured yet"
        desc="Password changes, two-factor authentication, passkeys and session management aren't available from this screen yet. Manage sign-in through your account provider." />
    </Panel>
  );
}
