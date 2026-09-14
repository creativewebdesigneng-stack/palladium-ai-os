import { describe, expect, it } from 'vitest';
import {
  buildRetailTwilioRequest,
  escapeTwimlText,
  getRetailTwilioCapabilities,
  parseRetailTwilioPayload,
  resolveRetailTwilioConfig,
} from './retail-twilio-carrier';

const sid = `AC${'a'.repeat(32)}`;
const messagingSid = `MG${'b'.repeat(32)}`;
const statusCallback = 'https://blackstar.example/api/public/retail/twilio-status';

describe('Retail Twilio carrier', () => {
  it('keeps every channel disabled without valid credentials', () => {
    expect(getRetailTwilioCapabilities(resolveRetailTwilioConfig({}))).toEqual({ sms: false, whatsapp: false, voice: false });
    expect(getRetailTwilioCapabilities(resolveRetailTwilioConfig({ TWILIO_ACCOUNT_SID: 'bad', TWILIO_AUTH_TOKEN: 'token' }))).toEqual({ sms: false, whatsapp: false, voice: false });
  });

  it('enables only channels that have a real sender configuration', () => {
    const config = resolveRetailTwilioConfig({
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: 'secret-token',
      TWILIO_MESSAGING_SERVICE_SID: messagingSid,
      TWILIO_WHATSAPP_FROM: '+14155238886',
      TWILIO_VOICE_FROM_NUMBER: '+442080001111',
    });
    expect(getRetailTwilioCapabilities(config)).toEqual({ sms: true, whatsapp: true, voice: true });
  });

  it('rejects non-E.164 recipients before any provider request can be built', () => {
    expect(() => parseRetailTwilioPayload({ channel: 'sms', recipient: '07700900123', body: 'Hello' })).toThrow();
  });

  it('builds SMS with a Messaging Service and signed-status callback target when configured', () => {
    const config = resolveRetailTwilioConfig({
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: 'secret-token',
      TWILIO_MESSAGING_SERVICE_SID: messagingSid,
    });
    if (!config) throw new Error('expected config');
    const request = buildRetailTwilioRequest(config, parseRetailTwilioPayload({ channel: 'sms', recipient: '+447700900123', body: 'Order ready' }), statusCallback);
    expect(request.url).toContain('/Messages.json');
    expect(request.body.get('MessagingServiceSid')).toBe(messagingSid);
    expect(request.body.get('To')).toBe('+447700900123');
    expect(request.body.get('Body')).toBe('Order ready');
    expect(request.body.get('StatusCallback')).toBe(statusCallback);
  });

  it('builds WhatsApp addresses and supports approved Content templates', () => {
    const config = resolveRetailTwilioConfig({
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: 'secret-token',
      TWILIO_WHATSAPP_FROM: '+14155238886',
    });
    if (!config) throw new Error('expected config');
    const contentSid = `HX${'c'.repeat(32)}`;
    const request = buildRetailTwilioRequest(config, parseRetailTwilioPayload({
      channel: 'whatsapp', recipient: '+447700900123', body: 'Fallback text', content_sid: contentSid, content_variables: { 1: 'Tuesday' },
    }), statusCallback);
    expect(request.body.get('From')).toBe('whatsapp:+14155238886');
    expect(request.body.get('To')).toBe('whatsapp:+447700900123');
    expect(request.body.get('ContentSid')).toBe(contentSid);
    expect(request.body.get('ContentVariables')).toBe('{"1":"Tuesday"}');
    expect(request.body.get('Body')).toBeNull();
    expect(request.body.get('StatusCallback')).toBe(statusCallback);
  });

  it('escapes outbound voice text and requests lifecycle status callbacks', () => {
    expect(escapeTwimlText('A & B < C')).toBe('A &amp; B &lt; C');
    const config = resolveRetailTwilioConfig({
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: 'secret-token',
      TWILIO_VOICE_FROM_NUMBER: '+442080001111',
    });
    if (!config) throw new Error('expected config');
    const request = buildRetailTwilioRequest(config, parseRetailTwilioPayload({ channel: 'voice', recipient: '+447700900123', body: 'A & B' }), statusCallback);
    expect(request.url).toContain('/Calls.json');
    expect(request.body.get('Twiml')).toBe('<Response><Say>A &amp; B</Say></Response>');
    expect(request.body.get('StatusCallback')).toBe(statusCallback);
    expect(request.body.getAll('StatusCallbackEvent')).toEqual(['initiated','ringing','answered','completed']);
  });
});
