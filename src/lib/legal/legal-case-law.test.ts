import { describe, expect, it } from "vitest";
import {
  CASE_LAW_SOURCES,
  annotateCaseLawSources,
  getCaseLawProfile,
  hostMatchesCaseLawSource,
} from "./case-law-sources";
import { buildCaseLawQueries, CASE_LAW_SYSTEM_INSTRUCTIONS } from "./legal-case-law.functions";

describe("case-law source authority controls", () => {
  it("recognises exact official hosts and their subdomains without accepting lookalikes", () => {
    expect(
      hostMatchesCaseLawSource("https://caselaw.nationalarchives.gov.uk/uksc/2026/1", [
        "caselaw.nationalarchives.gov.uk",
      ]),
    ).toBe(true);
    expect(
      hostMatchesCaseLawSource("https://fake.caselaw.nationalarchives.gov.uk.example.com/case", [
        "caselaw.nationalarchives.gov.uk",
      ]),
    ).toBe(false);
    expect(hostMatchesCaseLawSource("https://www2.scjn.gob.mx/case", ["scjn.gob.mx"])).toBe(true);
    expect(hostMatchesCaseLawSource("https://scjn.gob.mx.example.org/case", ["scjn.gob.mx"])).toBe(false);
  });

  it("ranks official judicial evidence before discovery-only sources", () => {
    const profile = getCaseLawProfile("United Kingdom");
    expect(profile).not.toBeNull();
    const sources = annotateCaseLawSources(
      [
        { title: "Commentary", url: "https://example.com/case", snippet: "secondary" },
        {
          title: "Judgment",
          url: "https://caselaw.nationalarchives.gov.uk/uksc/2026/1",
          snippet: "official",
        },
      ],
      profile!,
    );
    expect(sources[0]?.official).toBe(true);
    expect(sources[0]?.title).toBe("Judgment");
    expect(sources[1]?.official).toBe(false);
  });

  it("targets configured official hosts in live research queries", () => {
    const profile = getCaseLawProfile("United States");
    expect(profile).not.toBeNull();
    const queries = buildCaseLawQueries(profile!, "search and seizure", "410 U.S. 113", "U.S. Supreme Court");
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((query) => query.includes("site:"))).toBe(true);
    expect(queries.join(" ")).toContain("supremecourt.gov");
    expect(queries.join(" ")).toContain('"410 U.S. 113"');
  });

  it("expands court-source intelligence across major legal systems without pretending universal coverage", () => {
    const expected = [
      "Ireland",
      "France",
      "Germany",
      "India",
      "Singapore",
      "Hong Kong SAR",
      "Japan",
      "South Korea",
      "South Africa",
      "Brazil",
      "Mexico",
      "United Arab Emirates",
    ];
    expect(CASE_LAW_SOURCES.length).toBeGreaterThanOrEqual(19);
    for (const jurisdiction of expected) expect(getCaseLawProfile(jurisdiction)).not.toBeNull();
    expect(getCaseLawProfile("Switzerland")).toBeNull();
  });

  it("preserves language, court-scope and federal/local boundaries for new profiles", () => {
    expect(getCaseLawProfile("Germany")?.coverageNote).toContain("authoritative German decision");
    expect(getCaseLawProfile("Japan")?.coverageNote).toContain("explicitly unofficial");
    expect(getCaseLawProfile("United Arab Emirates")?.coverageNote).toContain("DIFC/ADGM");
    expect(getCaseLawProfile("France")?.coverageNote).toContain("Administrative-law questions");
    expect(getCaseLawProfile("Brazil")?.coverageNote).toContain("other superior courts");
    expect(getCaseLawProfile("Mexico")?.coverageNote).toContain("binding status");
  });

  it("keeps the model from upgrading search evidence into unverified binding authority", () => {
    expect(CASE_LAW_SYSTEM_INSTRUCTIONS).toContain("Never invent a case name");
    expect(CASE_LAW_SYSTEM_INSTRUCTIONS).toContain("not by itself proof that a decision is binding");
    expect(CASE_LAW_SYSTEM_INSTRUCTIONS).toContain("later appellate history");
    expect(CASE_LAW_SYSTEM_INSTRUCTIONS).toContain("Never infer precedential value");
    expect(CASE_LAW_SYSTEM_INSTRUCTIONS).toContain("Treatment and currentness checks");
  });

  it("keeps every configured gateway on HTTPS and every jurisdiction uniquely identified", () => {
    expect(new Set(CASE_LAW_SOURCES.map((profile) => profile.id)).size).toBe(CASE_LAW_SOURCES.length);
    expect(new Set(CASE_LAW_SOURCES.map((profile) => profile.jurisdiction)).size).toBe(CASE_LAW_SOURCES.length);
    for (const profile of CASE_LAW_SOURCES) {
      expect(profile.officialHosts.length).toBeGreaterThan(0);
      expect(profile.gateways.length).toBeGreaterThan(0);
      expect(profile.gateways.every((gateway) => gateway.url.startsWith("https://"))).toBe(true);
      expect(profile.coverageNote.length).toBeGreaterThan(40);
    }
  });
});
