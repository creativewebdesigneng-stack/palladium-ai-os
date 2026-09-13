import { describe, expect, it } from "vitest";
import {
  LEGAL_HANDOFF_NOTICE,
  buildLegalProfessionalHandoffPacket,
  legalHandoffFilename,
} from "./legal-professional-handoff";

describe("legal professional handoff packet", () => {
  const matter = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Cross-border supplier dispute",
    jurisdiction: "United Kingdom",
    topic: "Contracts & commerce",
    question: "What legal issues should be reviewed before responding?",
    status: "review",
    notes: "Supplier is incorporated abroad; governing-law clause needs verification.",
    updated_at: "2026-09-13T01:00:00.000Z",
  };

  const runs = [
    {
      created_at: "2026-09-13T01:05:00.000Z",
      query: "governing law clause supplier dispute",
      jurisdiction: "United Kingdom",
      topic: "Contracts & commerce",
      provider: "provider",
      model: "model",
      report: "Research output based on supplied live evidence.",
      sources: [
        { title: "Official source", url: "https://www.legislation.gov.uk/example" },
        { title: "Duplicate official source", url: "https://www.legislation.gov.uk/example" },
        { title: "Injected](javascript:alert(1))", url: "https://example.org/safe-evidence" },
        { title: "Unsafe", url: "javascript:alert(1)" },
      ],
    },
  ];

  it("creates a deterministic evidence-first professional review packet", () => {
    const packet = buildLegalProfessionalHandoffPacket({
      matter,
      runs,
      generatedAt: "2026-09-13T02:00:00.000Z",
    });
    expect(packet).toContain("Professional Review Packet");
    expect(packet).toContain("Jurisdiction recorded by user: United Kingdom");
    expect(packet).toContain(matter.question);
    expect(packet).toContain("Professional review checklist");
    expect(packet).toContain("Verify court hierarchy, precedential status");
    expect(packet).toContain("For treaties, separately verify signature, ratification/accession");
    expect(packet).toContain("Questions for qualified professional review");
    expect(packet).toContain("does not certify legal correctness or replace professional advice");
  });

  it("keeps saved research and unique safe evidence links without introducing a new AI conclusion", () => {
    const packet = buildLegalProfessionalHandoffPacket({ matter, runs, generatedAt: new Date("2026-09-13T02:00:00Z") });
    expect(packet).toContain("Research output based on supplied live evidence.");
    expect(packet.match(/https:\/\/www\.legislation\.gov\.uk\/example/g)?.length).toBe(2);
    expect(packet.match(/https:\/\/example\.org\/safe-evidence/g)?.length).toBe(2);
    expect(packet).not.toContain("javascript:alert(1)]");
    expect(packet).not.toContain("](javascript:alert(1))");
    expect(packet).toContain("Injected\\]\\(javascript:alert\\(1\\)\\)");
  });

  it("states the legal-information boundary explicitly", () => {
    expect(LEGAL_HANDOFF_NOTICE).toContain("not legal advice");
    expect(LEGAL_HANDOFF_NOTICE).toContain("not a determination");
    expect(LEGAL_HANDOFF_NOTICE).toContain("qualified lawyer");
    expect(LEGAL_HANDOFF_NOTICE).toContain("case-law treatment");
    expect(LEGAL_HANDOFF_NOTICE).toContain("treaty status and domestic effect");
  });

  it("handles a matter with no saved research without implying evidence exists", () => {
    const packet = buildLegalProfessionalHandoffPacket({ matter, runs: [], generatedAt: "2026-09-13T02:00:00Z" });
    expect(packet).toContain("Saved research history (0)");
    expect(packet).toContain("No evidence-backed research runs are saved to this matter yet.");
    expect(packet).toContain("No valid HTTP(S) evidence links are saved to this matter.");
  });

  it("creates a filesystem-safe markdown filename", () => {
    expect(legalHandoffFilename("Acme / Supplier: Review?"))
      .toBe("acme-supplier-review-professional-review.md");
  });
});
