import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/retail/twilio-voice/status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { processRetailTwilioVoiceStatus, verifyRetailTwilioVoiceRequest, retailTwilioVoicePaths } =
            await import('@/lib/retail/retail-inbound-voice.server');
          const params = await verifyRetailTwilioVoiceRequest(request, retailTwilioVoicePaths.status);
          return Response.json(await processRetailTwilioVoiceStatus(params));
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('Retail Twilio inbound voice status error:', error);
          return Response.json({ accepted: false }, { status });
        }
      },
    },
  },
});
