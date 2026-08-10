import { createFileRoute } from '@tanstack/react-router';
import { ApiError, pageParams, readJson, requireString, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';

const PATH = '/api/public/v1/agents';

export const Route = createFileRoute('/api/public/v1/agents')({
  server: {
    handlers: {
      GET: withApiAuth({ scope: 'agents:read', path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const query = ctx.admin
          .from('personal_agents')
          .select('id,name,category,purpose,status,autonomy,allowed_tools,requires_approval,created_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        const { data, error } = await scoped(query, ctx);
        if (error) throw new ApiError(500, 'query_failed', error.message);
        return { agents: data ?? [], limit, offset };
      }),
      POST: withApiAuth({ scope: 'agents:write', path: PATH }, async (ctx, request) => {
        const body = await readJson(request);
        const name = requireString(body, 'name', 120);
        const { data, error } = await ctx.admin
          .from('personal_agents')
          .insert({
            user_id: ctx.userId,
            org_id: ctx.orgId,
            name,
            category: typeof body['category'] === 'string' ? body['category'] : 'custom',
            purpose: typeof body['purpose'] === 'string' ? body['purpose'].slice(0, 2000) : null,
            instructions: typeof body['instructions'] === 'string' ? body['instructions'].slice(0, 8000) : null,
            allowed_tools: Array.isArray(body['allowed_tools']) ? body['allowed_tools'].slice(0, 40) : [],
            requires_approval: body['requires_approval'] !== false,
          })
          .select('id,name,category,purpose,status,autonomy,allowed_tools,requires_approval,created_at')
          .single();
        if (error) throw new ApiError(400, 'create_failed', error.message);
        return { agent: data };
      }),
    },
  },
});
