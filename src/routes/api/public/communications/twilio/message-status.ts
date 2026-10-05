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
          const eventId = new URL(request.url).searchParams.get('event')?.trim() ?? '';
          if (eventId && !/^[0-9a-fA-F-]{36}$/.test(eventId)) return new Response(null, { status: 400 });
          const canonicalUrl = communicationsPublicUrl(
            '/api/public/communications/twilio/message-status',
            eventId ? { event: eventId } : undefined,
          );
          if (!canonicalUrl) return new Response(null, { status: 503 });
          const params = await verifyTwilioCommunicationsWebhook(request, canonicalUrl);
          await processSmsStatus(params, eventId || undefined);
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
