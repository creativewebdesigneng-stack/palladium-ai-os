import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preview = readFileSync('src/components/agent-builder/LivePreview.jsx', 'utf8');
describe('agent builder preview runtime event contract', () => {
  it('renders the runtime text and message fields rather than obsolete aliases', () => {
    expect(preview).toContain('appendDelta(event.text)');
    expect(preview).toContain('text: event.message');
    expect(preview).not.toMatch(/event\.(delta|error|tool)\b/);
  });
  it('distinguishes tool completion from blocked or failed execution', () => {
    expect(preview).toContain("name: event.name || 'Tool'");
    expect(preview).toContain("event.ok ? 'completed' : 'blocked or failed'");
  });
});
