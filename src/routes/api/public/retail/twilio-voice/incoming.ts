import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/retail/twilio-voice/incoming')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const [{ processRetailTwilioVoiceIncoming, verifyRetailTwilioVoiceRequest, retailTwilioVoicePaths }, { assertRetailInboundSessionIdentity }] =
            await Promise.all([
              import('@/lib/retail/retail-inbound-voice.server'),
              import('@/lib/retail/retail-inbound-session-guard.server'),
            ]);
          const params = await verifyRetailTwilioVoiceRequest(request, retailTwilioVoicePaths.incoming);
          await assertRetailInboundSessionIdentity(params);
          return processRetailTwilioVoiceIncoming(params);
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('Retail Twilio inbound voice error:', error);
          return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Phone service is temporarily unavailable.</Say><Hangup/></Response>', {
            status,
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        }
      },
    },
  },
});
