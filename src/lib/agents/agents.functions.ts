/**
 * Agent workspace API (typed RPC).
 *
 * Every call runs behind `requireSupabaseAuth`, so the caller identity comes
 * from the verified bearer token and RLS scopes every row to its owner.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  compileAgentSystemPrompt,
  hasAgentSpecV2,
  normaliseOperatingProfile,
  type AgentOperatingProfile,
} from "./agent-spec";

type Sb = { from: (t: string) => any };

const AGENT_STATUSES = ["draft", "active", "paused", "archived"];
const MODEL_PROVIDERS = ["lovable", "openai", "anthropic", "groq", "compatible"];
const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-4-5-20250929",
  groq: "openai/gpt-oss-120b",
  compatible: "local-model",
};

type AgentWriteInput = {
  name: string;
  description?: string;
  category?: string;
  purpose?: string;
  personality?: string;
  system_prompt?: string;
  model?: string;
  model_provider?: string;
  temperature?: number;
  max_tokens?: number;
  memory_enabled?: boolean;
  requires_approval?: boolean;
  autonomy?: string;
  instructions?: string;
  allowed_tools?: string[];
  preferences?: Record<string, unknown>;
  status?: string;
  operating_profile?: AgentOperatingProfile | Record<string, unknown> | null;
};

function normaliseAgentWrite(input: AgentWriteInput) {
  const name = String(input?.name ?? "").trim();
  if (!name) throw new Error("Agent name is required");
  const status = AGENT_STATUSES.includes(input.status ?? "") ? input.status! : "draft";
  const modelProvider = String(input.model_provider ?? "openai").trim().toLowerCase();
  if (!MODEL_PROVIDERS.includes(modelProvider)) throw new Error("Unknown AI model provider");

  const temperature = Number.isFinite(Number(input.temperature))
    ? Math.min(Math.max(Number(input.temperature), 0), 2)
    : 0.4;
  const maxTokens = Number.isFinite(Number(input.max_tokens))
    ? Math.min(Math.max(Math.round(Number(input.max_tokens)), 64), 32_768)
    : 4096;
  const model = String(input.model ?? "").trim() || DEFAULT_MODEL_BY_PROVIDER[modelProvider] || "gpt-5-mini";
  const operatingProfile = input.operating_profile === undefined
    ? undefined
    : normaliseOperatingProfile(input.operating_profile);
  const baseSystemPrompt = (input.system_prompt ?? "").slice(0, 8000);

  return {
    name: name.slice(0, 80),
    description: (input.description ?? "").slice(0, 2000),
    category: (input.category ?? "custom").slice(0, 40),
    purpose: (input.purpose ?? "").slice(0, 4000),
    personality: (input.personality ?? "").slice(0, 2000),
    system_prompt: operatingProfile === undefined
      ? baseSystemPrompt
      : compileAgentSystemPrompt(baseSystemPrompt, operatingProfile).slice(0, 16000),
    model: model.slice(0, 160),
    model_provider: modelProvider,
    temperature,
    max_tokens: maxTokens,
    memory_enabled: input.memory_enabled !== false,
    requires_approval: input.requires_approval !== false,
    autonomy: (input.autonomy ?? "supervised").slice(0, 40),
    instructions: (input.instructions ?? "").slice(0, 8000),
    allowed_tools: (input.allowed_tools ?? []).slice(0, 30).map((t) => String(t).slice(0, 40)),
    preferences: input.preferences ?? {},
    status,
    operating_profile: operatingProfile,
    spec_version: operatingProfile && hasAgentSpecV2(operatingProfile) ? 2 : undefined,
  };
}

/**
 * The caller's agents plus the execution ledgers needed by the Agent Operations
 * view. RLS scopes every table to rows the caller can access.
 */
export const listAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; withTasks?: boolean } | undefined) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 100), 1), 500),
    withTasks: input?.withTasks !== false,
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: agents, error } = await sb
      .from("personal_agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    if (!data.withTasks) {
      return { agents: agents ?? [], tasks: [], workflows: [], workflowRuns: [], workflowStepRuns: [] };
    }

    const [tasksRes, workflowsRes, runsRes, stepRunsRes] = await Promise.all([
      sb
        .from("agent_tasks")
        .select("id,agent_id,task_id,title,input,status,provider,model,started_at,heartbeat_at,created_at,updated_at,completed_at,error")
        .order("created_at", { ascending: false })
        .limit(500),
      sb
        .from("workflows")
        .select("id,name,description,status,workforce_id,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100),
      sb
        .from("workflow_runs")
        .select("id,workflow_id,workforce_id,status,input,output,started_at,completed_at,created_at,waiting_step_id")
        .order("created_at", { ascending: false })
        .limit(100),
      sb
        .from("workflow_step_runs")
        .select("id,run_id,workflow_id,step_id,agent_id,name,kind,position,attempt,status,input,output,error,started_at,completed_at,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (tasksRes.error) throw new Error(tasksRes.error.message);
    if (workflowsRes.error) throw new Error(workflowsRes.error.message);
    if (runsRes.error) throw new Error(runsRes.error.message);
    if (stepRunsRes.error) throw new Error(stepRunsRes.error.message);

    return {
      agents: agents ?? [],
      tasks: tasksRes.data ?? [],
      workflows: workflowsRes.data ?? [],
      workflowRuns: runsRes.data ?? [],
      workflowStepRuns: stepRunsRes.data ?? [],
    };
  });

/** Flips an agent's lifecycle status. Ownership is enforced by RLS + filter. */
export const setAgentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!input?.id) throw new Error("Agent id is required");
    if (!AGENT_STATUSES.includes(input.status)) throw new Error("Unknown agent status");
    return { id: String(input.id), status: input.status };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("personal_agents")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Agent not found");
    return row;
  });

/** Copies one of the caller's own agents into a new draft. */
export const duplicateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Agent id is required");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: source, error } = await sb
      .from("personal_agents")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!source) throw new Error("Agent not found");

    const {
      id: _id,
      created_at: _created,
      updated_at: _updated,
      last_run_at: _lastRun,
      slug: _slug,
      ...rest
    } = source as Record<string, unknown>;

    const { data: copy, error: insertError } = await sb
      .from("personal_agents")
      .insert({ ...rest, user_id: context.userId, name: `${source.name} Copy`, status: "draft" })
      .select()
      .maybeSingle();
    if (insertError) throw new Error(insertError.message);
    return copy;
  });

/** Creates an agent for the caller from the workspace / wizard form. */
export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AgentWriteInput) => normaliseAgentWrite(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("personal_agents")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        purpose: data.purpose || null,
        personality: data.personality || null,
        system_prompt: data.system_prompt || null,
        model: data.model,
        model_provider: data.model_provider,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        memory_enabled: data.memory_enabled,
        requires_approval: data.requires_approval,
        autonomy: data.autonomy,
        instructions: data.instructions || null,
        allowed_tools: data.allowed_tools,
        preferences: data.preferences,
        status: data.status,
        ...(data.operating_profile !== undefined ? { operating_profile: data.operating_profile } : {}),
        ...(data.spec_version !== undefined ? { spec_version: data.spec_version } : {}),
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Updates the full intelligence configuration of one of the caller's agents. */
export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AgentWriteInput & { id: string }) => {
    if (!input?.id) throw new Error("Agent id is required");
    return { id: String(input.id), ...normaliseAgentWrite(input) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { id, operating_profile, spec_version, ...write } = data;
    const payload: Record<string, unknown> = {
      ...write,
      description: write.description || null,
      purpose: write.purpose || null,
      personality: write.personality || null,
      system_prompt: write.system_prompt || null,
      instructions: write.instructions || null,
      updated_at: new Date().toISOString(),
    };
    // Old clients do not know about Spec v2 yet. Omission must preserve an
    // existing operating profile rather than silently downgrading the agent.
    if (operating_profile !== undefined) payload["operating_profile"] = operating_profile;
    if (spec_version !== undefined) payload["spec_version"] = spec_version;

    const { data: row, error } = await sb
      .from("personal_agents")
      .update(payload)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Agent not found");
    return row;
  });

/** Permanently deletes one of the caller's agents. */
export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Agent id is required");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("personal_agents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
