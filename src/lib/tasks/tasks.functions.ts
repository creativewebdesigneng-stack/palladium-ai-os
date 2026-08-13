/**
 * Tasks & Workflows list API (typed RPC) for the Tasks and Workflows screens.
 *
 * Read-only aggregation over existing tables — no new tables, no schema
 * changes. Every query is scoped by `requireSupabaseAuth` + RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const MC_STATUS_LABEL: Record<string, string> = {
  pending: "Backlog",
  queued: "Queued",
  running: "Running",
  awaiting_approval: "Waiting",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const EXEC_STATUS_LABEL: Record<string, string> = {
  pending: "Backlog",
  queued: "Queued",
  running: "Running",
  succeeded: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Every task the caller can see: personal (Mission Control) + agent-run tasks, normalised for the Tasks screen. */
export const listTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 300), 1), 1000),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: personal }, { data: agentTasks }, { data: agents }, { data: approvals }] =
      await Promise.all([
        sb
          .from("personal_tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(data.limit),
        sb
          .from("agent_tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(data.limit),
        sb.from("personal_agents").select("id,name,category,model"),
        sb
          .from("approval_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    const agentById = new Map<string, any>(
      (agents ?? []).map((a: any) => [a.id, a] as [string, any]),
    );
    const fmtDate = (v: string | null) => (v ? String(v).slice(0, 10) : null);
    const fmtRelative = (v: string | null) => {
      if (!v) return "—";
      const ms = Date.now() - new Date(v).getTime();
      const mins = Math.round(ms / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.round(hrs / 24)}d ago`;
    };

    const fromPersonal = (t: any) => {
      const agent = agentById.get(t.agent_id);
      const approval = (approvals ?? []).find((a: any) => a.task_id === t.id);
      return {
        id: t.id,
        source: "personal_tasks",
        title: t.title || t.request?.slice(0, 80) || "Untitled task",
        description: t.request || "",
        project: t.category ? String(t.category) : "General",
        agent: agent?.name ?? "Unassigned",
        agentRole: agent?.category ?? "",
        owner: "You",
        priority: t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : "Medium",
        status: MC_STATUS_LABEL[t.status as string] ?? "Backlog",
        dueDate: fmtDate(t.due_at),
        created: fmtDate(t.created_at),
        updated: fmtRelative(t.updated_at),
        progress:
          t.status === "completed"
            ? 100
            : t.status === "running"
              ? 50
              : t.status === "cancelled"
                ? 0
                : 10,
        model: agent?.model ?? "—",
        instructions: t.request || "",
        tools: t.required_tools ?? [],
        files: [],
        activity: [{ t: fmtRelative(t.updated_at), text: `Status: ${t.status}` }],
        logs: "",
        results: t.result ? [{ name: "Result", size: null }] : [],
        comments: [],
        approvals: approval
          ? [
              {
                who: "You",
                status:
                  approval.status === "approved"
                    ? "Approved"
                    : approval.status === "rejected"
                      ? "Rejected"
                      : "Pending",
                at: fmtDate(approval.created_at),
              },
            ]
          : [],
      };
    };

    const fromAgentTask = (t: any) => {
      const agent = agentById.get(t.agent_id);
      return {
        id: t.id,
        source: "agent_tasks",
        title: t.title || t.input?.slice(0, 80) || "Agent run",
        description: t.input || "",
        project: "Agent Runs",
        agent: agent?.name ?? "Unassigned",
        agentRole: agent?.category ?? "",
        owner: "You",
        priority: "Medium",
        status: EXEC_STATUS_LABEL[t.status as string] ?? "Backlog",
        dueDate: fmtDate(t.completed_at),
        created: fmtDate(t.created_at),
        updated: fmtRelative(t.updated_at),
        progress:
          t.status === "succeeded"
            ? 100
            : t.status === "running"
              ? 50
              : t.status === "failed" || t.status === "cancelled"
                ? 0
                : 10,
        model: t.model ?? agent?.model ?? "—",
        instructions: t.input || "",
        tools: [],
        files: [],
        activity: [{ t: fmtRelative(t.updated_at), text: `Status: ${t.status}` }],
        logs: t.error ?? "",
        results: t.output_text ? [{ name: "Output", size: null }] : [],
        comments: [],
        approvals: [],
      };
    };

    const tasks = [
      ...(personal ?? []).map(fromPersonal),
      ...(agentTasks ?? []).map(fromAgentTask),
    ].sort((a, b) => (b.created || "").localeCompare(a.created || ""));

    return { tasks };
  });

const WF_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  failed: "Failed",
  completed: "Completed",
};

/** Workflows with their steps (as nodes) and recent run stats, for the Workflows screen. */
export const listWorkflows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: workflows }, { data: steps }, { data: runs }] = await Promise.all([
      sb.from("workflows").select("*").order("updated_at", { ascending: false }),
      sb.from("workflow_steps").select("*").order("position", { ascending: true }),
      sb.from("workflow_runs").select("*").order("created_at", { ascending: false }),
    ]);

    const nodeType = (kind: string) => {
      const m: Record<string, string> = {
        agent: "AI Agent",
        condition: "Condition",
        action: "Action",
        api: "API",
        database: "Database",
        notification: "Notification",
        approval: "Approval",
        delay: "Delay",
        loop: "Loop",
      };
      return m[kind] ?? "Action";
    };

    const list = (workflows ?? []).map((w: any) => {
      const wSteps = (steps ?? []).filter((s: any) => s.workflow_id === w.id);
      const wRuns = (runs ?? []).filter((r: any) => r.workflow_id === w.id);
      const succeeded = wRuns.filter((r: any) => r.status === "succeeded").length;
      const successRate = wRuns.length ? Math.round((succeeded / wRuns.length) * 100) : 0;
      const nodes = [
        {
          type: "Trigger",
          label: `Trigger · ${w.trigger_type ?? "manual"}`,
          config: w.schedule ?? "",
        },
        ...wSteps.map((s: any) => ({
          type: nodeType(s.kind),
          label: s.name || s.kind,
          config: s.input_template ?? "",
        })),
      ];
      return {
        id: w.id,
        name: w.name,
        description: w.description ?? "",
        status: WF_STATUS_LABEL[w.status as string] ?? "Draft",
        trigger: (w.trigger_type ?? "manual").replace(/^\w/, (c: string) => c.toUpperCase()),
        owner: "You",
        lastRun: wRuns[0]?.created_at ? new Date(wRuns[0].created_at).toLocaleString() : "—",
        runs: wRuns.length,
        successRate,
        nodes,
      };
    });

    return { workflows: list };
  });

/** Recent runs for one workflow, normalised for RunHistoryTable. */
export const listWorkflowRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workflow_id: string }) => ({
    workflow_id: String(input?.workflow_id ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: runs } = await sb
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", data.workflow_id)
      .order("created_at", { ascending: false })
      .limit(30);

    const fmtTime = (v: string | null) =>
      v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
    const duration = (a: string | null, b: string | null) => {
      if (!a || !b) return "—";
      const ms = new Date(b).getTime() - new Date(a).getTime();
      if (ms < 0) return "—";
      const s = Math.round(ms / 1000);
      return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`;
    };
    const statusLabel: Record<string, string> = {
      pending: "Draft",
      queued: "Draft",
      running: "Active",
      succeeded: "Completed",
      failed: "Failed",
      cancelled: "Paused",
    };

    return {
      runs: (runs ?? []).map((r: any) => ({
        runId: r.id,
        workflow: data.workflow_id,
        started: fmtTime(r.started_at ?? r.created_at),
        completed: fmtTime(r.completed_at),
        duration: duration(r.started_at ?? r.created_at, r.completed_at),
        status: statusLabel[r.status as string] ?? "Draft",
        agent: "—",
        errors: r.error ?? "",
      })),
    };
  });

/** Flips a workflow's status (active/paused/draft), scoped to its owner. */
export const setWorkflowStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    const allowed = ["draft", "active", "paused", "failed", "completed"];
    if (!input?.id) throw new Error("Workflow id is required");
    if (!allowed.includes(input.status)) throw new Error("Unsupported workflow status");
    return { id: String(input.id), status: input.status };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("workflows")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Workflow not found");
    return row;
  });

/** Permanently deletes one of the caller's workflows (steps/runs cascade). */
export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Workflow id is required");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("workflows")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Imports a workflow definition (JSON) exported from PalladiumAI or written by
 * hand. Validated in full before anything is written; the workflow and its
 * steps are always created for the calling user.
 */
export const importWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { definition?: unknown }) => {
    const def = (input?.definition ?? {}) as any;
    const name = String(def.name ?? "").trim();
    if (!name) throw new Error("The workflow definition needs a name.");
    if (name.length > 120) throw new Error("Workflow names must be 120 characters or fewer.");
    const description = String(def.description ?? "").slice(0, 1000);
    const triggerTypes = ["manual", "schedule", "webhook", "event"];
    const triggerType = String(def.trigger_type ?? def.trigger ?? "manual").toLowerCase();
    if (!triggerTypes.includes(triggerType))
      throw new Error(
        `Unsupported trigger "${triggerType}". Use manual, schedule, webhook or event.`,
      );
    const schedule = def.schedule ? String(def.schedule).slice(0, 200) : null;

    const kinds = [
      "agent",
      "condition",
      "action",
      "api",
      "database",
      "notification",
      "approval",
      "delay",
      "loop",
    ];
    const rawSteps = Array.isArray(def.steps) ? def.steps : [];
    if (rawSteps.length === 0) throw new Error("The workflow definition needs at least one step.");
    if (rawSteps.length > 100) throw new Error("Workflows are limited to 100 steps.");
    const steps = rawSteps.map((s: any, i: number) => {
      const kind = String(s?.kind ?? "action").toLowerCase();
      if (!kinds.includes(kind))
        throw new Error(`Step ${i + 1} has an unsupported kind "${kind}".`);
      const mode = String(s?.mode ?? "sequential").toLowerCase();
      if (!["sequential", "parallel"].includes(mode))
        throw new Error(`Step ${i + 1} mode must be sequential or parallel.`);
      return {
        kind,
        mode,
        name: s?.name ? String(s.name).slice(0, 120) : `Step ${i + 1}`,
        position: Number.isFinite(Number(s?.position)) ? Number(s.position) : i,
        input_template: s?.input_template ? String(s.input_template).slice(0, 4000) : null,
        tool: s?.tool ? String(s.tool).slice(0, 120) : null,
        requires_approval: Boolean(s?.requires_approval),
        continue_on_error: Boolean(s?.continue_on_error),
        max_retries: Math.min(Math.max(Number(s?.max_retries ?? 0), 0), 5),
      };
    });

    return { name, description, triggerType, schedule, steps };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: workflow, error } = await sb
      .from("workflows")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description || null,
        trigger_type: data.triggerType,
        schedule: data.schedule,
        status: "draft",
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!workflow) throw new Error("The workflow could not be created.");

    const { error: stepError } = await sb
      .from("workflow_steps")
      .insert(data.steps.map((s: any) => ({ ...s, workflow_id: workflow.id })));
    if (stepError) {
      await sb.from("workflows").delete().eq("id", workflow.id).eq("user_id", context.userId);
      throw new Error(stepError.message);
    }

    return { id: workflow.id, name: workflow.name, steps: data.steps.length };
  });
