import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiBriefing,
  emitWebhook,
  fallbackBriefing,
  prepareCheckoutDraft,
  routeRequest,
  runShoppingResearch,
} from "./mission.server";
import { assertWithinLimits } from "@/lib/shopping/limits.server";
import { notify } from "@/lib/notifications/notify.server";

type Sb = { from: (t: string) => any; rpc?: unknown };

const DEFAULT_DOMAINS = [
  "amazon.co.uk",
  "johnlewis.com",
  "argos.co.uk",
  "currys.co.uk",
  "ikea.com",
  "booking.com",
  "trainline.com",
  "tesco.com",
  "sainsburys.co.uk",
];

async function log(sb: Sb, userId: string, action: string, extra: Record<string, unknown> = {}) {
  await sb.from("mission_audit_logs").insert({
    user_id: userId,
    action,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    target_type: (extra["target_type"] as string | null) ?? null,
    target_id: (extra["target_id"] as string | null) ?? null,
    status: (extra["status"] as string | null) ?? "success",
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

async function activity(
  sb: Sb,
  userId: string,
  message: string,
  kind: string,
  extra: Record<string, unknown> = {},
) {
  await sb.from("agent_activities").insert({
    user_id: userId,
    message,
    kind,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    task_id: (extra["task_id"] as string | null) ?? null,
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

/* ------------------------------------------------------------------ overview */

export const getMissionOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [
      agents,
      tasks,
      approvals,
      activities,
      purchases,
      memories,
      shoppingResults,
      audit,
      notifications,
      usage,
      agentRuns,
      workforces,
      workforceRuns,
    ] = await Promise.all([
      sb.from("personal_agents").select("*").order("created_at", { ascending: false }),
      sb.from("personal_tasks").select("*").order("created_at", { ascending: false }).limit(80),
      sb.from("approval_requests").select("*").order("created_at", { ascending: false }).limit(60),
      sb.from("agent_activities").select("*").order("created_at", { ascending: false }).limit(40),
      sb.from("purchase_requests").select("*").order("created_at", { ascending: false }).limit(40),
      sb.from("personal_memories").select("*").order("category", { ascending: true }),
      sb.from("shopping_results").select("*").order("created_at", { ascending: false }).limit(80),
      sb.from("mission_audit_logs").select("*").order("created_at", { ascending: false }).limit(30),
      sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(40),
      sb
        .from("usage_records")
        .select("metric, quantity, unit, occurred_at")
        .gte("occurred_at", monthStart.toISOString())
        .limit(500),
      sb
        .from("agent_tasks")
        .select("id, title, status, provider, model, tokens_in, tokens_out, cost_pence, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      sb.from("workforces").select("*").order("created_at", { ascending: false }).limit(40),
      sb
        .from("workflow_runs")
        .select("id, workflow_id, workforce_id, status, input, output, started_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const agentRows = agents.data ?? [];
    const taskRows = tasks.data ?? [];
    const approvalRows = approvals.data ?? [];
    const activityRows = activities.data ?? [];
    const shoppingRows = shoppingResults.data ?? [];
    const workforceRows = workforces.data ?? [];
    const workforceRunRows = workforceRuns.data ?? [];

    const pendingApprovals = approvalRows.filter((a: any) => a.status === "pending");
    const running = taskRows.filter((t: any) => t.status === "running" || t.status === "queued");
    const completed = taskRows.filter((t: any) => t.status === "completed");
    const upcoming = taskRows.filter((t: any) => t.status === "pending");
    const personalAgents = agentRows.filter((a: any) => (a.scope ?? "personal") === "personal");
    const professionalAgents = agentRows.filter((a: any) => a.scope === "professional");

    const counts = {
      tasks: taskRows.filter((t: any) => t.status !== "completed" && t.status !== "cancelled")
        .length,
      approvals: pendingApprovals.length,
      shopping: shoppingRows.length,
      running: running.length,
      agents: agentRows.filter((a: any) => a.status === "active").length,
    };

    const notificationRows = notifications.data ?? [];
    const usageRows = usage.data ?? [];
    const runRows = agentRuns.data ?? [];

    const line = (label: string, items: string[]) =>
      `${label}: ${items.length ? items.join("; ") : "none"}`;
    const when = (iso?: string | null) =>
      iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "UTC" }) : "no date";

    const briefingFacts = [
      line(
        "Open tasks",
        upcoming
          .slice(0, 6)
          .map((t: any) => `${t.title ?? t.request} (${t.category}, due ${when(t.due_at)})`),
      ),
      line(
        "Running now",
        running.slice(0, 5).map((t: any) => `${t.title ?? t.request} (${t.status})`),
      ),
      line(
        "Pending approvals",
        pendingApprovals
          .slice(0, 5)
          .map(
            (a: any) =>
              `${a.title} (${a.action_type}, risk ${a.risk_level}${
                a.estimated_cost ? `, ${a.currency} ${a.estimated_cost}` : ""
              })`,
          ),
      ),
      line(
        "Upcoming calendar and reminders",
        taskRows
          .filter((t: any) => t.due_at && t.status !== "completed" && t.status !== "cancelled")
          .slice(0, 6)
          .map((t: any) => `${t.title ?? t.request} at ${when(t.due_at)}`),
      ),
      line(
        "Shopping findings",
        shoppingRows
          .slice(0, 5)
          .map(
            (r: any) =>
              `${r.product}${r.price ? ` at ${r.currency} ${r.price}` : ""}${r.seller ? ` from ${r.seller}` : ""}`,
          ),
      ),
      line(
        "Recent agent activity",
        activityRows.slice(0, 6).map((a: any) => `${a.kind}: ${a.message}`),
      ),
      line(
        "Unread notifications",
        notificationRows
          .filter((n: any) => !n.read_at)
          .slice(0, 5)
          .map((n: any) => n.title),
      ),
      line(
        "Workforces",
        workforceRows
          .slice(0, 5)
          .map((w: any) => `${w.name} (${w.status}${w.department ? `, ${w.department}` : ""})`),
      ),
      `Counts: ${counts.agents} active agents, ${counts.tasks} open tasks, ${counts.approvals} pending approvals, ${counts.running} running tasks, ${completed.length} completed, ${taskRows.filter((t: any) => t.status === "failed").length} failed.`,
    ].join("\n");

    const briefingFallback = fallbackBriefing(counts);
    const briefing = await aiBriefing(briefingFacts, briefingFallback);

    const usageByMetric: Record<string, number> = {};
    for (const r of usageRows as any[]) {
      const key = String(r.metric);
      usageByMetric[key] = (usageByMetric[key] ?? 0) + Number(r.quantity ?? 0);
    }

    const tokensIn = runRows.reduce((sum: number, r: any) => sum + Number(r.tokens_in ?? 0), 0);
    const tokensOut = runRows.reduce((sum: number, r: any) => sum + Number(r.tokens_out ?? 0), 0);
    const costPence = runRows.reduce((sum: number, r: any) => sum + Number(r.cost_pence ?? 0), 0);

    return {
      briefing,
      agents: agentRows,
      personalAgents,
      professionalAgents,
      tasks: taskRows,
      approvals: approvalRows,
      activities: activityRows,
      purchases: purchases.data ?? [],
      memories: memories.data ?? [],
      shoppingResults: shoppingRows,
      audit: audit.data ?? [],
      notifications: notificationRows,
      workforces: workforceRows,
      workforceRuns: workforceRunRows,
      agentRuns: runRows,
      usage: {
        byMetric: usageByMetric,
        agentRuns: runRows.length,
        succeededRuns: runRows.filter(
          (r: any) => r.status === "succeeded" || r.status === "completed",
        ).length,
        failedRuns: runRows.filter((r: any) => r.status === "failed").length,
        tokensIn,
        tokensOut,
        costPence,
      },
      metrics: {
        activeAgents: counts.agents,
        totalAgents: agentRows.length,
        runningTasks: running.length,
        upcomingTasks: upcoming.length,
        awaitingApproval: pendingApprovals.length,
        completedTasks: completed.length,
        personalTasks: taskRows.filter((t: any) => t.scope === "personal").length,
        professionalTasks: taskRows.filter((t: any) => t.scope === "professional").length,
        failedTasks: taskRows.filter((t: any) => t.status === "failed").length,
        unreadNotifications: notificationRows.filter((n: any) => !n.read_at).length,
        personalAgents: personalAgents.length,
        professionalAgents: professionalAgents.length,
        workforces: workforceRows.length,
        activeWorkforces: workforceRows.filter((w: any) => w.status === "active").length,
        runningWorkforceRuns: workforceRunRows.filter(
          (r: any) => r.status === "running" || r.status === "queued",
        ).length,
      },
    };
  });

/* -------------------------------------------------------------------- agents */

type AgentInput = {
  id?: string;
  name: string;
  category: string;
  purpose?: string;
  personality?: string;
  instructions?: string;
  preferences?: Record<string, unknown>;
  budget_limit?: number | null;
  currency?: string;
  allowed_tools?: string[];
  requires_approval?: boolean;
  autonomy?: string;
  schedule?: string;
  scope?: string;
  allowed_domains?: string[];
};

export const savePersonalAgent = createServerFn({ method: "POST" })
  .inputValidator((input: AgentInput) => {
    if (!input?.name?.trim()) throw new Error("Agent name is required");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const autonomy = ["assist", "prepare", "execute", "approval_required"].includes(
      data.autonomy ?? "",
    )
      ? data.autonomy
      : "prepare";
    const tools = data.allowed_tools ?? [];
    const row = {
      user_id: userId,
      name: data.name.trim(),
      category: data.category || "custom",
      purpose: data.purpose ?? null,
      personality: data.personality ?? "professional",
      instructions: data.instructions ?? null,
      preferences: data.preferences ?? {},
      budget_limit: data.budget_limit ?? null,
      currency: data.currency ?? "GBP",
      allowed_tools: tools,
      requires_approval:
        tools.includes("checkout") || tools.includes("booking") || autonomy === "approval_required"
          ? true
          : (data.requires_approval ?? true),
      autonomy,
      schedule: data.schedule ?? null,
      scope: data.scope === "professional" ? "professional" : "personal",
    };

    let saved: any;
    if (data.id) {
      const res = await sb
        .from("personal_agents")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      saved = res.data;
    } else {
      const res = await sb.from("personal_agents").insert(row).select().maybeSingle();
      if (res.error) throw new Error(res.error.message);
      saved = res.data;
    }
    if (!saved) throw new Error("Agent could not be saved");

    const domains = data.allowed_domains?.length ? data.allowed_domains : DEFAULT_DOMAINS;
    if (tools.length) {
      await sb.from("tool_permissions").upsert(
        tools.map((tool) => ({
          user_id: userId,
          agent_id: saved.id,
          tool,
          enabled: true,
          requires_approval: ["checkout", "booking", "email_draft"].includes(tool),
          allowed_domains:
            tool === "browser" || tool === "shopping_search" || tool === "checkout" ? domains : [],
          spend_cap: tool === "checkout" ? (data.budget_limit ?? null) : null,
        })),
        { onConflict: "agent_id,tool" },
      );
    }

    await log(sb, userId, data.id ? "agent_updated" : "agent_created", {
      agent_id: saved.id,
      target_type: "personal_agent",
      target_id: saved.id,
      metadata: { name: saved.name },
    });
    await activity(
      sb,
      userId,
      `${saved.name} ${data.id ? "updated" : "created"}`,
      "agent_created",
      { agent_id: saved.id },
    );
    return saved;
  });

export const deletePersonalAgent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb
      .from("personal_agents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (res.error) throw new Error(res.error.message);
    await log(sb, context.userId, "agent_deleted", {
      target_type: "personal_agent",
      target_id: data.id,
    });
    return { ok: true };
  });

/* --------------------------------------------------------------- task router */

type SubmitInput = { request: string; agentId?: string | null };

export const submitPersonalTask = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitInput) => {
    if (!input?.request?.trim()) throw new Error("Tell your agent what you need");
    return { request: input.request.trim(), agentId: input.agentId ?? null };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const agentRes = data.agentId
      ? await sb
          .from("personal_agents")
          .select("*")
          .eq("id", data.agentId)
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null, error: null };
    const agent = agentRes.data;

    const decision = await routeRequest(data.request, agent);
    const requiresApproval =
      decision.requiresApproval ||
      Boolean(agent?.requires_approval) ||
      ["checkout", "booking"].some((t) => decision.requiredTools.includes(t));

    const budget = agent?.budget_limit ?? decision.estimatedCost ?? null;
    const currency = agent?.currency ?? "GBP";

    const taskRes = await sb
      .from("personal_tasks")
      .insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        title: decision.title,
        request: data.request,
        category: decision.category,
        status: requiresApproval ? "awaiting_approval" : "running",
        priority: decision.priority,
        scope: agent?.scope ?? "personal",
        due_at: decision.dueAt,
        involves_money: decision.involvesMoney,
        required_tools: decision.requiredTools,
        requires_approval: requiresApproval,
      })
      .select()
      .maybeSingle();
    if (taskRes.error || !taskRes.data) throw new Error(taskRes.error?.message ?? "Could not create task");
    const task = taskRes.data;

    await activity(sb, userId, `Request received: ${decision.title}`, "task_started", {
      agent_id: agent?.id ?? null,
      task_id: task.id,
    });

    if (decision.category === "shopping") {
      const shoppingTaskRes = await sb
        .from("shopping_tasks")
        .insert({
          user_id: userId,
          agent_id: agent?.id ?? null,
          personal_task_id: task.id,
          query: decision.searchQuery ?? data.request,
          budget,
          currency,
          preferences: decision.preferences,
          status: "searching",
        })
        .select()
        .maybeSingle();
      if (shoppingTaskRes.error || !shoppingTaskRes.data)
        throw new Error(shoppingTaskRes.error?.message ?? "Could not start shopping research");
      const shoppingTask = shoppingTaskRes.data;

      const allowedDomains = DEFAULT_DOMAINS;
      const allowedTools = agent?.allowed_tools?.length
        ? agent.allowed_tools
        : ["browser", "shopping_search", "checkout"];
      const offers = await runShoppingResearch(
        decision.searchQuery ?? data.request,
        budget,
        currency,
        allowedDomains,
        allowedTools,
      );

      const insertRows = offers.map((o, i) => ({
        shopping_task_id: shoppingTask.id,
        product: o.product,
        price: o.price,
        currency: o.currency,
        seller: o.seller,
        delivery: o.delivery,
        delivery_cost: o.deliveryCost,
        rating: o.rating,
        url: o.url,
        specs: o.specs,
        reason: o.reason,
        in_stock: o.inStock,
        selected: i === 0,
      }));
      const resultsRes = await sb.from("shopping_results").insert(insertRows).select();
      const results: any[] = resultsRes.data ?? [];
      const best = results[0];

      await activity(
        sb,
        userId,
        `Agent found ${results.length} matching products`,
        "results_found",
        { agent_id: agent?.id ?? null, task_id: task.id },
      );
      await log(sb, userId, "search_performed", {
        agent_id: agent?.id ?? null,
        target_type: "shopping_task",
        target_id: shoppingTask.id,
        metadata: { results: results.length, budget },
      });

      if (best) {
        const draft = await prepareCheckoutDraft({
          offer: {
            product: best.product,
            price: Number(best.price),
            currency: best.currency,
            seller: best.seller,
            delivery: best.delivery,
            deliveryCost: Number(best.delivery_cost ?? 0),
            rating: Number(best.rating ?? 0),
            url: best.url,
            inStock: best.in_stock,
            specs: best.specs ?? {},
            reason: best.reason ?? "",
          },
          allowedDomains,
          allowedTools,
        });

        try {
          await assertWithinLimits(sb, userId, agent?.id ?? null, Number(draft.total));
        } catch (error) {
          const reason = (error as Error).message;
          await sb
            .from("personal_tasks")
            .update({ status: "failed", result: { blocked: reason } })
            .eq("id", task.id)
            .eq("user_id", userId);
          await sb
            .from("shopping_tasks")
            .update({ status: "failed", notes: reason })
            .eq("id", shoppingTask.id)
            .eq("user_id", userId);
          await activity(sb, userId, `Purchase blocked by your spend limits: ${reason}`, "failed", {
            agent_id: agent?.id ?? null,
            task_id: task.id,
          });
          await log(sb, userId, "purchase_blocked_by_limit", {
            agent_id: agent?.id ?? null,
            target_type: "shopping_task",
            target_id: shoppingTask.id,
            status: "blocked",
            metadata: { total: draft.total, reason },
          });
          return {
            taskId: task.id,
            decision,
            shoppingTaskId: shoppingTask.id,
            results,
            blocked: reason,
          };
        }

        const approvalRes = await sb
          .from("approval_requests")
          .insert({
            user_id: userId,
            agent_id: agent?.id ?? null,
            task_id: task.id,
            action_type: "purchase",
            title: `Purchase: ${draft.product}`,
            summary: best.reason,
            details: {
              product: draft.product,
              seller: draft.seller,
              delivery: best.delivery,
              rating: best.rating,
              url: best.url,
              budget,
            },
            estimated_cost: draft.total,
            currency: draft.currency,
            risk_level: draft.total > 500 ? "high" : draft.total > 100 ? "medium" : "low",
            status: "pending",
          })
          .select()
          .maybeSingle();

        await sb.from("purchase_requests").insert({
          user_id: userId,
          shopping_task_id: shoppingTask.id,
          shopping_result_id: best.id,
          approval_request_id: approvalRes.data?.id ?? null,
          product: draft.product,
          seller: draft.seller,
          item_price: draft.itemPrice,
          delivery_cost: draft.deliveryCost,
          tax: draft.tax,
          fees: draft.fees,
          total: draft.total,
          currency: draft.currency,
          status: "awaiting_approval",
          checkout_url: draft.checkoutUrl,
        });

        await sb
          .from("shopping_tasks")
          .update({ status: "awaiting_approval" })
          .eq("id", shoppingTask.id)
          .eq("user_id", userId);
        await sb
          .from("personal_tasks")
          .update({
            status: "awaiting_approval",
            result: { results: results.length, recommended: draft.product, total: draft.total },
          })
          .eq("id", task.id)
          .eq("user_id", userId);
        await activity(
          sb,
          userId,
          `Agent waiting for approval: ${draft.product}`,
          "awaiting_approval",
          { agent_id: agent?.id ?? null, task_id: task.id },
        );
        await emitWebhook(userId, "approval.required", {
          task_id: task.id,
          title: `Purchase: ${draft.product}`,
          action_type: "purchase",
          estimated_cost: draft.total,
          currency: draft.currency,
        });
        await notify({
          userId,
          type: "purchase.approval_required",
          title: `Approval needed to buy ${draft.product}`,
          body: `Estimated total ${draft.currency} ${draft.total}. No money moves until you approve.`,
          link: "/mission-control",
          metadata: { task_id: task.id, purchase_request_id: approvalRes.data?.id ?? null },
        });
        await log(sb, userId, "purchase_prepared", {
          agent_id: agent?.id ?? null,
          target_type: "purchase_request",
          target_id: approvalRes.data?.id ?? null,
          metadata: { total: draft.total },
        });
      }

      return { taskId: task.id, decision, shoppingTaskId: shoppingTask.id, results };
    }

    if (requiresApproval) {
      await sb.from("approval_requests").insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        task_id: task.id,
        action_type: decision.category === "travel" ? "booking" : "external_action",
        title: decision.title,
        summary: decision.reason,
        details: { request: data.request, tools: decision.requiredTools },
        estimated_cost: budget,
        currency,
        risk_level: decision.involvesMoney ? "medium" : "low",
        status: "pending",
      });
      await emitWebhook(userId, "approval.required", {
        task_id: task.id,
        title: decision.title,
        action_type: decision.category === "travel" ? "booking" : "external_action",
        estimated_cost: budget,
        currency,
      });
      await notify({
        userId,
        type: "approval.required",
        title: `Approval needed: ${decision.title}`,
        body: decision.reason,
        link: "/mission-control",
        metadata: { task_id: task.id, category: decision.category },
      });
      await sb
        .from("personal_tasks")
        .update({ status: "awaiting_approval" })
        .eq("id", task.id)
        .eq("user_id", userId);
      await activity(
        sb,
        userId,
        `Agent prepared an action awaiting approval: ${decision.title}`,
        "awaiting_approval",
        { agent_id: agent?.id ?? null, task_id: task.id },
      );
      return { taskId: task.id, decision };
    }

    await sb
      .from("personal_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result: {
          summary: `${decision.category} request handled by ${agent?.name ?? "Mission Control"}`,
          tools: decision.requiredTools,
        },
      })
      .eq("id", task.id)
      .eq("user_id", userId);
    await activity(sb, userId, `Agent completed research: ${decision.title}`, "completed", {
      agent_id: agent?.id ?? null,
      task_id: task.id,
    });
    return { taskId: task.id, decision };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const allowed = ["pending", "queued", "running", "completed", "cancelled"];
    if (!allowed.includes(data.status)) throw new Error("Unsupported status");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "completed") patch["completed_at"] = new Date().toISOString();
    const res = await sb
      .from("personal_tasks")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

/* ----------------------------------------------------------------- approvals */

export const decideApproval = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; decision: "approve" | "reject"; note?: string }) => {
    if (input.decision !== "approve" && input.decision !== "reject")
      throw new Error("Invalid decision");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const current = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const approval = current.data;
    if (!approval) throw new Error("Approval request not found");
    if (approval.status !== "pending") throw new Error("This request has already been decided");

    if (data.decision === "approve" && approval.estimated_cost != null) {
      try {
        await assertWithinLimits(sb, userId, approval.agent_id, Number(approval.estimated_cost));
      } catch (error) {
        await log(sb, userId, "purchase_blocked_by_limit", {
          agent_id: approval.agent_id,
          target_type: "approval_request",
          target_id: approval.id,
          status: "blocked",
          metadata: {
            estimated_cost: approval.estimated_cost,
            reason: (error as Error).message,
          },
        });
        throw error;
      }
    }

    const status = data.decision === "approve" ? "approved" : "rejected";
    const decisionResult = await sb
      .from("approval_requests")
      .update({
        status,
        decided_at: new Date().toISOString(),
        decided_by: userId,
        decision_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();
    if (decisionResult.error) throw new Error(decisionResult.error.message);
    if (!decisionResult.data) throw new Error("This request has already been decided");

    const purchase = await sb
      .from("purchase_requests")
      .select("*")
      .eq("approval_request_id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (purchase.data) {
      await sb
        .from("purchase_requests")
        .update({
          status: data.decision === "approve" ? "approved_awaiting_checkout" : "rejected",
        })
        .eq("id", purchase.data.id)
        .eq("user_id", userId);
    }

    if (approval.task_id) {
      await sb
        .from("personal_tasks")
        .update({
          status: data.decision === "approve" ? "running" : "cancelled",
        })
        .eq("id", approval.task_id)
        .eq("user_id", userId);
    }

    await activity(
      sb,
      userId,
      `${data.decision === "approve" ? "You approved" : "You rejected"}: ${approval.title}`,
      data.decision === "approve" ? "approved" : "rejected",
      { agent_id: approval.agent_id, task_id: approval.task_id },
    );
    await log(sb, userId, data.decision === "approve" ? "purchase_approved" : "purchase_rejected", {
      agent_id: approval.agent_id,
      target_type: "approval_request",
      target_id: approval.id,
      status,
      metadata: { action_type: approval.action_type, estimated_cost: approval.estimated_cost },
    });

    return { status, purchase: purchase.data ?? null };
  });

export const chooseAlternative = createServerFn({ method: "POST" })
  .inputValidator((input: { approvalId: string; resultId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const approvalRes = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", data.approvalId)
      .eq("user_id", userId)
      .maybeSingle();
    const approval = approvalRes.data;
    if (!approval || approval.status !== "pending") throw new Error("Approval request is not open");

    const purchaseRes = await sb
      .from("purchase_requests")
      .select("*")
      .eq("approval_request_id", data.approvalId)
      .eq("user_id", userId)
      .maybeSingle();
    const purchase = purchaseRes.data;
    if (!purchase) throw new Error("No prepared purchase for this request");

    const resultRes = await sb
      .from("shopping_results")
      .select("*")
      .eq("id", data.resultId)
      .maybeSingle();
    const result = resultRes.data;
    if (!result || result.shopping_task_id !== purchase.shopping_task_id)
      throw new Error("Product not available for this task");

    const draft = await prepareCheckoutDraft({
      offer: {
        product: result.product,
        price: Number(result.price),
        currency: result.currency,
        seller: result.seller,
        delivery: result.delivery,
        deliveryCost: Number(result.delivery_cost ?? 0),
        rating: Number(result.rating ?? 0),
        url: result.url,
        inStock: result.in_stock,
        specs: result.specs ?? {},
        reason: result.reason ?? "",
      },
      allowedDomains: DEFAULT_DOMAINS,
      allowedTools: ["browser", "shopping_search", "checkout"],
    });

    await sb
      .from("shopping_results")
      .update({ selected: false })
      .eq("shopping_task_id", purchase.shopping_task_id);
    await sb.from("shopping_results").update({ selected: true }).eq("id", result.id);
    await sb
      .from("purchase_requests")
      .update({
        shopping_result_id: result.id,
        product: draft.product,
        seller: draft.seller,
        item_price: draft.itemPrice,
        delivery_cost: draft.deliveryCost,
        tax: draft.tax,
        fees: draft.fees,
        total: draft.total,
        currency: draft.currency,
        checkout_url: draft.checkoutUrl,
        status: "awaiting_approval",
      })
      .eq("id", purchase.id)
      .eq("user_id", userId);

    await sb
      .from("approval_requests")
      .update({
        title: `Purchase: ${draft.product}`,
        summary: result.reason,
        estimated_cost: draft.total,
        details: {
          product: draft.product,
          seller: draft.seller,
          delivery: result.delivery,
          rating: result.rating,
          url: result.url,
        },
        risk_level: draft.total > 500 ? "high" : draft.total > 100 ? "medium" : "low",
      })
      .eq("id", data.approvalId)
      .eq("user_id", userId);

    await log(sb, userId, "product_selected", {
      agent_id: approval.agent_id,
      target_type: "shopping_result",
      target_id: result.id,
      metadata: { total: draft.total },
    });
    await activity(
      sb,
      userId,
      `Agent prepared an alternative: ${draft.product}`,
      "awaiting_approval",
      { agent_id: approval.agent_id, task_id: approval.task_id },
    );
    return { ok: true };
  });

export const confirmPurchase = createServerFn({ method: "POST" })
  .inputValidator((input: { purchaseId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const purchaseRes = await sb
      .from("purchase_requests")
      .select("*")
      .eq("id", data.purchaseId)
      .eq("user_id", userId)
      .maybeSingle();
    const purchase = purchaseRes.data;
    if (!purchase) throw new Error("Purchase request not found");
    if (purchase.status !== "approved_awaiting_checkout")
      throw new Error("This purchase has not been approved");

    const approval = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", purchase.approval_request_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!approval.data || approval.data.status !== "approved")
      throw new Error("Approval is required before checkout");

    await assertWithinLimits(sb, userId, approval.data.agent_id, Number(purchase.total));

    await sb
      .from("purchase_requests")
      .update({ status: "checkout_ready" })
      .eq("id", purchase.id)
      .eq("user_id", userId);
    await log(sb, userId, "checkout_confirmed", {
      agent_id: approval.data.agent_id,
      target_type: "purchase_request",
      target_id: purchase.id,
      metadata: { total: purchase.total, currency: purchase.currency },
    });
    return { checkoutUrl: purchase.checkout_url, purchaseId: purchase.id };
  });

export const saveMemory = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; category: string; key: string; value: unknown }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      user_id: context.userId,
      category: data.category,
      key: data.key,
      value: data.value,
    };
    if (data.id) {
      const res = await sb
        .from("personal_memories")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    }
    const res = await sb.from("personal_memories").insert(row).select().maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb
      .from("personal_memories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const markNotifications = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; all?: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (!data.all && data.id) q = q.eq("id", data.id);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const clearMemoryCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { category: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb
      .from("personal_memories")
      .delete()
      .eq("user_id", context.userId)
      .eq("category", data.category);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
