import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/retail/twilio-status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { processRetailTwilioStatus, verifyRetailTwilioStatusRequest } =
            await import('@/lib/retail/retail-twilio-webhook.server');
          const params = await verifyRetailTwilioStatusRequest(request);
          return Response.json(await processRetailTwilioStatus(params));
        } catch (error) {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 500;
          console.error('Retail Twilio status callback error:', error);
          return Response.json({ accepted: false }, { status });
        }
      },
    },
  },
});
