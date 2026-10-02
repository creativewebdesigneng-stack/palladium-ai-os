import { describe, expect, it } from "vitest";
import { ACCEPTANCE_EVIDENCE_TABLES, OPERATIONAL_ACCEPTANCE_ITEMS } from "../acceptance-catalog";
import { readFileSync } from "node:fs";

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

  it("does not present simulation/research ledgers as trading-provider evidence", () => {
    const trading = OPERATIONAL_ACCEPTANCE_ITEMS.find((item) => item.id === "U09");
    expect(trading?.evidenceKeys ?? []).toEqual([]);
    expect(Object.values(ACCEPTANCE_EVIDENCE_TABLES)).not.toContain("trading_simulations");
    expect(Object.values(ACCEPTANCE_EVIDENCE_TABLES)).not.toContain("trading_watchlists");
    expect(Object.values(ACCEPTANCE_EVIDENCE_TABLES)).not.toContain("trading_journal_entries");
  });

  it("scopes the 160-skill acceptance counter to the actual builtin procedure pack", () => {
    const functions = readFileSync(
      new URL("../acceptance.functions.ts", import.meta.url),
      "utf8",
    );
    expect(functions).toContain('key === "agentSkills"');
    expect(functions).toContain('.eq("source_kind", "builtin")');
    expect(functions).toContain('.like("source_ref", "blackstar-agent-procedures:v1:%")');
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
    ]);
  });
});
