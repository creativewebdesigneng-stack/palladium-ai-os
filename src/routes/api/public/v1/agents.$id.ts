import { createFileRoute } from '@tanstack/react-router';
import { ApiError, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';

const PATH = '/api/public/v1/agents/$id';

export const Route = createFileRoute('/api/public/v1/agents/$id')({
  server: {
    handlers: {
      GET: withApiAuth({ scope: 'agents:read', path: PATH }, async (ctx, _request, params) => {
        const query = ctx.admin
          .from('personal_agents')
          .select('*')
          .eq('id', String(params.id));
        const { data, error } = await scoped(query, ctx).maybeSingle();
        if (error) throw new ApiError(500, 'query_failed', error.message);
        if (!data) throw new ApiError(404, 'not_found', 'No agent with that id.');
        const { instructions, preferences, ...safe } = data;
        return { agent: { ...safe, instructions, preferences } };
      }),
    },
  },
});
