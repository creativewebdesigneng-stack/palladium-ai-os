import { describe, it, expect } from 'vitest';
import { verifiedApprovedBrowserRead } from '../verified-approved-browser-read';
import { isDomainAllowed } from '@/lib/mission/browser-agent';

const url = 'https://httpbingo.org/html';
const input = { steps: [
  { action: 'navigate', url },
  { action: 'read', selector: 'h1, p' },
], persist_session: false };
const text = 'Herman Melville - Moby-Dick\n\nThe heavy beating of his heart';
const tool = { provider: 'playwright', simulated: false, profile_persisted: false, result: { ok: true, completed_steps: 2, outputs: [
  { action: 'navigate', result: { ok: true, url, simulated: false } },
  { action: 'read', result: { url, text, simulated: false } },
] } };

const extractInput = { steps: [
  { action: 'navigate', url },
  { action: 'extract', fields: [
    { name: 'heading', selector: 'h1' },
    { name: 'first_paragraph', selector: 'p' },
  ] },
], persist_session: false };
const heading = 'Herman Melville - Moby-Dick';
const paragraph = 'Availing himself of the mild weather, and the heavy beating of his heart.';
const extracted = { ...tool, result: { ...tool.result, outputs: [
  tool.result.outputs[0],
  { action: 'extract', result: { url, fields: { heading, first_paragraph: paragraph } } },
] } };

describe('approved browser verbatim evidence', () => {
  it('preserves exact public read text, never the generated model answer', () => {
    const verified = verifiedApprovedBrowserRead(input, tool);
    expect(verified).toMatchObject({ provider: 'playwright', simulated: false, text, characters: text.length });
    expect(verified?.text).toContain('heavy beating of his heart');
  });

  it('preserves exact structured extract field strings and approved order', () => {
    const verified = verifiedApprovedBrowserRead(extractInput, extracted);
    expect(verified).toMatchObject({
      kind: 'approved_public_read', provider: 'playwright', simulated: false, url,
      fields: [{ name: 'heading', text: heading }, { name: 'first_paragraph', text: paragraph }],
      text: heading + '\n\n' + paragraph,
    });
    expect(verified?.characters).toBe(verified?.text.length);
  });

  it('fails closed for simulated, incomplete, unsuccessful or stateful responses', () => {
    expect(verifiedApprovedBrowserRead(input, { ...tool, simulated: true })).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, profile_persisted: true })).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, result: { ...tool.result, completed_steps: 1 } })).toBeNull();
    expect(verifiedApprovedBrowserRead(input, { ...tool, result: { ...tool.result, ok: false } })).toBeNull();
    expect(verifiedApprovedBrowserRead({ ...input, persist_session: true }, tool)).toBeNull();
    expect(verifiedApprovedBrowserRead(extractInput, { ...extracted, simulated: true })).toBeNull();
  });

  it('rejects wrong origins, unapproved fields, missing/duplicate fields and excessive text', () => {
    const foreign = { ...extracted, result: { ...extracted.result, outputs: [
      extracted.result.outputs[0],
      { action: 'extract', result: { url: 'https://evil.example/html', fields: { heading, first_paragraph: paragraph } } },
    ] } };
    expect(verifiedApprovedBrowserRead(extractInput, foreign)).toBeNull();
    const altered = (fields: Record<string, unknown>) => ({
      ...extracted, result: { ...extracted.result, outputs: [
        extracted.result.outputs[0], { action: 'extract', result: { url, fields } },
      ] },
    });
    expect(verifiedApprovedBrowserRead(extractInput, altered({ heading, first_paragraph: paragraph, secret: 'no' }))).toBeNull();
    expect(verifiedApprovedBrowserRead(extractInput, altered({ heading }))).toBeNull();
    expect(verifiedApprovedBrowserRead(extractInput, altered({ heading, first_paragraph: 'x'.repeat(8001) }))).toBeNull();
    expect(verifiedApprovedBrowserRead(extractInput, altered({ heading, first_paragraph: 'bad\u0000text' }))).toBeNull();
    const duplicate = { ...extractInput, steps: [extractInput.steps[0], { action: 'extract', fields: [
      { name: 'heading', selector: 'h1' }, { name: 'heading', selector: 'p' },
    ] }] };
    expect(verifiedApprovedBrowserRead(duplicate, extracted)).toBeNull();
    expect(verifiedApprovedBrowserRead({ ...input, steps: [{ action: 'navigate', url: 'http://httpbingo.org/html' }, input.steps[1]] }, tool)).toBeNull();
  });

  it('rejects unrelated and private-network hosts using the existing domain policy, without navigating', () => {
    const allowed = ['httpbingo.org'];
    expect(isDomainAllowed(url, allowed)).toBe(true);
    expect(isDomainAllowed('https://example.invalid/', allowed)).toBe(false);
    expect(isDomainAllowed('http://127.0.0.1/', allowed)).toBe(false);
    expect(isDomainAllowed('http://192.168.1.10/', allowed)).toBe(false);
    expect(isDomainAllowed('http://10.0.0.1/', allowed)).toBe(false);
  });
});
