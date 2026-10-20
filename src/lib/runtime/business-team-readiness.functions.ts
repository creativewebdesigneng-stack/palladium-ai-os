import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessSixAgentBusinessReadiness, type BusinessReadinessAgent } from './business-team-readiness';
import { normaliseProvider } from './model-gateway.base';
import { deploymentProviderConfigured, listUserModelProviderCredentials } from './model-provider-credentials.server';

type Sb = { from: (table: string) => any };

/** Read-only, owner-scoped preflight. Never reveals provider secrets or executes tools. */
export const getSixAgentBusinessReadiness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [agentsResult, runtimeResult, userConnections] = await Promise.all([
      sb.from('personal_agents')
        .select('id,name,status,allowed_tools,model_provider')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .limit(101),
      sb.from('autonomous_runtime_controls')
        .select('enabled')
        .eq('user_id', context.userId)
        .maybeSingle(),
      listUserModelProviderCredentials(context.userId),
    ]);
    if (agentsResult.error) throw new Error(agentsResult.error.message);
    if (runtimeResult.error) throw new Error(runtimeResult.error.message);
    const configuredPersonalProviders = new Set<string>(userConnections
      .filter((connection: { enabled: boolean }) => connection.enabled)
      .map((connection: { provider: string }) => connection.provider));
    const agents = ((agentsResult.data ?? []) as (BusinessReadinessAgent & { model_provider?: string | null })[])
      .slice(0, 100)
      .map((agent) => {
        const provider = normaliseProvider(agent.model_provider);
        return {
          ...agent,
          modelProvider: provider,
          modelProviderConfiguration: deploymentProviderConfigured(provider)
            ? 'deployment_configured' as const
            : configuredPersonalProviders.has(provider as 'openai' | 'anthropic' | 'nvidia')
              ? 'user_connected' as const : 'missing_configuration' as const,
        };
      });
    return assessSixAgentBusinessReadiness({
      agents,
      runtimeEnabled: runtimeResult.data?.enabled !== false,
      truncated: (agentsResult.data ?? []).length > 100,
    });
  });
