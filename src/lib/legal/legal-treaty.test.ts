import { describe, expect, it } from "vitest";
import {
  TREATY_SOURCE_PROFILES,
  annotateTreatySources,
  getTreatySourceProfile,
  hostMatchesTreatySource,
} from "./treaty-sources";
import { buildTreatyQueries, TREATY_SYSTEM_INSTRUCTIONS } from "./legal-treaty.functions";

describe("treaty intelligence authority and status controls", () => {
  it("accepts configured official hosts and rejects lookalike domains", () => {
    expect(hostMatchesTreatySource("https://treaties.un.org/Pages/ViewDetails.aspx", ["treaties.un.org"])).toBe(true);
    expect(hostMatchesTreatySource("https://treaties.un.org.example.com/fake", ["treaties.un.org"])).toBe(false);
  });

  it("ranks configured official treaty evidence ahead of discovery-only material", () => {
    const profile = getTreatySourceProfile("International / United Nations");
    expect(profile).not.toBeNull();
    const sources = annotateTreatySources(
      [
        { title: "Blog", url: "https://example.com/treaty", snippet: "commentary" },
        { title: "UN status", url: "https://treaties.un.org/Pages/ViewDetails.aspx", snippet: "status" },
      ],
      profile!,
    );
    expect(sources[0]?.official).toBe(true);
    expect(sources[0]?.title).toBe("UN status");
    expect(sources[1]?.official).toBe(false);
  });

  it("targets official source systems and preserves a party/status focus in searches", () => {
    const profile = getTreatySourceProfile("United Kingdom");
    expect(profile).not.toBeNull();
    const queries = buildTreatyQueries(profile!, "Convention on cybercrime", "United Kingdom", "party-status");
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => query.includes("site:"))).toBe(true);
    expect(queries.join(" ")).toContain("treaties.fcdo.gov.uk");
    expect(queries.join(" ")).toContain("party status");
    expect(queries.join(" ")).toContain("United Kingdom");
  });

  it("does not equate signature, general entry into force, or status records with current domestic binding effect", () => {
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("Signature alone does not establish ratification");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("general entry into force does not by itself prove entry into force for a particular party");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("does not by itself prove domestic enforceability");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("binding treaties from non-binding arrangements");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("withdrawal");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("Status verification");
    expect(TREATY_SYSTEM_INSTRUCTIONS).toContain("Domestic effect and professional review");
  });

  it("keeps source profiles uniquely identified and linked through HTTPS gateways", () => {
    expect(new Set(TREATY_SOURCE_PROFILES.map((profile) => profile.id)).size).toBe(TREATY_SOURCE_PROFILES.length);
    expect(new Set(TREATY_SOURCE_PROFILES.map((profile) => profile.jurisdiction)).size).toBe(TREATY_SOURCE_PROFILES.length);
    for (const profile of TREATY_SOURCE_PROFILES) {
      expect(profile.officialHosts.length).toBeGreaterThan(0);
      expect(profile.statusChecks.length).toBeGreaterThan(4);
      expect(profile.gateways.length).toBeGreaterThan(0);
      expect(profile.gateways.every((gateway) => gateway.url.startsWith("https://"))).toBe(true);
      expect(profile.domesticEffectNote.length).toBeGreaterThan(40);
    }
  });
});
