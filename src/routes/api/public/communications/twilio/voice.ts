import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/communications/twilio/voice')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const [{ processAiCallOpening }, { communicationsPublicUrl, verifyTwilioCommunicationsWebhook, twimlSayAndHangup }] = await Promise.all([
            import('@/lib/communications/ai-call.server'),
            import('@/lib/communications/twilio-provider.server'),
          ]);
          const session = new URL(request.url).searchParams.get('session')?.trim() ?? '';
          if (!/^[0-9a-fA-F-]{36}$/.test(session)) return twimlSayAndHangup('Blackstar could not identify this call session.', 400);
          const canonicalUrl = communicationsPublicUrl('/api/public/communications/twilio/voice', { session });
          if (!canonicalUrl) return twimlSayAndHangup('Blackstar phone service is temporarily unavailable.', 503);
          const params = await verifyTwilioCommunicationsWebhook(request, canonicalUrl);
          return processAiCallOpening(params, session);
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('[communications] Twilio AI voice opening failed', error);
          const { twimlSayAndHangup } = await import('@/lib/communications/twilio-provider.server');
          return twimlSayAndHangup('Blackstar phone service is temporarily unavailable. Please continue in the app.', status);
        }
      },
    },
  },
});
