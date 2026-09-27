import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("heavy operational route loading", () => {
  const retail = readFileSync(new URL("../../routes/_shell/_app/retail-hub.tsx", import.meta.url), "utf8");
  const compliance = readFileSync(new URL("../../routes/_shell/_app/compliance-sentinel.tsx", import.meta.url), "utf8");

  it("lets Retail Hub paint its core screen before secondary workbenches load", () => {
    expect(retail).toContain("import { Suspense, lazy } from 'react'");
    expect(retail).toContain("import RetailHub from '@/screens/RetailHub'");
    expect(retail).toContain("lazy(() => import('@/components/retail/RetailAdvancedOperations'))");
    expect(retail).toContain("lazy(() => import('@/components/retail/RetailStoreOperations'))");
    expect(retail).toContain("lazy(() => import('@/components/retail/RetailExecutionControls'))");
    expect(retail).toContain("lazy(() => import('@/components/retail/RetailCommerceControl'))");
    expect(retail).toContain("lazy(() => import('@/components/retail/RetailServiceAutomationSection'))");
    expect(retail).not.toContain("import RetailAdvancedOperations from");
    expect(retail).not.toContain("import RetailStoreOperations from");
  });

  it("isolates each Retail secondary module behind its own loading boundary", () => {
    expect((retail.match(/<Suspense /g) || []).length).toBe(5);
    expect(retail).toContain('label="service automation"');
    expect(retail).toContain('label="commerce control"');
  });

  it("lets Compliance Sentinel paint its core screen before large review and assurance modules load", () => {
    expect(compliance).toContain("import { Suspense, lazy } from 'react'");
    expect(compliance).toContain("import ComplianceSentinel from '@/screens/ComplianceSentinel'");
    expect(compliance).toContain("lazy(() => import('@/components/compliance/ComplianceChangeReviewQueue'))");
    expect(compliance).toContain("lazy(() => import('@/components/compliance/ComplianceAssuranceWorkbench'))");
    expect(compliance).not.toContain("import ComplianceAssuranceWorkbench from");
    expect(compliance).not.toContain("import ComplianceChangeReviewQueue from");
  });

  it("gives Compliance modules independent loading boundaries", () => {
    expect((compliance.match(/<Suspense /g) || []).length).toBe(2);
    expect(compliance).toContain('label="change review queue"');
    expect(compliance).toContain('label="assurance workbench"');
  });
});
