import { describe, it, expect } from 'vitest';
import { verifiedApprovedBrowserRead } from '../verified-approved-browser-read';

const input = { steps: [
  { action: 'navigate', url: 'https://httpbingo.org/html' },
  { action: 'read', selector: 'h1, p' },
], persist_session: false };
const text = 'Herman Melville - Moby-Dick\\n\\nThe heavy beating of his heart';
const tool = { provider: 'playwright', simulated: false, result: { ok: true, completed_steps: 2, outputs: [
  { action: 'navigate', result: { ok: true, url: 'https://httpbingo.org/html', simulated: false } },
  { action: 'read', result: { url: 'https://httpbingo.org/html', text, simulated: false } },
] } };
describe('approved browser verbatim evidence', () => {
  it('returns the exact worker extraction, never the rewritten model answer', () => {
    const verified = verifiedApprovedBrowserRead(input, tool);
    expect(verified).toMatchObject({ provider: 'playwright', simulated: false, text, characters: text.length });
    expect(verified?.text).toContain('heavy beating of his heart');
  });
  it('never calls an unexecuted, simulated, failed or incomplete response verified', () => {
    expect(verifiedApprovedBrowserRead(input, { ...tool, simulated: true })).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, result: { ...tool.result, completed_steps: 1 } })).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, result: { ...tool.result, ok: false } })).toBeNull();
    expect(verifiedApprovedBrowserRead({ ...input, persist_session: true }, tool)).toBeNull();
  });
  it('refuses changed domains, foreign steps, oversized text or non-HTTPS navigation', () => {
    const foreign = { ...tool, result: { ...tool.result, outputs: [
      tool.result.outputs[0], { action: 'read', result: { url: 'https://evil.example/html', text } },
    ] } };
    expect(verifiedApprovedBrowserRead(input, foreign)).toBeNull();
    expect(verifiedApprovedBrowserRead({ ...input, steps: [{ action: 'navigate', url: 'http://httpbingo.org/html' }, input.steps[1]] }, tool)).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, result: { ...tool.result, outputs: [
      tool.result.outputs[0], { action: 'read', result: { url: 'https://httpbingo.org/html', text: 'x'.repeat(8001) } },
    ] } })).toBeNull();
  });
});
