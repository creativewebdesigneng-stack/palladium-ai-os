import { z } from 'zod';

export type RetailTwilioChannel = 'sms' | 'whatsapp' | 'voice';

export type RetailTwilioCapabilities = {
  sms: boolean;
  whatsapp: boolean;
  voice: boolean;
};

export type RetailTwilioConfig = {
  accountSid: string;
  authToken: string;
  smsFromNumber?: string;
  messagingServiceSid?: string;
  whatsappFrom?: string;
  voiceFromNumber?: string;
};

const e164 = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Recipient must be an E.164 phone number such as +447700900123.');
const purpose = z.enum(['appointment_confirmation','missed_call','followup','order_update','shipping_update','custom']);

const payloadSchema = z.object({
  channel: z.enum(['sms','whatsapp','voice']),
  purpose: purpose.optional().default('custom'),
  recipient: e164,
  subject: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(3500),
  content_sid: z.string().trim().regex(/^HX[0-9a-fA-F]{32}$/).optional(),
  content_variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type RetailTwilioPayload = z.infer<typeof payloadSchema>;

function envText(value: string | undefined) {
  const text = value?.trim();
  return text ? text : undefined;
}

export function parseRetailTwilioPayload(value: unknown): RetailTwilioPayload {
  return payloadSchema.parse(value);
}

export function resolveRetailTwilioConfig(env: Record<string, string | undefined>): RetailTwilioConfig | null {
  const accountSid = envText(env['TWILIO_ACCOUNT_SID']);
  const authToken = envText(env['TWILIO_AUTH_TOKEN']);
  if (!accountSid || !/^AC[0-9a-fA-F]{32}$/.test(accountSid) || !authToken) return null;

  const smsFromNumber = envText(env['TWILIO_SMS_FROM_NUMBER']);
  const messagingServiceSid = envText(env['TWILIO_MESSAGING_SERVICE_SID']);
  const whatsappFrom = envText(env['TWILIO_WHATSAPP_FROM']);
  const voiceFromNumber = envText(env['TWILIO_VOICE_FROM_NUMBER']);

  return {
    accountSid,
    authToken,
    ...(smsFromNumber && /^\+[1-9]\d{7,14}$/.test(smsFromNumber) ? { smsFromNumber } : {}),
    ...(messagingServiceSid && /^MG[0-9a-fA-F]{32}$/.test(messagingServiceSid) ? { messagingServiceSid } : {}),
    ...(whatsappFrom ? { whatsappFrom: normalizeWhatsappAddress(whatsappFrom) } : {}),
    ...(voiceFromNumber && /^\+[1-9]\d{7,14}$/.test(voiceFromNumber) ? { voiceFromNumber } : {}),
  };
}

export function getRetailTwilioCapabilities(config: RetailTwilioConfig | null): RetailTwilioCapabilities {
  if (!config) return { sms: false, whatsapp: false, voice: false };
  return {
    sms: Boolean(config.smsFromNumber || config.messagingServiceSid),
    whatsapp: Boolean(config.whatsappFrom && /^whatsapp:\+[1-9]\d{7,14}$/.test(config.whatsappFrom)),
    voice: Boolean(config.voiceFromNumber),
  };
}

export function normalizeWhatsappAddress(value: string): string {
  const stripped = value.trim().replace(/^whatsapp:/i, '');
  if (!/^\+[1-9]\d{7,14}$/.test(stripped)) return '';
  return `whatsapp:${stripped}`;
}

export function escapeTwimlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildRetailTwilioRequest(
  config: RetailTwilioConfig,
  payload: RetailTwilioPayload,
  statusCallbackUrl?: string,
) {
  if (payload.channel === 'voice') {
    if (!config.voiceFromNumber) throw new Error('twilio_voice_not_configured');
    const body = new URLSearchParams({
      To: payload.recipient,
      From: config.voiceFromNumber,
      Twiml: `<Response><Say>${escapeTwimlText(payload.body)}</Say></Response>`,
    });
    if (statusCallbackUrl) {
      body.set('StatusCallback', statusCallbackUrl);
      body.set('StatusCallbackMethod', 'POST');
      for (const event of ['initiated','ringing','answered','completed']) body.append('StatusCallbackEvent', event);
    }
    return {
      url: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`,
      body,
    };
  }

  const body = new URLSearchParams();
  if (payload.channel === 'whatsapp') {
    if (!config.whatsappFrom) throw new Error('twilio_whatsapp_not_configured');
    body.set('From', config.whatsappFrom);
    body.set('To', `whatsapp:${payload.recipient}`);
    if (payload.content_sid) {
      body.set('ContentSid', payload.content_sid);
      if (payload.content_variables) body.set('ContentVariables', JSON.stringify(payload.content_variables));
    } else {
      body.set('Body', payload.body);
    }
  } else {
    if (config.messagingServiceSid) body.set('MessagingServiceSid', config.messagingServiceSid);
    else if (config.smsFromNumber) body.set('From', config.smsFromNumber);
    else throw new Error('twilio_sms_not_configured');
    body.set('To', payload.recipient);
    body.set('Body', payload.body);
  }
  if (statusCallbackUrl) body.set('StatusCallback', statusCallbackUrl);

  return {
    url: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    body,
  };
}
