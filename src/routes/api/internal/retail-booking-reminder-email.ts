import { createFileRoute } from '@tanstack/react-router';
import {
  executeRetailBookingReminderEmail,
  isValidRetailBookingReminderWorkerToken,
} from '@/lib/retail/retail-booking-reminder-email.server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute('/api/internal/retail-booking-reminder-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get('authorization') ?? '';
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
        if (!(await isValidRetailBookingReminderWorkerToken(token))) {
          return json({ error: 'Unauthorized' }, 401);
        }

        const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
        if (!contentType.includes('application/json')) {
          return json({ error: 'Unsupported content type' }, 415);
        }

        let reminderId = '';
        try {
          const body = await request.json() as { reminder_id?: unknown };
          reminderId = typeof body?.reminder_id === 'string' ? body.reminder_id.trim() : '';
        } catch {
          return json({ error: 'Invalid JSON body' }, 400);
        }
        if (!UUID.test(reminderId)) return json({ error: 'Invalid reminder id' }, 400);

        try {
          const result = await executeRetailBookingReminderEmail(reminderId);
          return json({ ok: true, result }, 200);
        } catch (error) {
          console.error('[retail-reminders] connected email execution unavailable', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
          return json({ ok: false, error: 'Retail reminder email execution unavailable' }, 503);
        }
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}