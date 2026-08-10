import { createFileRoute } from '@tanstack/react-router';
import { ApiError, pageParams, readJson, requireString, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';

const PATH = '/api/public/v1/tasks';

export const Route = createFileRoute('/api/public/v1/tasks')({
  server: {
    handlers: {
      GET: withApiAuth({ scope: 'tasks:read', path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const url = new URL(request.url);
        const status = url.searchParams.get('status');

        let runs = ctx.admin
          .from('agent_tasks')
          .select('id,agent_id,title,status,input,output_text,tokens_in,tokens_out,cost_pence,duration_ms,created_at,completed_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (status) runs = runs.eq('status', status);

        const { data, error } = await scoped(runs, ctx);
        if (error) throw new ApiError(500, 'query_failed', error.message);
        return { tasks: data ?? [], limit, offset };
      }),
      POST: withApiAuth({ scope: 'tasks:write', path: PATH }, async (ctx, request) => {
        const body = await readJson(request);
        const requestText = requireString(body, 'request', 8000);
        const { data, error } = await ctx.admin
          .from('personal_tasks')
          .insert({
            user_id: ctx.userId,
            org_id: ctx.orgId,
            agent_id: typeof body['agent_id'] === 'string' ? body['agent_id'] : null,
            request: requestText,
            title: typeof body['title'] === 'string' ? body['title'].slice(0, 200) : requestText.slice(0, 80),
            category: typeof body['category'] === 'string' ? body['category'] : 'custom',
            scope: body['scope'] === 'professional' ? 'professional' : 'personal',
            requires_approval: body['requires_approval'] === true,
            involves_money: body['involves_money'] === true,
          })
          .select('id,title,request,category,scope,status,requires_approval,created_at')
          .single();
        if (error) throw new ApiError(400, 'create_failed', error.message);
        return { task: data };
      }),
    },
  },
});
