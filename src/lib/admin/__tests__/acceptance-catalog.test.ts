import { describe, expect, it } from "vitest";
import { ACCEPTANCE_EVIDENCE_TABLES, OPERATIONAL_ACCEPTANCE_ITEMS } from "../acceptance-catalog";

describe("operational acceptance catalogue", () => {
  it("contains every U01-U24 gate exactly once", () => {
    expect(OPERATIONAL_ACCEPTANCE_ITEMS).toHaveLength(24);
    expect(OPERATIONAL_ACCEPTANCE_ITEMS.map((item) => item.id)).toEqual(
      Array.from({ length: 24 }, (_, index) => `U${String(index + 1).padStart(2, "0")}`),
    );
  });

  it("keeps the first real-owner actions explicit", () => {
    expect(
      OPERATIONAL_ACCEPTANCE_ITEMS
        .filter((item) => item.priority === "owner-first")
        .map((item) => item.id),
    ).toEqual(["U01", "U04", "U23"]);
  });

  it("routes every gate into an existing Blackstar execution surface", () => {
    for (const item of OPERATIONAL_ACCEPTANCE_ITEMS) {
      expect(item.path).toMatch(/^\//);
      expect(item.action.length).toBeGreaterThan(3);
      expect(item.evidence.length).toBeGreaterThan(20);
    }
  });

  it("tracks the current external acceptance gaps inside the existing gates", () => {
    const byId = Object.fromEntries(OPERATIONAL_ACCEPTANCE_ITEMS.map((item) => [item.id, item]));
    expect(byId.U03?.title).toMatch(/Groq/);
    expect(byId.U03?.evidenceKeys).toEqual([
      "modelEvalRuns",
      "modelEvalResponses",
      "modelEvalVerifiedEvidence",
    ]);
    expect(byId.U06?.title).toMatch(/MCP/);
    expect(byId.U06?.evidenceKeys).toEqual([
      "syncConnections",
      "modelProviderCredentials",
    ]);
    expect(byId.U08?.title).toMatch(/3D/);
    expect(byId.U08?.evidence).toMatch(/ZModeler/);
    expect(byId.U10?.evidenceKeys).toEqual(
      expect.arrayContaining([
        "marketplaceRefundEvents",
        "marketplaceProviderDisputes",
        "marketplaceDeliveries",
      ]),
    );
  });

  it("uses only the approved production evidence table set", () => {
    expect(Object.values(ACCEPTANCE_EVIDENCE_TABLES)).toEqual([
      "agent_memories",
      "agent_tasks",
      "workflow_runs",
      "agent_skills",
      "model_eval_runs",
      "model_eval_responses",
      "model_eval_verified_evidence",
      "usage_records",
      "sync_connections",
      "model_provider_credentials",
      "marketplace_orders",
      "marketplace_payment_events",
      "marketplace_refund_events",
      "marketplace_provider_disputes",
      "marketplace_deliveries",
      "cinema_shot_renders",
      "media_generation_jobs",
      "game_foundry_projects",
      "three_d_jobs",
      "website_studio_projects",
      "construction_progress_evidence",
      "communication_call_sessions",
      "mobile_intelligence_devices",
      "retail_call_inbox",
      "dropshipping_fulfilment_evidence",
      "food_delivery_webhook_receipts",
      "company_workspaces",
      "compliance_change_reviews",
      "project_collaborators",
      "trading_simulations",
      "trading_watchlists",
      "trading_journal_entries",
    ]);
  });
});
