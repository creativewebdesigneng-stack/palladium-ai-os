import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const builder = readFileSync(new URL('../../../components/mission/AgentBuilder.jsx', import.meta.url), 'utf8');
const missionControl = readFileSync(new URL('../../../screens/MissionControl.jsx', import.meta.url), 'utf8');

describe('Mission Control agent editor input persistence', () => {
  it('uses a stable default integration list so changing form fields does not reset them', () => {
    // Mission Control does not pass connectedIntegrations to AgentBuilder; an
    // inline [] default is a new reference on every render. The useEffect
    // resets the controlled form whenever this reference changes.
    expect(missionControl).toContain('<AgentBuilder ');
    expect(builder).toMatch(/const NO_CONNECTED_INTEGRATIONS = \[\];/);
    expect(builder).toContain('connectedIntegrations = NO_CONNECTED_INTEGRATIONS');
    expect(builder).not.toMatch(/connectedIntegrations\s*=\s*\[\]/);
    expect(builder).toContain('}, [open, initial, connectedIntegrations]);');
  });

  it('keeps controlled text input and explicit save behavior', () => {
    expect(builder).toContain("const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))");
    expect(builder).toContain("onChange={(e) => set('name', e.target.value)}");
    expect(builder).toContain("onChange={(e) => set('purpose', e.target.value)}");
    expect(builder).toContain("onChange={(e) => set('instructions', e.target.value)}");
    expect(builder).toContain("onChange={(e) => set('allowed_domains', e.target.value)}");
    expect(builder).toContain('onSave?.({');
  });
});
