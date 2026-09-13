import { describe, expect, it } from "vitest";
import { OFFICIAL_LEGAL_SOURCES } from "./global-legal-sources";
import {
  JURISDICTIONS,
  JURISDICTION_COVERAGE_TIERS,
  getJurisdictionProfile,
  hostMatchesJurisdictionSource,
} from "./jurisdictions";

const EXPANDED_JURISDICTIONS = [
  "France",
  "Germany",
  "Ireland",
  "Spain",
  "Italy",
  "Switzerland",
  "Singapore",
  "Japan",
  "South Korea",
  "India",
  "Hong Kong",
  "Brazil",
  "Mexico",
  "South Africa",
  "Kenya",
  "United Arab Emirates",
  "Saudi Arabia",
];

describe("global legal jurisdiction registry", () => {
  it("uses unique stable jurisdiction codes and known coverage tiers", () => {
    expect(JURISDICTIONS.length).toBeGreaterThanOrEqual(25);
    const ids = JURISDICTIONS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of JURISDICTIONS) {
      expect(JURISDICTION_COVERAGE_TIERS[item.coverageTier]).toBeDefined();
      expect(item.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.region.length).toBeGreaterThan(1);
    }
  });

  it("maps every primary URL to an explicitly trusted official host", () => {
    for (const item of JURISDICTIONS) {
      expect(item.primary.length).toBeGreaterThan(0);
      expect(item.officialHosts.length).toBeGreaterThan(0);

      for (const host of item.officialHosts) {
        expect(host).not.toContain("://");
        expect(host).not.toContain("*");
      }

      for (const url of item.primary) {
        expect(url).toMatch(/^https:\/\//);
        expect(hostMatchesJurisdictionSource(url, item.id)).toBe(true);
      }
    }
  });

  it("rejects official-host lookalikes", () => {
    expect(hostMatchesJurisdictionSource("https://legifrance.gouv.fr.evil.example/law", "France")).toBe(false);
    expect(hostMatchesJurisdictionSource("https://law.go.kr.evil.example/", "South Korea")).toBe(false);
    expect(hostMatchesJurisdictionSource("https://sso.agc.gov.sg.evil.example/", "Singapore")).toBe(false);
  });

  it("requires multiple official entry points before research-ready status", () => {
    for (const item of JURISDICTIONS.filter((profile) => profile.coverageTier === "research_ready")) {
      expect(item.primary.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("adds the verified Phase 12 official-source expansion to the shared source catalogue", () => {
    for (const jurisdiction of EXPANDED_JURISDICTIONS) {
      const profile = getJurisdictionProfile(jurisdiction);
      expect(profile).not.toBeNull();
      expect(OFFICIAL_LEGAL_SOURCES.some((source) => source.region === jurisdiction)).toBe(true);
    }

    const urls = OFFICIAL_LEGAL_SOURCES.map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not represent registry depth as complete legal coverage", () => {
    const text = JSON.stringify({ JURISDICTIONS, JURISDICTION_COVERAGE_TIERS }).toLowerCase();
    expect(text).not.toMatch(/complete legal coverage|every law is encoded|all laws are encoded|comprehensive legal coverage/);
    expect(JURISDICTION_COVERAGE_TIERS.research_ready.description.toLowerCase()).toContain("subject to currentness");
  });
});
