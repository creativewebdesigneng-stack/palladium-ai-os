import { createFileRoute } from '@tanstack/react-router';
import { ApiError, readJson, requireString, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';
import { dispatchWebhookEvent } from '@/lib/devapi/webhooks.server';

const PATH = '/api/public/v1/agents/$id/run';

export const Route = createFileRoute('/api/public/v1/agents/$id/run')({
  server: {
    handlers: {
      // Execution endpoint — plan gated (Explorer has no execution API).
      POST: withApiAuth({ scope: 'agents:run', execution: true, path: PATH }, async (ctx, request, params) => {
        const body = await readJson(request);
        const input = requireString(body, 'input', 20_000);
        const agentId = String(params.id);

        const { data: agent } = await scoped(
          ctx.admin.from('personal_agents').select('id').eq('id', agentId),
          ctx,
        ).maybeSingle();
        if (!agent) throw new ApiError(404, 'not_found', 'No agent with that id.');

        const { prepareRun, executeRun, failRun } = await import('@/lib/runtime/runtime.server');
        let run: any = null;
        try {
          run = await prepareRun({ sb: ctx.admin, userId: ctx.userId, agentId, input });
          const task = await executeRun({ sb: ctx.admin, userId: ctx.userId, run });
          await dispatchWebhookEvent({
            userId: ctx.userId,
            orgId: ctx.orgId,
            event: 'agent.completed',
            payload: { agent_id: agentId, task_id: (task as any)?.id, output: (task as any)?.output_text ?? '' },
          });
          return { task, output: (task as any)?.output_text ?? '' };
        } catch (error) {
          if (run) await failRun({ userId: ctx.userId, run, error });
          await dispatchWebhookEvent({
            userId: ctx.userId,
            orgId: ctx.orgId,
            event: 'agent.failed',
            payload: { agent_id: agentId, error: error instanceof Error ? error.message : 'Run failed' },
          });
          throw new ApiError(422, 'run_failed', error instanceof Error ? error.message : 'The run could not complete.');
        }
      }),
    },
  },
});
