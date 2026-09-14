import { z } from 'zod';

const purposeSchema = z.enum([
  'appointment_confirmation',
  'missed_call',
  'followup',
  'order_update',
  'shipping_update',
  'custom',
]);

const emailPayloadSchema = z.object({
  channel: z.literal('email'),
  purpose: purposeSchema.optional().default('custom'),
  recipient: z.string().trim().email().max(254),
  subject: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(4000),
});

export type RetailEmailPayload = z.infer<typeof emailPayloadSchema> & { subject: string };

export function parseRetailEmailPayload(value: unknown): RetailEmailPayload {
  const parsed = emailPayloadSchema.parse(value);
  return {
    ...parsed,
    subject: parsed.subject || 'Customer-service update',
  };
}

export function retailProviderMessageId(result: Record<string, unknown> | undefined): string | null {
  if (!result) return null;
  const messageId = result['message_id'];
  if (typeof messageId === 'string' && messageId.trim()) return messageId.trim().slice(0, 500);
  const id = result['id'];
  if (typeof id === 'string' && id.trim()) return id.trim().slice(0, 500);
  return null;
}
