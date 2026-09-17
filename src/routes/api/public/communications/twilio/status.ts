import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/communications/twilio/status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const [{ processAiCallStatus }, { communicationsPublicUrl, verifyTwilioCommunicationsWebhook }] = await Promise.all([
            import('@/lib/communications/ai-call.server'),
            import('@/lib/communications/twilio-provider.server'),
          ]);
          const session = new URL(request.url).searchParams.get('session')?.trim() ?? '';
          if (!/^[0-9a-fA-F-]{36}$/.test(session)) return new Response(null, { status: 400 });
          const canonicalUrl = communicationsPublicUrl('/api/public/communications/twilio/status', { session });
          if (!canonicalUrl) return new Response(null, { status: 503 });
          const params = await verifyTwilioCommunicationsWebhook(request, canonicalUrl);
          await processAiCallStatus(params, session);
          return new Response(null, { status: 204 });
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('[communications] Twilio AI voice status failed', error);
          return new Response(null, { status });
        }
      },
    },
  },
});
