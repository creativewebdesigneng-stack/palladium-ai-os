import { Palette } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function AppearanceSection() {
  return (
    <Panel icon={Palette} title="Appearance" grad="from-fuchsia-500 to-pink-500" desc="Customise how PalladiumAI looks and feels.">
      <NotConfigured icon={Palette} title="Not configured yet"
        desc="Theme, accent colour and layout density preferences aren't stored yet. This section will activate once appearance preferences are wired up on the backend." />
    </Panel>
  );
}
