import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913014000_legal_table_privilege_hardening.sql", import.meta.url),
  "utf8",
);

const crudTables = [
  "legal_compliance_obligations",
  "legal_regulatory_watches",
  "legal_research_matters",
  "legal_rights_obligations",
];

describe("Legal Hub least-privilege table grants", () => {
  it("revokes inherited privileges from anon and authenticated before granting the intended API surface", () => {
    for (const table of crudTables) {
      expect(migration).toContain(`revoke all on table public.${table} from anon, authenticated`);
      expect(migration).toContain(
        `grant select, insert, update, delete on table public.${table} to authenticated`,
      );
    }
  });

  it("keeps immutable research runs without UPDATE or TRUNCATE capability", () => {
    expect(migration).toContain(
      "revoke all on table public.legal_research_runs from anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, delete on table public.legal_research_runs to authenticated",
    );
    expect(migration).not.toContain(
      "grant select, insert, update, delete on table public.legal_research_runs",
    );
  });

  it("never grants TRUNCATE, TRIGGER, REFERENCES or ALL back to authenticated users", () => {
    expect(migration.toLowerCase()).not.toMatch(/grant\s+(truncate|trigger|references|all)\b/);
  });
});
