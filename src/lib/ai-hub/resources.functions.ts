import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AiHubCapabilityKind } from "./contracts";

type Sb = { from: (table: string) => any };

export interface AiHubLiveResource {
  id: string;
  kind: AiHubCapabilityKind;
  name: string;
  status: string;
  providerId: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

function asResource(row: Record<string, any>, kind: AiHubCapabilityKind, providerId: string): AiHubLiveResource {
  const capabilities = Array.isArray(row.allowed_tools)
    ? row.allowed_tools.map(String)
    : [];
  return {
    id: String(row.id),
    kind,
    name: String(row.name ?? row.title ?? row.id),
    status: String(row.status ?? "available"),
    providerId,
    capabilities,
    metadata: {
      ...(row.model ? { model: row.model } : {}),
      ...(row.model_provider ? { modelProvider: row.model_provider } : {}),
      ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    },
  };
}

/**
 * Tenant-safe live Hub inventory. Identity comes from the verified bearer token;
 * Supabase RLS remains the source of truth for which resources the caller can see.
 */
export const listAiHubResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 100), 1), 250),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [agentsRes, workflowsRes] = await Promise.all([
      sb
        .from("personal_agents")
        .select("id,name,status,model,model_provider,allowed_tools,updated_at")
        .order("updated_at", { ascending: false })
        .limit(data.limit),
      sb
        .from("workflows")
        .select("id,name,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(data.limit),
    ]);

    if (agentsRes.error) throw new Error(agentsRes.error.message);
    if (workflowsRes.error) throw new Error(workflowsRes.error.message);

    const resources: AiHubLiveResource[] = [
      ...(agentsRes.data ?? []).map((row: Record<string, any>) => asResource(row, "agent", "palladium-agent-runtime")),
      ...(workflowsRes.data ?? []).map((row: Record<string, any>) => asResource(row, "workflow", "palladium-workflows")),
    ];

    return {
      resources,
      counts: {
        agents: agentsRes.data?.length ?? 0,
        workflows: workflowsRes.data?.length ?? 0,
        total: resources.length,
      },
    };
  });
