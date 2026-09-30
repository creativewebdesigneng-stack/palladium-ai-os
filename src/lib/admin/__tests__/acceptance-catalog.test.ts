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

  it("uses only the approved production evidence table set", () => {
    expect(Object.values(ACCEPTANCE_EVIDENCE_TABLES)).toEqual([
      "agent_memories",
      "agent_skills",
      "marketplace_orders",
      "marketplace_payment_events",
      "cinema_shot_renders",
      "media_generation_jobs",
      "game_foundry_projects",
      "three_d_jobs",
      "communication_call_sessions",
      "mobile_intelligence_devices",
      "retail_call_inbox",
      "trading_simulations",
      "trading_watchlists",
      "trading_journal_entries",
    ]);
  });
});
