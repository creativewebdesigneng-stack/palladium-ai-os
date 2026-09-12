import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assessRegulatoryEvidenceChange,
  fingerprintRegulatoryEvidence,
  restrictToOfficialSourceHost,
} from "./legal-regulatory-watch.functions";

describe("legal regulatory watch evidence semantics", () => {
  it("treats the first check as a baseline, not a regulatory-change claim", () => {
    expect(assessRegulatoryEvidenceChange(null, "fingerprint-a")).toEqual({
      first_check: true,
      changed: false,
      review_required: false,
    });
  });

  it("reports no evidence-set change when the fingerprint is identical", () => {
    expect(assessRegulatoryEvidenceChange("fingerprint-a", "fingerprint-a")).toEqual({
      first_check: false,
      changed: false,
      review_required: false,
    });
  });

  it("treats a changed fingerprint only as a review signal", () => {
    expect(assessRegulatoryEvidenceChange("fingerprint-a", "fingerprint-b")).toEqual({
      first_check: false,
      changed: true,
      review_required: true,
    });
  });

  it("keeps fingerprints stable when search-result order changes", () => {
    const first = [
      { title: "B", url: "https://example.gov/b", snippet: "second" },
      { title: "A", url: "https://example.gov/a", snippet: "first" },
    ];
    expect(fingerprintRegulatoryEvidence(first)).toBe(
      fingerprintRegulatoryEvidence([...first].reverse()),
    );
  });

  it("enforces the optional official-source hostname without accepting lookalikes", () => {
    const sources = [
      { title: "FCA", url: "https://www.fca.org.uk/news", snippet: "" },
      { title: "Handbook", url: "https://handbook.fca.org.uk/rules", snippet: "" },
      { title: "Lookalike", url: "https://fca.org.uk.example.com/fake", snippet: "" },
      { title: "Other", url: "https://example.com/article", snippet: "" },
    ];
    expect(restrictToOfficialSourceHost(sources, "https://www.fca.org.uk/").map((s) => s.title)).toEqual([
      "FCA",
      "Handbook",
    ]);
  });
});

describe("legal regulatory watch ownership migration", () => {
  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260913005000_legal_regulatory_watches.sql", import.meta.url),
    "utf8",
  );

  it("keeps regulatory watches behind authenticated owner-only RLS", () => {
    expect(migration).toContain("alter table public.legal_regulatory_watches enable row level security");
    expect(migration).toContain("revoke all on public.legal_regulatory_watches from anon");
    expect(migration).toContain('create policy "legal_watches_select_own"');
    expect(migration).toContain('create policy "legal_watches_insert_own"');
    expect(migration).toContain('create policy "legal_watches_update_own"');
    expect(migration).toContain('create policy "legal_watches_delete_own"');
    expect(migration.match(/auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
