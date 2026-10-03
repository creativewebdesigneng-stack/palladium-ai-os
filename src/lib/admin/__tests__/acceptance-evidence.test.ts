import { describe, expect, it } from "vitest";
import {
  acceptanceEvidenceTable,
  recordedVerificationHasLinkedEvidence,
  summarizeAcceptanceEvidence,
} from "../acceptance-evidence";

describe("operational acceptance evidence summary", () => {
  it("keeps external-only gates separate from linked production ledgers", () => {
    expect(summarizeAcceptanceEvidence(undefined, undefined)).toEqual({
      linked: false,
      total: null,
      available: true,
      presentSources: 0,
      sourceCount: 0,
      sources: [],
    });
  });

  it("exposes each linked production evidence source instead of hiding it in one total", () => {
    const summary = summarizeAcceptanceEvidence(
      ["agentTasks", "workflowRuns"],
      {
        agentTasks: { count: 3, available: true },
        workflowRuns: { count: 0, available: true },
      },
    );

    expect(summary).toMatchObject({
      linked: true,
      total: 3,
      available: true,
      presentSources: 1,
      sourceCount: 2,
    });
    expect(summary.sources).toEqual([
      {
        key: "agentTasks",
        table: "agent_tasks",
        count: 3,
        available: true,
        present: true,
      },
      {
        key: "workflowRuns",
        table: "workflow_runs",
        count: 0,
        available: true,
        present: false,
      },
    ]);
  });

  it("fails closed when a configured evidence source is unavailable", () => {
    const summary = summarizeAcceptanceEvidence(
      ["modelEvalRuns", "modelEvalVerifiedEvidence"],
      {
        modelEvalRuns: { count: 1, available: true },
      },
    );

    expect(summary.available).toBe(false);
    expect(summary.total).toBe(1);
    expect(summary.sources[1]).toMatchObject({
      table: "model_eval_verified_evidence",
      available: false,
      count: 0,
    });
  });

  it("does not treat a recorded verified outcome as linked-evidence corroborated when ledgers are empty", () => {
    const empty = summarizeAcceptanceEvidence(
      ["cinemaShotRenders", "mediaGenerationJobs"],
      {
        cinemaShotRenders: { count: 0, available: true },
        mediaGenerationJobs: { count: 0, available: true },
      },
    );
    const present = summarizeAcceptanceEvidence(
      ["cinemaShotRenders", "mediaGenerationJobs"],
      {
        cinemaShotRenders: { count: 1, available: true },
        mediaGenerationJobs: { count: 0, available: true },
      },
    );

    expect(recordedVerificationHasLinkedEvidence("verified", empty)).toBe(false);
    expect(recordedVerificationHasLinkedEvidence("verified", present)).toBe(true);
    expect(recordedVerificationHasLinkedEvidence("waiting", present)).toBe(false);
  });

  it("resolves canonical evidence keys to their production table names", () => {
    expect(acceptanceEvidenceTable("marketplaceProviderDisputes"))
      .toBe("marketplace_provider_disputes");
  });
});
