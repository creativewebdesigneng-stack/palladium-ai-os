import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const twilio = readFileSync(new URL('./twilio-provider.server.ts', import.meta.url), 'utf8');
const communications = readFileSync(new URL('./communications.functions.ts', import.meta.url), 'utf8');
const automation = readFileSync(new URL('./automation-dispatch.server.ts', import.meta.url), 'utf8');
const callbacks = readFileSync(new URL('../../routes/api/public/communications/twilio/message-status.ts', import.meta.url), 'utf8');
const aiCall = readFileSync(new URL('./ai-call.server.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../../screens/PhoneCommunications.jsx', import.meta.url), 'utf8');

describe('communication timeout reconciliation', () => {
  it('uses a bounded provider deadline and classifies transport uncertainty as ambiguous', () => {
    expect(twilio).toContain('TWILIO_REQUEST_TIMEOUT_MS = 8_000');
    expect(twilio).toContain('TwilioDispatchAmbiguousError');
    expect(twilio).toContain("dispatchOutcome: 'ambiguous'");
    expect(twilio).toContain('isAmbiguousTwilioDispatchError');
  });

  it('binds SMS status callbacks to the Blackstar communication event', () => {
    expect(communications).toContain("message-status', { event: event.id }");
    expect(automation).toContain('message-status", { event: event.data.id }');
    expect(callbacks).toContain("searchParams.get('event')");
    expect(callbacks).toContain('processSmsStatus(params, eventId || undefined)');
    expect(aiCall).toContain("query = eventId ? query.eq('id', eventId) : query.eq('provider_id', sid)");
    expect(aiCall).toContain('provider_id: sid');
  });

  it('blocks blind retries when provider acceptance is unknown', () => {
    expect(communications).toContain('automatic_retry_blocked: true');
    expect(communications).toContain("delivery_unknown: true");
    expect(automation).toContain('return "pending"');
    expect(automation).toContain('reconciliation_pending: true');
  });

  it('does not regress callback-confirmed state with a late initial response', () => {
    expect(communications).toContain(".eq('status', 'sending')");
    expect(communications).toContain(".eq('status', 'queued')");
    expect(automation).toContain('.eq("status", "sending")');
    expect(automation).toContain('.eq("status", "queued")');
  });

  it('parallelizes phone push endpoints and tells the user when provider confirmation is pending', () => {
    expect(communications).toContain('Promise.allSettled');
    expect(automation).toContain('Promise.allSettled');
    expect(ui).toContain('SMS awaiting provider confirmation');
    expect(ui).toContain('Call awaiting provider confirmation');
  });
});
