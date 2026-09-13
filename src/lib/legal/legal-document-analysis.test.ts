import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildDocumentEvidenceWindow,
  buildLegalDocumentPrompt,
  LEGAL_DOCUMENT_MAX_CHARS,
  LEGAL_DOCUMENT_MODES,
  LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS,
  modeInstructions,
} from "./legal-document-analysis.functions";

describe("legal document evidence handling", () => {
  it("marks a short persisted document as complete", () => {
    const result = buildDocumentEvidenceWindow("Clause 1. Payment is due in 30 days.");
    expect(result.complete).toBe(true);
    expect(result.omitted_chars).toBe(0);
    expect(result.evidence).toContain("Payment is due");
  });

  it("preserves both ends of an oversized document and discloses the omitted middle", () => {
    const start = "START-CLAUSE\n" + "a".repeat(25_000);
    const end = "b".repeat(25_000) + "\nEND-SIGNATURE";
    const result = buildDocumentEvidenceWindow(start + end);
    expect(result.complete).toBe(false);
    expect(result.omitted_chars).toBeGreaterThan(0);
    expect(result.evidence).toContain("START-CLAUSE");
    expect(result.evidence).toContain("END-SIGNATURE");
    expect(result.evidence).toContain("BLACKSTAR NOTICE");
    expect(result.evidence.length).toBeGreaterThan(LEGAL_DOCUMENT_MAX_CHARS);
  });

  it("tells the model when the supplied evidence is only an excerpt", () => {
    const prompt = buildLegalDocumentPrompt({
      title: "Test agreement",
      docType: "contract",
      mode: "contract-review",
      jurisdiction: "England and Wales",
      focus: "termination",
      evidence: "sample",
      complete: false,
      omittedChars: 1234,
    });
    expect(prompt).toContain("excerpt only");
    expect(prompt).toContain("1234 characters omitted");
    expect(prompt).toContain("termination");
  });
});

describe("legal document analysis guardrails", () => {
  it("supports the planned document-review modes", () => {
    expect(LEGAL_DOCUMENT_MODES).toEqual([
      "contract-review",
      "clause-map",
      "rights-obligations",
      "risk-ambiguity",
      "plain-language",
    ]);
    for (const mode of LEGAL_DOCUMENT_MODES) expect(modeInstructions(mode).length).toBeGreaterThan(80);
  });

  it("does not turn document text into unsupported legal conclusions", () => {
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("not legal advice");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("Never invent");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("not located");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("not located\" never means the full document lacks the provision");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("Do not declare a clause valid");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("Do not invent statutes");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("Legal research required");
    expect(LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS).toContain("Professional review");
  });

  it("keeps server-side document access owner-scoped and persists results as derived documents", () => {
    const source = readFileSync(new URL("./legal-document-analysis.functions.ts", import.meta.url), "utf8");
    expect(source).toContain('.from("user_documents")');
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('origin_document_id: original.id');
    expect(source).toContain('source: "ai_legal_analysis"');
    expect(source).toContain('metric: "document_transform"');
    expect(source).toContain("assertTaskAllowance(sb, context.userId)");
    expect(source).toContain("writeAudit({");
  });
});
