import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LEGAL_EVIDENCE_STATUSES,
  LEGAL_RIGHTS_KINDS,
  LEGAL_RIGHTS_STATUSES,
  LEGAL_RIGHTS_WORKFLOW_NOTICE,
} from "./legal-rights-obligations.functions";

describe("legal rights and obligations workflow semantics", () => {
  it("supports distinct legal working-record kinds and lifecycle states", () => {
    expect(LEGAL_RIGHTS_KINDS).toEqual([
      "right",
      "obligation",
      "prohibition",
      "permission",
      "deadline",
      "remedy",
    ]);
    expect(LEGAL_RIGHTS_STATUSES).toContain("review");
    expect(LEGAL_RIGHTS_STATUSES).toContain("disputed");
    expect(LEGAL_EVIDENCE_STATUSES).toEqual([
      "unverified",
      "source_identified",
      "source_checked",
      "professional_reviewed",
    ]);
  });

  it("does not present a saved working record as a legal applicability conclusion", () => {
    expect(LEGAL_RIGHTS_WORKFLOW_NOTICE).toContain("user-governed working records");
    expect(LEGAL_RIGHTS_WORKFLOW_NOTICE).toContain("does not mean Blackstar has determined");
    expect(LEGAL_RIGHTS_WORKFLOW_NOTICE).toContain("legally applies");
    expect(LEGAL_RIGHTS_WORKFLOW_NOTICE).toContain("authoritative source");
    expect(LEGAL_RIGHTS_WORKFLOW_NOTICE).toContain("current legal status");
  });
});

describe("legal rights and obligations security", () => {
  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260913012500_legal_rights_obligations.sql", import.meta.url),
    "utf8",
  );
  const rightsSource = readFileSync(new URL("./legal-rights-obligations.functions.ts", import.meta.url), "utf8");
  const complianceSource = readFileSync(new URL("./legal-compliance.functions.ts", import.meta.url), "utf8");

  it("keeps rights and obligations behind authenticated owner-only RLS", () => {
    expect(migration).toContain("alter table public.legal_rights_obligations enable row level security");
    expect(migration).toContain("revoke all on public.legal_rights_obligations from anon");
    expect(migration).toContain('create policy "legal_rights_select_own"');
    expect(migration).toContain('create policy "legal_rights_insert_own"');
    expect(migration).toContain('create policy "legal_rights_update_own"');
    expect(migration).toContain('create policy "legal_rights_delete_own"');
    expect(migration).toContain("legal_rights_user_status_due_idx");
    expect(migration.match(/auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("adds explicit owner scoping to rights workflow reads, updates and deletes", () => {
    expect(rightsSource.match(/\.eq\("user_id", context\.userId\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(rightsSource).toContain("user_id: context.userId");
  });

  it("hardens the older compliance register with the same server-side owner scope", () => {
    expect(complianceSource.match(/\.eq\("user_id",context\.userId\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(complianceSource).toContain("user_id:context.userId");
  });
});
