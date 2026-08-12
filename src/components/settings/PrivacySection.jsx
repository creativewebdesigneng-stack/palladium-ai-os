import { Lock } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function PrivacySection() {
  return (
    <Panel icon={Lock} title="Privacy" grad="from-emerald-500 to-teal-500" desc="Control how your data is used.">
      <NotConfigured icon={Lock} title="Not configured yet"
        desc="Data sharing, analytics and AI-training preferences aren't stored yet. This section will activate once privacy controls are wired up on the backend." />
    </Panel>
  );
}
