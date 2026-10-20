import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessSixAgentBusinessReadiness, type BusinessReadinessAgent } from './business-team-readiness';

type Sb = { from: (table: string) => any };

/** Read-only, owner-scoped preflight. Never reveals provider secrets or executes tools. */
export const getSixAgentBusinessReadiness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [agentsResult, runtimeResult] = await Promise.all([
      sb.from('personal_agents')
        .select('id,name,status,allowed_tools')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .limit(101),
      sb.from('autonomous_runtime_controls')
        .select('enabled')
        .eq('user_id', context.userId)
        .maybeSingle(),
    ]);
    if (agentsResult.error) throw new Error(agentsResult.error.message);
    if (runtimeResult.error) throw new Error(runtimeResult.error.message);
    const agents = (agentsResult.data ?? []) as BusinessReadinessAgent[];
    return assessSixAgentBusinessReadiness({
      agents: agents.slice(0, 100),
      runtimeEnabled: runtimeResult.data?.enabled !== false,
      truncated: agents.length > 100,
    });
  });
