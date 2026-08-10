import { createFileRoute } from '@tanstack/react-router';
import { ApiError, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';
import { dispatchWebhookEvent } from '@/lib/devapi/webhooks.server';

const PATH = '/api/public/v1/workflows/$id/run';

export const Route = createFileRoute('/api/public/v1/workflows/$id/run')({
  server: {
    handlers: {
      // Execution endpoint — plan gated.
      POST: withApiAuth({ scope: 'workflows:run', execution: true, path: PATH }, async (ctx, _request, params) => {
        const workflowId = String(params.id);
        const { data: workflow } = await scoped(
          ctx.admin.from('workflows').select('id,name').eq('id', workflowId),
          ctx,
        ).maybeSingle();
        if (!workflow) throw new ApiError(404, 'not_found', 'No workflow with that id.');

        const { data: steps } = await ctx.admin
          .from('workflow_steps')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('created_at', { ascending: true });

        const { data: run, error } = await ctx.admin
          .from('workflow_runs')
          .insert({
            workflow_id: workflowId,
            user_id: ctx.userId,
            org_id: ctx.orgId,
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .select('*')
          .single();
        if (error) throw new ApiError(400, 'run_failed', error.message);

        const results = (steps ?? []).map((s: any) => ({ step_id: s.id, status: 'queued' }));
        const { data: finished } = await ctx.admin
          .from('workflow_runs')
          .update({ status: 'completed', step_results: results, completed_at: new Date().toISOString() })
          .eq('id', run.id)
          .select('*')
          .single();

        await dispatchWebhookEvent({
          userId: ctx.userId,
          orgId: ctx.orgId,
          event: 'workflow.completed',
          payload: { workflow_id: workflowId, run_id: run.id, steps: results.length },
        });

        return { run: finished ?? run };
      }),
    },
  },
});
