import { z } from 'zod';

export const communicationPurposeSchema = z.enum([
  'project_update',
  'agent_update',
  'business_update',
  'approval',
  'reminder',
  'custom',
]);

export type CommunicationPurpose = z.infer<typeof communicationPurposeSchema>;

export const e164PhoneSchema = z.string().trim().regex(
  /^\+[1-9]\d{7,14}$/,
  'Use an international E.164 number such as +447700900123.',
);

export const communicationPreferencesSchema = z.object({
  phone_push_enabled: z.boolean(),
  sms_enabled: z.boolean(),
  ai_calls_enabled: z.boolean(),
  project_updates: z.boolean(),
  agent_updates: z.boolean(),
  business_updates: z.boolean(),
  quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  timezone: z.string().trim().min(1).max(80),
  max_daily_sms: z.number().int().min(0).max(100),
  max_daily_calls: z.number().int().min(0).max(25),
  retain_call_transcript: z.boolean(),
});

export type CommunicationPreferences = z.infer<typeof communicationPreferencesSchema>;

export const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferences = {
  phone_push_enabled: true,
  sms_enabled: false,
  ai_calls_enabled: false,
  project_updates: true,
  agent_updates: true,
  business_updates: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
  max_daily_sms: 10,
  max_daily_calls: 3,
  retain_call_transcript: false,
};

export const saveRecipientSchema = z.object({
  label: z.string().trim().min(1).max(80).default('My mobile'),
  phone_e164: e164PhoneSchema,
  sms_consent: z.boolean(),
  voice_consent: z.boolean(),
});

export const sendSmsSchema = z.object({
  recipient_id: z.string().uuid(),
  purpose: communicationPurposeSchema,
  body: z.string().trim().min(1).max(1600),
  source_type: z.string().trim().max(80).optional(),
  source_id: z.string().trim().max(160).optional(),
});

export const startAiCallSchema = z.object({
  recipient_id: z.string().uuid(),
  purpose: communicationPurposeSchema,
  objective: z.string().trim().min(1).max(2000),
  project_id: z.string().uuid().optional(),
  company_workspace_id: z.string().uuid().optional(),
  source_type: z.string().trim().max(80).optional(),
  source_id: z.string().trim().max(160).optional(),
});

export function purposeEnabled(
  preferences: Pick<CommunicationPreferences, 'project_updates' | 'agent_updates' | 'business_updates'>,
  purpose: CommunicationPurpose,
): boolean {
  if (purpose === 'project_update') return preferences.project_updates;
  if (purpose === 'agent_update') return preferences.agent_updates;
  if (purpose === 'business_update') return preferences.business_updates;
  return true;
}

function minutesOfDay(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

export function isInsideQuietHours(
  now: Date,
  timezone: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start || !end || start === end) return false;
  let local: string;
  try {
    local = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  } catch {
    local = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  }
  const current = minutesOfDay(local);
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export function safeCallHistory(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => item as Record<string, unknown>)
    .filter((item) => (item['role'] === 'user' || item['role'] === 'assistant') && typeof item['content'] === 'string')
    .map((item) => ({
      role: item['role'] as 'user' | 'assistant',
      content: String(item['content']).trim().slice(0, 4000),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-10);
}
