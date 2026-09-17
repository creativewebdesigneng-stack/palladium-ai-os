import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/communications/twilio/message-status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const [{ processSmsStatus }, { communicationsPublicUrl, verifyTwilioCommunicationsWebhook }] = await Promise.all([
            import('@/lib/communications/ai-call.server'),
            import('@/lib/communications/twilio-provider.server'),
          ]);
          const canonicalUrl = communicationsPublicUrl('/api/public/communications/twilio/message-status');
          if (!canonicalUrl) return new Response(null, { status: 503 });
          const params = await verifyTwilioCommunicationsWebhook(request, canonicalUrl);
          await processSmsStatus(params);
          return new Response(null, { status: 204 });
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
          console.error('[communications] Twilio SMS status failed', error);
          return new Response(null, { status });
        }
      },
    },
  },
});
