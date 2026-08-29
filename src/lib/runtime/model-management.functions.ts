import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };
type ProviderId = "lovable" | "openai" | "anthropic" | "deepseek" | "compatible";
type ProviderDefinition = {
  id: ProviderId;
  name: string;
  defaultModel: string;
};

const PROVIDERS: ProviderDefinition[] = [
  { id: "lovable", name: "Lovable AI Gateway", defaultModel: "google/gemini-3-flash-preview" },
  { id: "openai", name: "OpenAI", defaultModel: "gpt-5-mini" },
  { id: "deepseek", name: "DeepSeek V3", defaultModel: "deepseek-chat" },
  { id: "anthropic", name: "Anthropic", defaultModel: "claude-sonnet-4-5-20250929" },
  { id: "compatible", name: "Local / OpenAI-compatible (Jan supported)", defaultModel: "local-model" },
];

function configured(provider: ProviderId): boolean {
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  if (provider === "anthropic") return Boolean(process.env["ANTHROPIC_API_KEY"]);
  if (provider === "deepseek") return Boolean(process.env["DEEPSEEK_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

export const getModelRuntimeOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: agents, error: agentError }, { data: tasks, error: taskError }] = await Promise.all([
      sb
        .from("personal_agents")
        .select("id,name,status,model,model_provider,updated_at")
        .order("updated_at", { ascending: false })
        .limit(500),
      sb
        .from("agent_tasks")
        .select("id,agent_id,provider,model,status,tokens_in,tokens_out,cost_pence,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (agentError) throw new Error(agentError.message);
    if (taskError) throw new Error(taskError.message);

    type UsageRow = {
      provider: string;
      model: string;
      runs: number;
      succeeded: number;
      failed: number;
      tokensIn: number;
      tokensOut: number;
      costPence: number;
      lastUsedAt: string | null;
    };

    const usageByModel = new Map<string, UsageRow>();
    for (const task of tasks ?? []) {
      const provider = String(task.provider ?? "unknown");
      const model = String(task.model ?? "unknown");
      const key = `${provider}:${model}`;
      const current: UsageRow = usageByModel.get(key) ?? {
        provider,
        model,
        runs: 0,
        succeeded: 0,
        failed: 0,
        tokensIn: 0,
        tokensOut: 0,
        costPence: 0,
        lastUsedAt: null,
      };
      current.runs += 1;
      if (task.status === "succeeded" || task.status === "completed") current.succeeded += 1;
      if (task.status === "failed") current.failed += 1;
      current.tokensIn += Number(task.tokens_in ?? 0);
      current.tokensOut += Number(task.tokens_out ?? 0);
      current.costPence += Number(task.cost_pence ?? 0);
      if (!current.lastUsedAt) current.lastUsedAt = task.created_at ? String(task.created_at) : null;
      usageByModel.set(key, current);
    }

    const assignments: Array<{
      id: string;
      name: string;
      status: string;
      provider: string;
      model: string;
      updatedAt: string | null;
    }> = (agents ?? []).map((agent: any) => ({
      id: String(agent.id),
      name: String(agent.name ?? "Unnamed agent"),
      status: String(agent.status ?? "unknown"),
      provider: String(agent.model_provider ?? "lovable"),
      model: String(agent.model ?? ""),
      updatedAt: agent.updated_at ? String(agent.updated_at) : null,
    }));

    const usage: UsageRow[] = Array.from(usageByModel.values()).sort((a, b) => b.runs - a.runs);
    const providers: Array<{
      id: string;
      name: string;
      defaultModel: string;
      configured: boolean;
    }> = PROVIDERS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      defaultModel: provider.defaultModel,
      configured: configured(provider.id),
    }));

    return {
      providers,
      assignments,
      usage,
      totals: {
        agents: assignments.length,
        activeAgents: assignments.filter((agent) => agent.status === "active").length,
        recentRuns: (tasks ?? []).length,
        recentCostPence: usage.reduce((sum, row) => sum + row.costPence, 0),
        configuredProviders: providers.filter((provider) => provider.configured).length,
      },
    };
  });
