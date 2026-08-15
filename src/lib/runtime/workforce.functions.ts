/**
 * Workforce engine API (typed RPC). Authenticated; the caller identity always
 * comes from the verified bearer token.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EntitlementError } from "@/lib/platform/entitlements.server";
import { decideWorkflowApproval } from "./workflow-approval-decision.server";
import {
  assertSupportedWorkflowStepKind,
  normaliseWorkflowStepConfig,
} from "./workflow-step-config";
import { executeWorkflow, requestWorkflowCancellation, WorkforceError } from "./workforce.server";

export { normaliseWorkflowStepConfig };

type Sb = { from: (t: string) => any };

type AgentRef = { agent_id: string; role?: string };

function surface(error: unknown): never {
  if (error instanceof WorkforceError || error instanceof EntitlementError)
    throw new Error(error.message);
  console.error("[workforce.api]", error);
  throw new Error(error instanceof Error ? error.message : "The workforce engine is unavailable.");
}

async function requireAccessibleOrg(sb: Sb, orgId: string | null) {
  if (!orgId) return;
  const { data, error } = await sb
    .from("organisations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (error || !data)
    throw new Error("Organisation not found or you do not have access to it.");
}

async function requireOwnedWorkforce(sb: Sb, userId: string, workforceId: string) {
  const { data, error } = await sb
    .from("workforces")
    .select("id,user_id,org_id")
    .eq("id", workforceId)
    .maybeSingle();
  if (error || !data || data.user_id !== userId)
    throw new Error("Workforce not found or you are not its owner.");
  return data;
}

async function requireOwnedWorkflow(sb: Sb, userId: string, workflowId: string) {
  const { data, error } = await sb
    .from("workflows")
    .select("id,user_id,org_id,workforce_id")
    .eq("id", workflowId)
    .maybeSingle();
  if (error || !data || data.user_id !== userId)
    throw new Error("Workflow not found or you are not its owner.");
  return data;
}

async function requireAssignableAgents(
  sb: Sb,
  userId: string,
  orgId: string | null,
  agentIds: string[],
) {
  const ids = [...new Set(agentIds.filter(Boolean))];
  if (!ids.length) return;
  const { data, error } = await sb
    .from("personal_agents")
    .select("id,user_id,org_id")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const byId = new Map(rows.map((row: any) => [String(row.id), row]));
  for (const id of ids) {
    const row: any = byId.get(id);
    const owned = row?.user_id === userId;
    const sharedInOrg = Boolean(orgId && row?.org_id === orgId);
    if (!row || (!owned && !sharedInOrg))
      throw new Error("One or more selected agents are not available to this workforce.");
  }
}

/** Workforces with their member agents and the workflows they own. */
export const listWorkforces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: workforces }, { data: members }, { data: workflows }] = await Promise.all([
      sb.from("workforces").select("*").order("created_at", { ascending: false }),
      sb.from("workforce_agents").select("*, agent:personal_agents(id,name,category,status,model)"),
      sb.from("workflows").select("id,name,description,status,workforce_id,updated_at"),
    ]);
    return {
      workforces: (workforces ?? []).map((w: any) => ({
        ...w,
        agents: (members ?? []).filter((m: any) => m.workforce_id === w.id),
        workflows: (workflows ?? []).filter((f: any) => f.workforce_id === w.id),
      })),
    };
  });

/** Creates a workforce and attaches its agents with roles. */
export const saveWorkforce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      description?: string;
      purpose?: string;
      department?: string;
      status?: string;
      org_id?: string | null;
      agents?: AgentRef[];
    }) => {
      const name = String(input?.name ?? "").trim();
      if (!name) throw new Error("Give the workforce a name.");
      return {
        id: input.id ? String(input.id) : null,
        name,
        description: input.description ? String(input.description) : null,
        purpose: input.purpose ? String(input.purpose) : null,
        department: input.department ? String(input.department) : null,
        status: input.status ? String(input.status) : "active",
        org_id: input.org_id ? String(input.org_id) : null,
        agents: (input.agents ?? []).map((a) => ({
          agent_id: String(a.agent_id),
          role: String(a.role ?? "member"),
        })),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireAccessibleOrg(sb, data.org_id);
    if (data.id) await requireOwnedWorkforce(sb, context.userId, data.id);
    await requireAssignableAgents(
      sb,
      context.userId,
      data.org_id,
      data.agents.map((a) => a.agent_id),
    );

    const row = {
      name: data.name,
      description: data.description,
      purpose: data.purpose,
      department: data.department,
      status: data.status,
      org_id: data.org_id,
      user_id: context.userId,
    };

    const { data: workforce, error } = data.id
      ? await sb
          .from("workforces")
          .update(row)
          .eq("id", data.id)
          .eq("user_id", context.userId)
          .select("*")
          .maybeSingle()
      : await sb.from("workforces").insert(row).select("*").maybeSingle();
    if (error || !workforce) throw new Error(error?.message ?? "Could not save that workforce.");

    // Replace membership only after the parent ownership and every requested
    // agent association have been validated server-side.
    await sb.from("workforce_agents").delete().eq("workforce_id", workforce.id);
    if (data.agents.length) {
      const { error: memberError } = await sb.from("workforce_agents").insert(
        data.agents.map((a) => ({
          workforce_id: workforce.id,
          agent_id: a.agent_id,
          role: a.role,
        })),
      );
      if (memberError) throw new Error(memberError.message);
    }
    return { workforce };
  });

/** Creates or replaces a workflow and its ordered, dependency-aware steps. */
export const saveWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      description?: string;
      workforce_id?: string | null;
      org_id?: string | null;
      status?: string;
      steps?: any[];
    }) => {
      const name = String(input?.name ?? "").trim();
      if (!name) throw new Error("Give the workflow a name.");
      return {
        id: input.id ? String(input.id) : null,
        name,
        description: input.description ? String(input.description) : null,
        workforce_id: input.workforce_id ? String(input.workforce_id) : null,
        org_id: input.org_id ? String(input.org_id) : null,
        status: input.status ?? "active",
        steps: (input.steps ?? []).slice(0, 25).map((s: any, index: number) => {
          const kind = assertSupportedWorkflowStepKind(s?.kind ?? "agent", `Step ${index + 1}`);
          return {
            position: Number.isFinite(s?.position) ? Number(s.position) : index,
            name: s?.name ? String(s.name) : null,
            kind,
            config: normaliseWorkflowStepConfig(kind, s?.config),
            agent_id: s?.agent_id ? String(s.agent_id) : null,
            mode: ["sequential", "parallel", "conditional"].includes(s?.mode)
              ? s.mode
              : "sequential",
            depends_on: Array.isArray(s?.depends_on) ? s.depends_on.map(String) : [],
            condition: s?.condition && typeof s.condition === "object" ? s.condition : {},
            input_template: s?.input_template ? String(s.input_template) : null,
            max_retries: Math.min(Math.max(Number(s?.max_retries ?? 1), 1), 4),
            retry_delay_ms: Math.min(Math.max(Number(s?.retry_delay_ms ?? 500), 0), 10_000),
            timeout_ms: Math.min(Math.max(Number(s?.timeout_ms ?? 120_000), 5_000), 300_000),
            continue_on_error: Boolean(s?.continue_on_error),
            requires_approval: Boolean(s?.requires_approval),
          };
        }),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireAccessibleOrg(sb, data.org_id);
    if (data.id) await requireOwnedWorkflow(sb, context.userId, data.id);
    if (data.workforce_id) {
      const parent = await requireOwnedWorkforce(sb, context.userId, data.workforce_id);
      if ((parent.org_id ?? null) !== data.org_id)
        throw new Error("Workflow and workforce must belong to the same organisation scope.");
    }
    await requireAssignableAgents(
      sb,
      context.userId,
      data.org_id,
      data.steps.map((step) => step.agent_id).filter(Boolean) as string[],
    );

    const row = {
      name: data.name,
      description: data.description,
      workforce_id: data.workforce_id,
      org_id: data.org_id,
      status: data.status,
      user_id: context.userId,
    };

    const { data: workflow, error } = data.id
      ? await sb
          .from("workflows")
          .update(row)
          .eq("id", data.id)
          .eq("user_id", context.userId)
          .select("*")
          .maybeSingle()
      : await sb.from("workflows").insert(row).select("*").maybeSingle();
    if (error || !workflow) throw new Error(error?.message ?? "Could not save that workflow.");

    // Always replace the step set, including when the editor intentionally
    // saves an empty workflow. This prevents removed steps from reappearing.
    await sb.from("workflow_steps").delete().eq("workflow_id", workflow.id);
    if (data.steps.length) {
      const { error: stepError } = await sb
        .from("workflow_steps")
        .insert(data.steps.map((s) => ({ ...s, workflow_id: workflow.id })));
      if (stepError) throw new Error(stepError.message);
    }

    const { data: steps } = await sb
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("position", { ascending: true });
    return { workflow, steps: steps ?? [] };
  });

/** Runs a workflow across its workforce (sequential / parallel / conditional). */
export const runWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workflow_id: string; input: string }) => {
    if (!input?.workflow_id) throw new Error("A workflow is required.");
    return { workflow_id: String(input.workflow_id), input: String(input.input ?? "") };
  })
  .handler(async ({ data, context }) => {
    try {
      return await executeWorkflow({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        workflowId: data.workflow_id,
        input: data.input,
        trigger: "manual",
      });
    } catch (error) {
      surface(error);
    }
  });

/** Requests cancellation of an active workflow run. The runtime will abort any
 * in-flight agent/model/tool work and mark the run cancelled. */
export const cancelWorkflowRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { run_id: string }) => {
    if (!input?.run_id) throw new Error("A workflow run is required.");
    return { run_id: String(input.run_id) };
  })
  .handler(async ({ data, context }) => {
    try {
      return await requestWorkflowCancellation({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        runId: data.run_id,
      });
    } catch (error) {
      surface(error);
    }
  });

/** Owner-only decision for a workflow approval. Approved runs resume on the
 * same durable workflow_runs row; rejected runs obey continue_on_error. */
export const decideWorkflowApprovalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    approval_request_id: string;
    decision: "approved" | "rejected";
    note?: string | null;
  }) => {
    const approval_request_id = String(input?.approval_request_id ?? "").trim();
    if (!approval_request_id) throw new Error("An approval request is required.");
    if (input?.decision !== "approved" && input?.decision !== "rejected")
      throw new Error("Decision must be approved or rejected.");
    return {
      approval_request_id,
      decision: input.decision,
      note: input.note ? String(input.note).trim().slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    try {
      return await decideWorkflowApproval({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        approvalRequestId: data.approval_request_id,
        decision: data.decision,
        note: data.note,
      });
    } catch (error) {
      surface(error);
    }
  });

/** A workflow, its steps and its recent runs. */
export const getWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workflow_id: string }) => ({
    workflow_id: String(input?.workflow_id ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: workflow }, { data: steps }, { data: runs }] = await Promise.all([
      sb.from("workflows").select("*").eq("id", data.workflow_id).maybeSingle(),
      sb
        .from("workflow_steps")
        .select("*")
        .eq("workflow_id", data.workflow_id)
        .order("position", { ascending: true }),
      sb
        .from("workflow_runs")
        .select("*")
        .eq("workflow_id", data.workflow_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (!workflow) throw new Error("Workflow not found or you do not have access to it.");
    return { workflow, steps: steps ?? [], runs: runs ?? [] };
  });

/** The execution ledger for one run: per-step attempts and agent handoffs. */
export const getWorkflowRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { run_id: string }) => ({ run_id: String(input?.run_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: run }, { data: stepRuns }, { data: messages }] = await Promise.all([
      sb.from("workflow_runs").select("*").eq("id", data.run_id).maybeSingle(),
      sb
        .from("workflow_step_runs")
        .select("*")
        .eq("run_id", data.run_id)
        .order("position", { ascending: true })
        .order("attempt", { ascending: true }),
      sb
        .from("agent_messages")
        .select("*")
        .eq("run_id", data.run_id)
        .order("created_at", { ascending: true }),
    ]);
    if (!run) throw new Error("Run not found or you do not have access to it.");
    return { run, stepRuns: stepRuns ?? [], messages: messages ?? [] };
  });
