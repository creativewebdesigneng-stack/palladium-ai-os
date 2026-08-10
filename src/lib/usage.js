import { useEffect, useState } from "react";
import { getPlanKey } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { getUsageSummary } from "@/lib/platform/platform.functions";

/**
 * Usage reporting.
 *
 * Usage is read from the backend only. Counters live in `usage_records`, which
 * users cannot insert, update or delete (writes happen with elevated
 * privileges from the runtime), so displayed consumption cannot be tampered
 * with and quota enforcement never depends on the browser.
 */

export const USAGE_METRIC_LABELS = {
  activeAgents: "Active AI Agents",
  agentExecutions: "Agent Executions",
  aiModelUsage: "AI Model Usage",
  workflowRuns: "Workflow Runs",
  memory: "Memory Usage",
  storage: "Workspace Storage",
  apiCalls: "API Calls",
  toolUsage: "Tool Usage",
};

// Display limits per tier. `null` = unlimited. Authoritative enforcement limits
// live in the `plans.limits` column and are applied by the server-side
// entitlement engine (src/lib/platform/entitlements.server.ts).
const PLAN_LIMITS = {
  free: {
    activeAgents: 0,
    agentExecutions: 0,
    aiModelUsage: 0,
    workflowRuns: 0,
    memory: 0.5,
    storage: 1,
    apiCalls: 0,
    toolUsage: 0,
  },
  pro: {
    activeAgents: 5,
    agentExecutions: 500,
    aiModelUsage: 2000,
    workflowRuns: 100,
    memory: 2,
    storage: 5,
    apiCalls: 1000,
    toolUsage: 100,
  },
  business: {
    activeAgents: 50,
    agentExecutions: 50000,
    aiModelUsage: 250000,
    workflowRuns: 25000,
    memory: 50,
    storage: 100,
    apiCalls: 500000,
    toolUsage: 10000,
  },
  enterprise: {
    activeAgents: 200,
    agentExecutions: 250000,
    aiModelUsage: 2000000,
    workflowRuns: null,
    memory: 250,
    storage: 500,
    apiCalls: 3000000,
    toolUsage: 50000,
  },
};

export function getPlanLimits(user) {
  const key = getPlanKey(user);
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}

// Backend metric names -> dashboard metric keys.
const METRIC_MAP = {
  "agent.run": "agentExecutions",
  agent_task: "agentExecutions",
  workflow_run: "workflowRuns",
  "tokens.total": "aiModelUsage",
  "tool.execution": "toolUsage",
  "api.request": "apiCalls",
  "storage.mb": "storage",
  "memory.mb": "memory",
};

function project(summary) {
  const out = {};
  const totals = summary?.totals ?? {};
  for (const [metric, value] of Object.entries(totals)) {
    const key = METRIC_MAP[metric];
    if (key) out[key] = (out[key] ?? 0) + Number(value ?? 0);
  }
  const ent = summary?.entitlements;
  if (ent) {
    out.activeAgents = ent.usage?.agents ?? 0;
    out.agentExecutions = out.agentExecutions ?? ent.usage?.tasksThisMonth ?? 0;
  }
  return out;
}

/** Live, server-sourced usage for the signed-in user. */
export function useUsage() {
  const [usage, setUsage] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The summary is bearer-authenticated: skip until a session exists.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data?.session) return;
      try {
        const summary = await getUsageSummary({ data: {} });
        if (!cancelled) setUsage(project(summary));
      } catch {
        if (!cancelled) setUsage({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return usage;
}
