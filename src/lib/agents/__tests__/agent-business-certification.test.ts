import { describe, expect, it } from "vitest";
import {
  buildAgentBusinessCertification,
  BUSINESS_CAPABILITY_BENCHMARKS,
} from "../agent-business-certification";

function task(id: string, score: number, passed = true) {
  return {
    id,
    status: "completed",
    verification_state: { passed, score },
  };
}

function execution(taskId: string, tool: string, output: Record<string, unknown> = {}) {
  return {
    agent_task_id: taskId,
    tool,
    status: "succeeded",
    output,
  };
}

describe("agent business capability certification", () => {
  it("does not certify tools that are not configured", () => {
    const results = buildAgentBusinessCertification({ allowedTools: [] });
    expect(results.every((item) => item.status === "not_configured")).toBe(true);
  });

  it("keeps configured capabilities ready until runtime evidence exists", () => {
    const web = buildAgentBusinessCertification({ allowedTools: ["web_search"] })
      .find((item) => item.id === "web_research");
    expect(web?.status).toBe("ready_for_evidence");
    expect(web?.verifiedTasks).toBe(0);
  });

  it("requires three verifier-backed tasks at the 0.90 floor", () => {
    const results = buildAgentBusinessCertification({
      allowedTools: ["web_search"],
      tasks: [task("t1", 0.96), task("t2", 0.91)],
      toolExecutions: [execution("t1", "web_search"), execution("t2", "web_search")],
    });
    const web = results.find((item) => item.id === "web_research");
    expect(web?.status).toBe("building_evidence");
    expect(web?.tasksRemaining).toBe(1);

    const complete = buildAgentBusinessCertification({
      allowedTools: ["web_search"],
      tasks: [task("t1", 0.96), task("t2", 0.91), task("t3", 0.94)],
      toolExecutions: [
        execution("t1", "web_search"),
        execution("t2", "web_search"),
        execution("t3", "web_search"),
      ],
    }).find((item) => item.id === "web_research");
    expect(complete?.status).toBe("verified");
    expect(complete?.recentAverageScore).toBeCloseTo(0.9367, 4);
  });

  it("does not count verifier-passed tasks without relevant successful tool evidence", () => {
    const web = buildAgentBusinessCertification({
      allowedTools: ["web_search"],
      tasks: [task("t1", 0.99), task("t2", 0.99), task("t3", 0.99)],
      toolExecutions: [],
    }).find((item) => item.id === "web_research");
    expect(web?.verifiedTasks).toBe(0);
    expect(web?.status).toBe("ready_for_evidence");
  });

  it("requires approval-boundary evidence for sensitive commerce certification", () => {
    const base = {
      allowedTools: ["prepare_purchase"],
      tasks: [task("t1", 0.95), task("t2", 0.95), task("t3", 0.95)],
      toolExecutions: [
        execution("t1", "prepare_purchase"),
        execution("t2", "prepare_purchase"),
        execution("t3", "prepare_purchase"),
      ],
    };
    const before = buildAgentBusinessCertification(base)
      .find((item) => item.id === "governed_financial_workflows");
    expect(before?.status).not.toBe("verified");
    expect(before?.approvalBoundaryObserved).toBe(false);

    const oneBoundary = buildAgentBusinessCertification({
      ...base,
      approvals: [{ task_id: "t3", action_type: "purchase", status: "pending" }],
    }).find((item) => item.id === "governed_financial_workflows");
    expect(oneBoundary?.status).toBe("building_evidence");
    expect(oneBoundary?.verifiedTasks).toBe(1);

    const after = buildAgentBusinessCertification({
      ...base,
      approvals: [
        { task_id: "t1", action_type: "purchase", status: "pending" },
        { task_id: "t2", action_type: "purchase", status: "pending" },
        { task_id: "t3", action_type: "purchase", status: "pending" },
      ],
    }).find((item) => item.id === "governed_financial_workflows");
    expect(after?.status).toBe("verified");
    expect(after?.verifiedTasks).toBe(3);
    expect(after?.approvalBoundaryObserved).toBe(true);
  });

  it("requires non-simulated connected-provider evidence for CRM/project certification", () => {
    const tasks = [task("t1", 0.95), task("t2", 0.96), task("t3", 0.97)];
    const simulated = buildAgentBusinessCertification({
      allowedTools: ["connected_service"],
      tasks,
      toolExecutions: [
        execution("t1", "connected_service", { provider: "hubspot", simulated: true }),
        execution("t2", "connected_service", { provider: "hubspot", simulated: true }),
        execution("t3", "connected_service", { provider: "hubspot", simulated: true }),
      ],
      approvals: [{ action_type: "hubspot_contact_update", status: "pending" }],
    }).find((item) => item.id === "crm_project_tasks");
    expect(simulated?.connectedProviderObserved).toBe(false);
    expect(simulated?.status).not.toBe("verified");

    const live = buildAgentBusinessCertification({
      allowedTools: ["connected_service"],
      tasks,
      toolExecutions: [
        execution("t1", "connected_service", { provider: "hubspot", data: { contacts: [] } }),
        execution("t2", "connected_service", { provider: "hubspot", data: { contacts: [] } }),
        execution("t3", "connected_service", { provider: "hubspot", data: { contacts: [] } }),
      ],
      approvals: [{ action_type: "hubspot_contact_update", status: "pending" }],
    }).find((item) => item.id === "crm_project_tasks");
    expect(live?.connectedProviderObserved).toBe(true);
    expect(live?.status).toBe("verified");
  });

  it("keeps financial analysis separate from money-affecting workflow certification", () => {
    const ids = BUSINESS_CAPABILITY_BENCHMARKS.map((item) => item.id);
    expect(ids).toContain("financial_analysis");
    expect(ids).toContain("governed_financial_workflows");
    const financial = BUSINESS_CAPABILITY_BENCHMARKS.find((item) => item.id === "financial_analysis");
    expect(financial?.approvalActions).toEqual([]);
    const governed = BUSINESS_CAPABILITY_BENCHMARKS.find((item) => item.id === "governed_financial_workflows");
    expect(governed?.approvalActions).toContain("purchase");
  });

  it("surfaces verifier or tool failures as attention when evidence is incomplete", () => {
    const result = buildAgentBusinessCertification({
      allowedTools: ["web_search"],
      tasks: [task("t1", 0.4, false)],
      toolExecutions: [{ agent_task_id: "t1", tool: "web_search", status: "failed", error: "network" }],
    }).find((item) => item.id === "web_research");
    expect(result?.status).toBe("attention_required");
    expect(result?.verifierFailures).toBe(1);
    expect(result?.failedToolExecutions).toBe(1);
  });
});
