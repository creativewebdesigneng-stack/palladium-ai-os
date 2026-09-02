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

    const [voicePrefsRes, personalPrefsRes, profileRes, tasksRes, approvalsRes, usageRes, notificationsRes, workflowsRes] = await Promise.all([
      sb.from("voice_assistant_preferences")
        .select("enabled,muted,announce_notifications,updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      sb.from("personal_assistant_preferences")
        .select("assistant_name,location_name,timezone,welcome_enabled,briefing_enabled,updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      sb.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
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
      sb.from("notifications")
        .select("id,title,body,severity,read_at,created_at,link")
        .eq("user_id", userId)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      sb.from("workflow_runs")
        .select("id,status,input,output,error,created_at,updated_at,completed_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

    for (const result of [voicePrefsRes, personalPrefsRes, profileRes, tasksRes, approvalsRes, usageRes, notificationsRes, workflowsRes]) {
      if (result.error) throw new Error(result.error.message);
    }

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
    const notifications = notificationsRes.data ?? [];
    const workflows = workflowsRes.data ?? [];
    const completed = tasks.filter((task: any) => task.status === "completed");
    const failed = tasks.filter((task: any) => task.status === "failed");
    const running = tasks.filter((task: any) => task.status === "running");
    const queued = tasks.filter((task: any) => task.status === "pending");
    const runningWorkflows = workflows.filter((run: any) => ["running", "queued", "waiting_for_approval"].includes(run.status));
    const failedWorkflows = workflows.filter((run: any) => run.status === "failed");
    const completedWorkflows = workflows.filter((run: any) => run.status === "completed");
    const totalTokens = tasks.reduce((sum: number, task: any) => sum + safeNumber(task.tokens_in) + safeNumber(task.tokens_out), 0);
    const totalCostPence = tasks.reduce((sum: number, task: any) => sum + safeNumber(task.cost_pence), 0);
    const assistantRequests = usage
      .filter((row: any) => row.metric === "assistant_message")
      .reduce((sum: number, row: any) => sum + safeNumber(row.quantity), 0);

    const runtime = getVoiceRuntimeCapabilities();
    const voicePrefs = voicePrefsRes.data ?? null;
    const personalPrefs = personalPrefsRes.data ?? null;
    const profile = profileRes.data ?? null;
    const assistantName = personalPrefs?.assistant_name ?? "Blackstar";
    const userName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "there";
    const briefing: string[] = [];
    const activeCount = running.length + runningWorkflows.length;
    const issueCount = failed.length + failedWorkflows.length;
    if (activeCount) briefing.push(`${activeCount} item${activeCount === 1 ? " is" : "s are"} currently running.`);
    if (queued.length) briefing.push(`${queued.length} task${queued.length === 1 ? " is" : "s are"} queued.`);
    if (approvals.length) briefing.push(`${approvals.length} approval${approvals.length === 1 ? " needs" : "s need"} your attention.`);
    if (notifications.length) briefing.push(`${notifications.length} unread notification${notifications.length === 1 ? " is" : "s are"} waiting.`);
    if (issueCount) briefing.push(`${issueCount} recent execution${issueCount === 1 ? " needs" : "s need"} review.`);
    if (!briefing.length) briefing.push("Everything currently visible to me is stable and there is nothing urgent waiting for you.");

    return {
      identity: {
        assistantName,
        userName,
        locationName: personalPrefs?.location_name ?? null,
        timezone: personalPrefs?.timezone ?? null,
        welcomeEnabled: personalPrefs?.welcome_enabled ?? true,
        briefingEnabled: personalPrefs?.briefing_enabled ?? true,
      },
      briefing,
      voice: {
        enabled: voicePrefs?.enabled ?? true,
        muted: voicePrefs?.muted ?? false,
        announceNotifications: voicePrefs?.announce_notifications ?? true,
        cloudSttConfigured: runtime.openai.configured,
        cloudSttModel: runtime.openai.sttDefaultModel,
      },
      pulse: {
        runningTasks: running.length,
        queuedTasks: queued.length,
        pendingApprovals: approvals.length,
        unreadNotifications: notifications.length,
        runningWorkflows: runningWorkflows.length,
        failedTasks: failed.length,
        failedWorkflows: failedWorkflows.length,
        completedTasks: completed.length,
        completedWorkflows: completedWorkflows.length,
        assistantRequests24h: assistantRequests,
        tokensInRecentTasks: totalTokens,
        costPenceRecentTasks: totalCostPence,
      },
      notifications: notifications.slice(0, 5).map((item: any) => ({ id: item.id, title: item.title, body: item.body, severity: item.severity, link: item.link, createdAt: item.created_at })),
      recentWorkflows: workflows.slice(0, 5).map((run: any) => ({ id: run.id, status: run.status, input: typeof run.input === "string" ? run.input.slice(0, 120) : "Workflow run", output: typeof run.output === "string" ? run.output.slice(0, 160) : null, error: typeof run.error === "string" ? run.error.slice(0, 160) : null, updatedAt: run.updated_at })),
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
