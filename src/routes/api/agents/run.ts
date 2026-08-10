import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { failRun, prepareRun, streamRun } from '@/lib/runtime/runtime.server';

/**
 * Streaming agent run (SSE). Same-origin endpoint used by the command centre so
 * operators watch the agent work in real time. Auth is a verified bearer token —
 * the browser cannot influence which user the run belongs to.
 */
export const Route = createFileRoute('/api/agents/run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!url || !key) return json({ error: 'Backend not configured.' }, 500);

        const authHeader = request.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token || token.split('.').length !== 3) return json({ error: 'Unauthorized' }, 401);

        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return json({ error: 'Unauthorized' }, 401);

        let body: { agent_id?: string; input?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: 'Invalid request body.' }, 400);
        }
        if (!body.agent_id) return json({ error: 'An agent is required.' }, 400);

        const sb = supabase as unknown as { from: (t: string) => any };
        let run: Awaited<ReturnType<typeof prepareRun>>;
        try {
          run = await prepareRun({ sb, userId, agentId: body.agent_id, input: String(body.input ?? '') });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : 'Could not start the run.' }, 400);
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: unknown) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            try {
              for await (const event of streamRun({ sb, userId, run })) send(event);
            } catch (error) {
              const message = await failRun({ userId, run, error });
              send({ type: 'error', message });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
          },
        });
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
