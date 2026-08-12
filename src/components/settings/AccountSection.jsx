import { Globe } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function AccountSection() {
  return (
    <Panel icon={Globe} title="Account" grad="from-sky-500 to-cyan-500" desc="Localisation and regional preferences.">
      <NotConfigured icon={Globe} title="Not configured yet"
        desc="Language, timezone, date format and currency preferences aren't stored yet. This section will activate once account preferences are wired up on the backend." />
    </Panel>
  );
}
