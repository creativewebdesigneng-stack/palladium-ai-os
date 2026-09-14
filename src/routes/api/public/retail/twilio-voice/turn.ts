import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/retail/twilio-voice/turn')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { processRetailTwilioVoiceTurn, verifyRetailTwilioVoiceRequest, retailTwilioVoicePaths } =
            await import('@/lib/retail/retail-inbound-voice.server');
          const params = await verifyRetailTwilioVoiceRequest(request, retailTwilioVoicePaths.turn);
          return processRetailTwilioVoiceTurn(params);
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('Retail Twilio inbound voice turn error:', error);
          return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Phone service is temporarily unavailable.</Say><Hangup/></Response>', {
            status,
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        }
      },
    },
  },
});
