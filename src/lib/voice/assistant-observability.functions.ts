import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getVoiceRuntimeCapabilities } from "./voice-runtime.server";

type Sb = { from: (table: string) => any };

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export const getAssistantObservability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [prefsRes, tasksRes, approvalsRes, usageRes] = await Promise.all([
      sb.from("voice_assistant_preferences")
        .select("enabled,muted,announce_notifications,updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      sb.from("agent_tasks")
        .select("id,title,status,model,tokens_in,tokens_out,cost_pence,duration_ms,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      sb.from("approval_requests")
        .select("id,title,action_type,risk_level,status,created_at")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("usage_records")
        .select("metric,quantity,occurred_at")
        .eq("user_id", userId)
        .gte("occurred_at", since)
        .limit(1000),
    ]);

    for (const result of [prefsRes, tasksRes, approvalsRes, usageRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    // Tool traces are an enhancement rather than a dependency. Older deployments
    // that have not yet materialised this audit table still get the rest of the pulse.
    let tools: any[] = [];
    try {
      const toolRes = await sb.from("tool_executions")
        .select("id,tool,status,duration_ms,error,policy_code,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!toolRes.error) tools = toolRes.data ?? [];
    } catch {
      tools = [];
    }

    const tasks = tasksRes.data ?? [];
    const approvals = approvalsRes.data ?? [];
    const usage = usageRes.data ?? [];
    const completed = tasks.filter((task: any) => task.status === "completed");
    const failed = tasks.filter((task: any) => task.status === "failed");
    const running = tasks.filter((task: any) => task.status === "running");
    const queued = tasks.filter((task: any) => task.status === "pending");
    const totalTokens = tasks.reduce((sum: number, task: any) => sum + safeNumber(task.tokens_in) + safeNumber(task.tokens_out), 0);
    const totalCostPence = tasks.reduce((sum: number, task: any) => sum + safeNumber(task.cost_pence), 0);
    const assistantRequests = usage
      .filter((row: any) => row.metric === "assistant_message")
      .reduce((sum: number, row: any) => sum + safeNumber(row.quantity), 0);

    const runtime = getVoiceRuntimeCapabilities();
    const prefs = prefsRes.data ?? null;
    return {
      voice: {
        enabled: prefs?.enabled ?? true,
        muted: prefs?.muted ?? false,
        announceNotifications: prefs?.announce_notifications ?? true,
        cloudSttConfigured: runtime.openai.configured,
        cloudSttModel: runtime.openai.sttDefaultModel,
      },
      pulse: {
        runningTasks: running.length,
        queuedTasks: queued.length,
        pendingApprovals: approvals.length,
        failedTasks: failed.length,
        completedTasks: completed.length,
        assistantRequests24h: assistantRequests,
        tokensInRecentTasks: totalTokens,
        costPenceRecentTasks: totalCostPence,
      },
      recentTasks: tasks.slice(0, 6).map((task: any) => ({
        id: task.id,
        title: task.title || "Untitled task",
        status: task.status,
        model: task.model ?? null,
        durationMs: safeNumber(task.duration_ms),
        costPence: safeNumber(task.cost_pence),
        createdAt: task.created_at,
      })),
      pendingApprovals: approvals.slice(0, 5).map((approval: any) => ({
        id: approval.id,
        title: approval.title,
        actionType: approval.action_type,
        riskLevel: approval.risk_level,
        createdAt: approval.created_at,
      })),
      recentTools: tools.map((tool: any) => ({
        id: tool.id,
        tool: tool.tool,
        status: tool.status,
        durationMs: safeNumber(tool.duration_ms),
        error: typeof tool.error === "string" ? tool.error.slice(0, 180) : null,
        policyCode: tool.policy_code ?? null,
        createdAt: tool.created_at,
      })),
    };
  });
