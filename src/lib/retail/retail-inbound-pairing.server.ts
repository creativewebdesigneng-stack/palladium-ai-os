import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { resolveRetailTwilioConfig } from './retail-twilio-carrier';

const PHONE_SID = /^PN[0-9a-fA-F]{32}$/;
const PAIRING_PREFIX = 'BLACKSTAR-';
const TOKEN = /^[0-9a-f]{36}$/;

function runtimeConfig() {
  return resolveRetailTwilioConfig({
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_SMS_FROM_NUMBER: process.env.TWILIO_SMS_FROM_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_VOICE_FROM_NUMBER: process.env.TWILIO_VOICE_FROM_NUMBER,
  });
}

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function hashesMatch(leftHex: string, rightHex: string) {
  if (!/^[0-9a-f]{64}$/.test(leftHex) || !/^[0-9a-f]{64}$/.test(rightHex)) return false;
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createRetailInboundPairingToken() {
  const token = randomBytes(18).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expectedFriendlyName: `${PAIRING_PREFIX}${token}`,
  };
}

export async function verifyRetailInboundPairing(phoneSid: string, expectedTokenHash: string) {
  if (!PHONE_SID.test(phoneSid)) throw new Error('invalid_twilio_phone_sid');
  const config = runtimeConfig();
  if (!config) throw new Error('twilio_not_configured');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let body: Record<string, unknown> = {};
  if (raw) {
    try { body = JSON.parse(raw) as Record<string, unknown>; }
    catch { body = {}; }
  }
  if (!response.ok) {
    const message = typeof body['message'] === 'string' ? body['message'] : `Twilio HTTP ${response.status}`;
    throw new Error(`twilio_api_error:${message}`.slice(0, 1000));
  }
  if (String(body['sid'] ?? '') !== phoneSid) throw new Error('twilio_phone_number_invalid');
  if (body['voice_application_sid'] || body['trunk_sid']) throw new Error('twilio_number_uses_voice_application_or_trunk');
  const friendlyName = typeof body['friendly_name'] === 'string' ? body['friendly_name'].trim() : '';
  if (!friendlyName.startsWith(PAIRING_PREFIX)) throw new Error('twilio_pairing_code_not_found');
  const token = friendlyName.slice(PAIRING_PREFIX.length).trim().toLowerCase();
  if (!TOKEN.test(token) || !hashesMatch(hashToken(token), expectedTokenHash.toLowerCase())) throw new Error('twilio_pairing_code_mismatch');
  return {
    sid: phoneSid,
    phone_number: typeof body['phone_number'] === 'string' ? body['phone_number'] : '',
    friendly_name: friendlyName,
  };
}
