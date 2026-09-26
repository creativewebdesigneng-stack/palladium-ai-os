/**
 * Browser automation console data.
 *
 * Returns the true provider state (not configured / development simulation /
 * production connected) plus the real recorded browser sessions for this user.
 * Nothing here invents sessions, pages or actions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { browserProviderStatus } from "@/lib/mission/browser-agent";
import {
  buildRecordedSessionComputerUsePlan,
  summarizeBrowserComputerUsePlan,
  type BrowserComputerUseVerdict,
} from "@/lib/runtime/browser-computer-use-policy.server";

type Sb = {
  from: (table: string) => any;
};

export const getBrowserControl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const [browser, sessions, executions] = await Promise.all([
      browserProviderStatus(),
      sb
        .from("browser_sessions")
        .select("id, provider, allowed_domains, status, steps, created_at, started_at, ended_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25),
      sb
        .from("tool_executions")
        .select("id, tool, status, duration_ms, created_at, error")
        .in("tool", ["browser", "shopping_search", "prepare_purchase"])
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    const rows: any[] = sessions.data ?? [];
    const sessionVerdicts = rows.map((session) => {
      const plan = buildRecordedSessionComputerUsePlan(
        Array.isArray(session.steps) ? session.steps : [],
        Array.isArray(session.allowed_domains) ? session.allowed_domains : [],
      );
      return {
        sessionId: session.id,
        ...summarizeBrowserComputerUsePlan(plan),
      };
    });
    const policyPlan: BrowserComputerUseVerdict & { sessionsReviewed: number } = {
      engine: "blackstar_computer_use",
      executable: sessionVerdicts.every((verdict) => verdict.executable),
      requiresApproval: sessionVerdicts.some((verdict) => verdict.requiresApproval),
      blockedCount: sessionVerdicts.reduce((sum, verdict) => sum + verdict.blockedCount, 0),
      allowedDomains: [...new Set(sessionVerdicts.flatMap((verdict) => verdict.allowedDomains))],
      reviewedSteps: sessionVerdicts.reduce((sum, verdict) => sum + verdict.reviewedSteps, 0),
      firstBlockReason: sessionVerdicts.find((verdict) => verdict.firstBlockReason)?.firstBlockReason ?? null,
      sessionsReviewed: sessionVerdicts.length,
    };
    return {
      browser,
      sessions: rows,
      executions: executions.data ?? [],
      policyPlan,
      sessionVerdicts,
      counts: {
        sessions: rows.length,
        active: rows.filter((s) => s.status === "running").length,
        steps: rows.reduce((n, s) => n + (Array.isArray(s.steps) ? s.steps.length : 0), 0),
        domains: new Set(rows.flatMap((s) => s.allowed_domains ?? [])).size,
      },
    };
  });
