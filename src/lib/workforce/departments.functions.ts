/**
 * Departments (agent teams) API — typed RPC, authenticated.
 *
 * A department is an organisation team that groups agents. Membership is the
 * agent's own `team_id`, so an agent can only be filed into a department the
 * caller can already see; RLS on `teams` and `personal_agents` decides access.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const uuid = z.string().uuid();

/** Departments for an organisation, with their member agent ids. */
export const listDepartments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ orgId: uuid.nullish() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    if (!data.orgId) return { departments: [] };
    const sb = context.supabase as unknown as Sb;
    const [{ data: teams, error }, { data: agents, error: agentsError }] = await Promise.all([
      sb
        .from("teams")
        .select("id,name,description,goal,lead_agent_id,permissions,status,created_at")
        .eq("org_id", data.orgId)
        .order("created_at", { ascending: true }),
      sb.from("personal_agents").select("id,team_id"),
    ]);
    if (error) throw new Error(error.message);
    if (agentsError) throw new Error(agentsError.message);
    return {
      departments: (teams ?? []).map((t: any) => ({
        ...t,
        agents: (agents ?? []).filter((a: any) => a.team_id === t.id).map((a: any) => a.id),
      })),
    };
  });

/** Creates or updates a department and re-files the agents assigned to it. */
export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: uuid.optional(),
        orgId: uuid,
        name: z.string().trim().min(2).max(60),
        goal: z.string().trim().max(300).optional().default(""),
        lead_agent_id: z.string().trim().optional().default(""),
        agents: z.array(uuid).max(200).optional().default([]),
        permissions: z.record(z.string(), z.boolean()).optional().default({}),
        status: z.enum(["active", "paused", "archived"]).optional().default("active"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const agentIds = [...new Set(data.agents)];
    if (agentIds.length) {
      const { data: agents, error: agentsError } = await sb.from("personal_agents").select("id").eq("org_id", data.orgId).in("id", agentIds);
      if (agentsError) throw new Error(agentsError.message);
      if ((agents ?? []).length !== agentIds.length) throw new Error("Every department agent must be accessible in this organisation.");
    }
    const payload = {
      org_id: data.orgId,
      name: data.name,
      goal: data.goal || null,
      lead_agent_id: data.lead_agent_id || null,
      permissions: data.permissions,
      status: data.status,
      created_by: context.userId,
    };
    const q = data.id
      ? sb.from("teams").update(payload).eq("id", data.id).eq("org_id", data.orgId)
      : sb.from("teams").insert(payload);
    const { data: team, error } = await q.select("id").maybeSingle();
    if (error) throw new Error(error.message);
    const teamId = team?.id;
    if (!teamId) throw new Error("You do not have permission to manage departments here.");

    const { error: clearError } = await sb.from("personal_agents").update({ team_id: null }).eq("team_id", teamId).eq("org_id", data.orgId);
    if (clearError) throw new Error(clearError.message);
    if (agentIds.length) {
      const { data: assigned, error: assignError } = await sb
        .from("personal_agents")
        .update({ team_id: teamId })
        .eq("org_id", data.orgId)
        .in("id", agentIds)
        .select("id");
      if (assignError) throw new Error(assignError.message);
      if ((assigned ?? []).length !== agentIds.length) throw new Error("Some department assignments could not be verified. Reload the department before retrying.");
    }
    return { id: teamId };
  });

/** Recent agent-to-agent messages produced by workforce runs (read-only). */
export const listAgentMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional().default(100) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("agent_messages")
      .select("id,kind,content,from_agent_id,to_agent_id,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });
