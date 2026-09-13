import { describe, expect, it } from "vitest";
import {
  getVerifiedLegalResearchHosts,
  isOfficialLegalUrl,
  isVerifiedJurisdictionLegalSource,
  rankLegalSources,
} from "./legal-research.functions";

describe("legal source ranking", () => {
  it("puts official/primary-looking sources before commentary", () => {
    const input = [
      { title: "Commentary", url: "https://example.com/article", snippet: "" },
      { title: "UK law", url: "https://www.legislation.gov.uk/ukpga/2018/12", snippet: "" },
      { title: "EU law", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/", snippet: "" },
    ] as any;
    const ranked = rankLegalSources(input);
    expect(ranked.at(0)?.url).toContain("legislation.gov.uk");
    expect(ranked.at(-1)?.url).toContain("example.com");
  });

  it("recognises expanded official legal portals", () => {
    for (const url of [
      "https://www.indiacode.nic.in/",
      "https://www.sci.gov.in/",
      "https://sso.agc.gov.sg/",
      "https://www.judiciary.gov.sg/judgments",
      "https://www.legifrance.gouv.fr/",
      "https://www.recht.bund.de/",
      "https://www.boe.es/",
      "https://www.normattiva.it/",
      "https://new.kenyalaw.org/",
      "https://judiciary.go.ke/",
      "https://elaws.e-gov.go.jp/",
      "https://www.courts.go.jp/english/Judgments/",
      "https://law.go.kr/eng/engMain.do",
      "https://www.scourt.go.kr/eng/",
      "https://uaelegislation.gov.ae/en",
      "https://laws.boe.gov.sa/",
      "https://www.gov.za/documents-categories/acts",
      "https://www.parliament.gov.za/acts",
    ]) {
      expect(isOfficialLegalUrl(url)).toBe(true);
    }
  });

  it("uses hostname boundaries instead of substring trust", () => {
    expect(isOfficialLegalUrl("https://legislation.gov.uk.attacker.example/path")).toBe(false);
    expect(isOfficialLegalUrl("https://example.com/?next=https://www.indiacode.nic.in/")).toBe(false);
    expect(isOfficialLegalUrl("not-a-url gov.uk")).toBe(false);
  });

  it("prioritises the selected jurisdiction's verified official hosts above a generic official-looking source", () => {
    const input = [
      { title: "Generic government result", url: "https://courts.example.gov/article", snippet: "" },
      { title: "France primary source", url: "https://www.legifrance.gouv.fr/codes", snippet: "" },
    ] as any;
    expect(rankLegalSources(input, "France").at(0)?.url).toContain("legifrance.gouv.fr");
  });

  it("reuses the case-law registry when ranking general research", () => {
    const input = [
      { title: "Generic government result", url: "https://courts.example.gov/article", snippet: "" },
      {
        title: "Spain judicial source",
        url: "https://www.poderjudicial.es/cgpj/es/Servicios/Jurisprudencia/Buscador-de-Jurisprudencia",
        snippet: "",
      },
    ] as any;
    expect(rankLegalSources(input, "Spain").at(0)?.url).toContain("poderjudicial.es");
    expect(
      isVerifiedJurisdictionLegalSource("https://www.poderjudicial.es/cgpj/es/Servicios/Jurisprudencia/", "Spain"),
    ).toBe(true);
    expect(
      isVerifiedJurisdictionLegalSource("https://poderjudicial.es.evil.example/", "Spain"),
    ).toBe(false);
  });

  it("reuses the treaty registry when ranking general research", () => {
    const input = [
      { title: "Generic government result", url: "https://courts.example.gov/article", snippet: "" },
      {
        title: "Mexico foreign-ministry treaty library",
        url: "https://cja.sre.gob.mx/tratadosmexico/buscador",
        snippet: "",
      },
    ] as any;
    expect(rankLegalSources(input, "Mexico").at(0)?.url).toContain("cja.sre.gob.mx");
    expect(
      isVerifiedJurisdictionLegalSource("https://cja.sre.gob.mx/tratadosmexico/buscador", "Mexico"),
    ).toBe(true);
  });

  it("feeds all verified registry hosts into the live-research source hints without duplicates", () => {
    const spain = getVerifiedLegalResearchHosts("Spain");
    expect(spain).toContain("boe.es");
    expect(spain).toContain("poderjudicial.es");
    expect(new Set(spain).size).toBe(spain.length);

    const mexico = getVerifiedLegalResearchHosts("Mexico");
    expect(mexico).toContain("cja.sre.gob.mx");
  });

  it("does not trust a jurisdiction-host lookalike", () => {
    const input = [
      { title: "Lookalike", url: "https://legifrance.gouv.fr.evil.example/page", snippet: "" },
      { title: "Official", url: "https://www.legifrance.gouv.fr/", snippet: "" },
    ] as any;
    expect(rankLegalSources(input, "France").at(0)?.url).toBe("https://www.legifrance.gouv.fr/");
  });

  it("does not discard non-official sources", () => {
    const input = [{ title: "A", url: "https://example.com/a", snippet: "" }] as any;
    expect(rankLegalSources(input, "France")).toHaveLength(1);
  });
});
