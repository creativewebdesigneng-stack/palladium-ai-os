import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessSixAgentBusinessReadiness, type BusinessReadinessAgent } from './business-team-readiness';
import { normaliseProvider } from './model-gateway.base';
import { deploymentProviderConfigured, isProviderAvailableForUser } from './model-provider-credentials.server';

type Sb = { from: (table: string) => any };

/** Read-only, owner-scoped preflight. Never reveals provider secrets or executes tools. */
export const getSixAgentBusinessReadiness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [agentsResult, runtimeResult] = await Promise.all([
      sb.from('personal_agents')
        .select('id,name,status,allowed_tools,model_provider')
        .eq('user_id', context.userId)
        // Count active and draft specialists; drafts are advisory candidates
        // only and must never be treated as eligible to execute.
        .in('status', ['active', 'draft'])
        .order('status', { ascending: true })
        .limit(101),
      sb.from('autonomous_runtime_controls')
        .select('enabled')
        .eq('user_id', context.userId)
        .maybeSingle(),
    ]);
    if (agentsResult.error) throw new Error(agentsResult.error.message);
    if (runtimeResult.error) throw new Error(runtimeResult.error.message);
    const visible = ((agentsResult.data ?? []) as (BusinessReadinessAgent & { model_provider?: string | null })[])
      .slice(0, 100);
    const providers = [...new Set(visible.map((agent) => normaliseProvider(agent.model_provider)))];
    // Use exactly the same owner-scoped, credential-aware availability check
    // that the six-agent runtime uses. The check returns a boolean, not tokens.
    // Fail closed on invalid or undecryptable personal connections; dashboard
    // "connected" must not disagree with the planner about usable configuration.
    const availableProviders = new Map(await Promise.all(providers.map(async (provider) => [
      provider,
      await isProviderAvailableForUser({ userId: context.userId, provider }).catch(() => false),
    ] as const)));
    const agents = visible.map((agent) => {
      const provider = normaliseProvider(agent.model_provider);
      return {
        ...agent,
        modelProvider: provider,
        modelProviderConfiguration: !availableProviders.get(provider)
          ? 'missing_configuration' as const
          : deploymentProviderConfigured(provider)
            ? 'deployment_configured' as const
            : 'user_connected' as const,
      };
    });
    return assessSixAgentBusinessReadiness({
      agents,
      runtimeEnabled: runtimeResult.data?.enabled !== false,
      truncated: (agentsResult.data ?? []).length > 100,
    });
  });
