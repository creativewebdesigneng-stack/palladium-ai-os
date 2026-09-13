import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913020000_legal_automation_state.sql", import.meta.url),
  "utf8",
);
const worker = readFileSync(new URL("./legal-automation.server.ts", import.meta.url), "utf8");
const monitor = readFileSync(
  new URL("./legal-regulatory-monitor.server.ts", import.meta.url),
  "utf8",
);
const functions = readFileSync(
  new URL("./legal-regulatory-watch.functions.ts", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../routes/api/internal/workflow-runs.ts", import.meta.url),
  "utf8",
);
const notifications = readFileSync(
  new URL("../notifications/types.ts", import.meta.url),
  "utf8",
);
const ui = readFileSync(
  new URL("../../components/legal/LegalRegulatoryWatch.jsx", import.meta.url),
  "utf8",
);

describe("Legal Hub durable automation state", () => {
  it("adds bounded regulatory scheduling, claim/retry state and one-shot date markers", () => {
    expect(migration).toContain("check_interval_hours integer not null default 24");
    expect(migration).toContain("check (check_interval_hours between 1 and 720)");
    expect(migration).toContain("next_check_at timestamptz not null");
    expect(migration).toContain("claimed_at timestamptz");
    expect(migration).toContain("attempts integer not null default 0");
    expect(migration).toContain("last_review_signal_for date");
    expect(migration).toContain("last_due_signal_for date");
    expect(migration).toContain("where status = 'active'");
  });

  it("reuses the single protected runtime worker instead of adding another scheduler", () => {
    expect(route).toContain('import { processDueLegalAutomation } from "@/lib/legal/legal-automation.server"');
    expect(route).toContain("processDueLegalAutomation(Math.min(2, limit))");
    expect(route).toContain('isValidRuntimeWorkerToken("workflow_runner", supplied)');
    expect(route).toContain("legal_automation: legalAutomation");
  });

  it("claims only active due regulatory watches and retries failures without duplicate queue ownership", () => {
    expect(worker).toContain('.eq("status", "active")');
    expect(worker).toContain('.lte("next_check_at", nowIso)');
    expect(worker).toContain('.is("claimed_at", null)');
    expect(worker).toContain("retryMinutes");
    expect(worker).toContain("claimed_at: null");
  });
});

describe("Legal Hub alert honesty and idempotence", () => {
  it("deduplicates regulatory review signals by watch and evidence fingerprint", () => {
    expect(monitor).toContain('legal.regulatory_review_signal');
    expect(monitor).toContain("evidence_fingerprint: args.fingerprint");
    expect(monitor).toContain("reviewSignalAlreadyRecorded");
    expect(monitor).toContain("not proof that the underlying law changed");
  });

  it("marks compliance and rights dates after emitted or preference-suppressed review signals", () => {
    expect(worker).toContain('type: "legal.compliance_review_due"');
    expect(worker).toContain("last_review_signal_for: row.review_on");
    expect(worker).toContain('type: "legal.recorded_date_review_due"');
    expect(worker).toContain("last_due_signal_for: row.due_on");
    expect(worker).toContain('if (outcome === "failed")');
  });

  it("never describes saved dates as proven statutory deadlines or breaches", () => {
    expect(worker).toContain("not a determination that a legal deadline exists");
    expect(worker).toContain("Blackstar is not determining that this is a statutory deadline");
    expect(notifications).toContain("this is a review reminder, not a legal conclusion");
    expect(notifications).toContain("does not determine that it is a statutory deadline or that a breach occurred");
  });
});

describe("Legal Hub monitoring controls", () => {
  it("keeps automation updates owner-scoped and interval-bounded", () => {
    expect(functions).toContain("check_interval_hours: z.coerce.number().int().min(1).max(720)");
    expect(functions.match(/\.eq\("user_id", context\.userId\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(functions).toContain('status: z.enum(["active", "paused"])');
  });

  it("shows pause/resume, cadence and manual-check controls in the existing Legal Hub watch UI", () => {
    expect(ui).toContain("Every 6 hours");
    expect(ui).toContain("Every 30 days");
    expect(ui).toContain("Pause");
    expect(ui).toContain("Resume");
    expect(ui).toContain("Check now");
    expect(ui).toContain("not proof that the law itself changed");
  });
});
