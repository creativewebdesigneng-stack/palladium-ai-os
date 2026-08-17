/**
 * Agent workspace API (typed RPC).
 *
 * Replaces the legacy `base44.entities.Agent.*` client surface. Every call runs
 * behind `requireSupabaseAuth`, so the caller identity comes from the verified
 * bearer token and RLS scopes every row to its owner.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const AGENT_STATUSES = ["draft", "active", "paused", "archived"];
const MODEL_PROVIDERS = ["lovable", "openai", "anthropic", "compatible"];

/** The caller's agents, newest first, plus their recent task rows. */
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

    let tasks: any[] = [];
    if (data.withTasks) {
      const res = await sb
        .from("agent_tasks")
        .select("id,agent_id,title,status,created_at,updated_at,completed_at")
        .order("created_at", { ascending: false })
        .limit(500);
      tasks = res.data ?? [];
    }
    return { agents: agents ?? [], tasks };
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
  .inputValidator(
    (input: {
      name: string;
      description?: string;
      category?: string;
      model?: string;
      model_provider?: string;
      instructions?: string;
      allowed_tools?: string[];
      preferences?: Record<string, unknown>;
      status?: string;
    }) => {
      const name = String(input?.name ?? "").trim();
      if (!name) throw new Error("Agent name is required");
      const status = AGENT_STATUSES.includes(input.status ?? "") ? input.status! : "draft";
      const modelProvider = String(input.model_provider ?? "openai").trim().toLowerCase();
      if (!MODEL_PROVIDERS.includes(modelProvider)) {
        throw new Error("Unknown AI model provider");
      }
      return {
        name: name.slice(0, 80),
        description: (input.description ?? "").slice(0, 2000),
        category: (input.category ?? "custom").slice(0, 40),
        model: (input.model ?? "gpt-5-mini").slice(0, 80),
        model_provider: modelProvider,
        instructions: (input.instructions ?? "").slice(0, 8000),
        allowed_tools: (input.allowed_tools ?? []).slice(0, 30).map((t) => String(t).slice(0, 40)),
        preferences: input.preferences ?? {},
        status,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("personal_agents")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        model: data.model,
        model_provider: data.model_provider,
        instructions: data.instructions || null,
        allowed_tools: data.allowed_tools,
        preferences: data.preferences,
        status: data.status,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
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
