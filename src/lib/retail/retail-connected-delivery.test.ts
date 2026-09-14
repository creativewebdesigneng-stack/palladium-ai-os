import { describe, expect, it } from 'vitest';
import { parseRetailEmailPayload, retailProviderMessageId } from './retail-connected-delivery';

describe('Retail connected delivery validation', () => {
  it('normalizes a governed email payload and supplies a safe default subject', () => {
    const payload = parseRetailEmailPayload({
      channel: 'email',
      purpose: 'followup',
      recipient: ' customer@example.com ',
      body: ' Thanks for contacting us. ',
    });

    expect(payload).toEqual({
      channel: 'email',
      purpose: 'followup',
      recipient: 'customer@example.com',
      subject: 'Customer-service update',
      body: 'Thanks for contacting us.',
    });
  });

  it('rejects an invalid recipient before any provider call can occur', () => {
    expect(() => parseRetailEmailPayload({
      channel: 'email',
      recipient: 'not-an-email',
      body: 'Hello',
    })).toThrow();
  });

  it('extracts bounded provider message identifiers without inventing one', () => {
    expect(retailProviderMessageId({ message_id: ' gmail-message-1 ' })).toBe('gmail-message-1');
    expect(retailProviderMessageId({ id: 'provider-id-2' })).toBe('provider-id-2');
    expect(retailProviderMessageId({ accepted: true })).toBeNull();
  });
});
