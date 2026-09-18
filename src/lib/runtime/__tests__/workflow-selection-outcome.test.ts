import { describe, expect, it } from "vitest";
import {
  buildWorkflowSkillFeedback,
  normaliseWorkflowVerificationOutcome,
} from "../workflow-selection-outcome";

describe("workflow selection outcome feedback", () => {
  it("normalises only factual verifier fields and clamps scores", () => {
    expect(normaliseWorkflowVerificationOutcome({ score: 1.3, passed: true })).toEqual({
      score: 1,
      passed: true,
    });
    expect(normaliseWorkflowVerificationOutcome({ score: -0.2, passed: false })).toEqual({
      score: 0,
      passed: false,
    });
    expect(normaliseWorkflowVerificationOutcome({ score: "not-a-number", passed: "yes" })).toEqual({
      score: null,
      passed: null,
    });
  });

  it("summarises successful skill learning without inventing authority", () => {
    const feedback = buildWorkflowSkillFeedback({
      learning: {
        registry: { version: 1, skills: [] },
        changed: true,
        matched_skills: ["Market research"],
        promoted_skills: ["Forecasting"],
        certifications_awarded: ["Blackstar Verified — Market research"],
      },
    });

    expect(feedback).toEqual({
      matched_skills: ["Market research"],
      promoted_skills: ["Forecasting"],
      certifications_awarded: ["Blackstar Verified — Market research"],
      flagged_skills: [],
      reduced_skills: [],
      certifications_expired: [],
    });
  });

  it("keeps verifier-confirmed failure feedback separate from positive learning", () => {
    const feedback = buildWorkflowSkillFeedback({
      failure: {
        registry: { version: 1, skills: [] },
        changed: true,
        matched_skills: ["Market research"],
        reduced_skills: ["Market research"],
        certifications_expired: ["Blackstar Verified — Market research"],
      },
    });

    expect(feedback).toEqual(expect.objectContaining({
      matched_skills: [],
      flagged_skills: ["Market research"],
      reduced_skills: ["Market research"],
      certifications_expired: ["Blackstar Verified — Market research"],
    }));
  });

  it("returns no feedback when neither learning nor failure changed capability evidence", () => {
    expect(buildWorkflowSkillFeedback({})).toBeNull();
  });
});
