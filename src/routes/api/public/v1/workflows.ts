import { createFileRoute } from '@tanstack/react-router';
import { ApiError, pageParams, scoped, withApiAuth } from '@/lib/devapi/api-auth.server';

const PATH = '/api/public/v1/workflows';

export const Route = createFileRoute('/api/public/v1/workflows')({
  server: {
    handlers: {
      GET: withApiAuth({ scope: 'workflows:read', path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const query = ctx.admin
          .from('workflows')
          .select('id,name,description,trigger_type,schedule,status,created_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        const { data, error } = await scoped(query, ctx);
        if (error) throw new ApiError(500, 'query_failed', error.message);
        return { workflows: data ?? [], limit, offset };
      }),
    },
  },
});
