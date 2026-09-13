import{describe,expect,it}from"vitest";
import{JURISDICTIONS,JURISDICTION_COVERAGE_TIERS,getJurisdictionProfile,hostMatchesJurisdictionSource}from"./jurisdictions";
import{OFFICIAL_LEGAL_SOURCES}from"./global-legal-sources";

const expandedIds=["ie","fr","de","es","it","ch","mx","br","za","ke","in","sg","hk","jp","kr","ae","sa"];
const expandedNames=["Ireland","France","Germany","Spain","Italy","Switzerland","Mexico","Brazil","South Africa","Kenya","India","Singapore","Hong Kong SAR","Japan","South Korea","United Arab Emirates","Saudi Arabia"];

describe("global legal jurisdiction coverage",()=>{
  it("keeps jurisdiction ids and source URLs unique",()=>{
    expect(new Set(JURISDICTIONS.map(item=>item.id)).size).toBe(JURISDICTIONS.length);
    expect(new Set(OFFICIAL_LEGAL_SOURCES.map(item=>item.url)).size).toBe(OFFICIAL_LEGAL_SOURCES.length);
  });

  it("covers the expanded global jurisdiction set",()=>{
    expect(JURISDICTIONS.length).toBeGreaterThanOrEqual(25);
    for(const id of expandedIds)expect(JURISDICTIONS.some(item=>item.id===id)).toBe(true);
    for(const name of expandedNames)expect(OFFICIAL_LEGAL_SOURCES.some(item=>item.region===name)).toBe(true);
  });

  it("uses valid coverage metadata without implying completeness",()=>{
    for(const jurisdiction of JURISDICTIONS){
      expect(JURISDICTION_COVERAGE_TIERS[jurisdiction.coverageTier]).toBeDefined();
      expect(jurisdiction.region.length).toBeGreaterThan(1);
      expect(jurisdiction.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(JURISDICTION_COVERAGE_TIERS.research_ready.description.toLowerCase()).toContain("subject to currentness");
    const text=JSON.stringify({JURISDICTIONS,JURISDICTION_COVERAGE_TIERS}).toLowerCase();
    expect(text).not.toMatch(/every law is encoded|all laws are encoded|complete legal coverage|comprehensive legal coverage/);
  });

  it("uses HTTPS primary research starting points mapped to explicit trusted hosts",()=>{
    for(const jurisdiction of JURISDICTIONS){
      expect(jurisdiction.primary.length).toBeGreaterThan(0);
      expect(jurisdiction.officialHosts.length).toBeGreaterThan(0);
      for(const host of jurisdiction.officialHosts){expect(host).not.toContain("://");expect(host).not.toContain("*");}
      for(const url of jurisdiction.primary){expect(url.startsWith("https://")).toBe(true);expect(hostMatchesJurisdictionSource(url,jurisdiction.id)).toBe(true);}
    }
    for(const source of OFFICIAL_LEGAL_SOURCES)expect(source.url.startsWith("https://")).toBe(true);
  });

  it("rejects trusted-host lookalikes",()=>{
    expect(hostMatchesJurisdictionSource("https://legifrance.gouv.fr.evil.example/path","France")).toBe(false);
    expect(hostMatchesJurisdictionSource("https://law.go.kr.evil.example/","South Korea")).toBe(false);
    expect(hostMatchesJurisdictionSource("https://new.kenyalaw.org.evil.example/","Kenya")).toBe(false);
  });

  it("requires multiple verified entry points before research-ready status",()=>{
    for(const jurisdiction of JURISDICTIONS.filter(item=>item.coverageTier==="research_ready"))expect(jurisdiction.primary.length).toBeGreaterThanOrEqual(2);
  });

  it("preserves source-status cautions where legal effect could be misunderstood",()=>{
    const ireland=getJurisdictionProfile("ie");
    const japan=getJurisdictionProfile("jp");
    const hongKong=getJurisdictionProfile("hk");
    const mexico=getJurisdictionProfile("mx");
    const spain=getJurisdictionProfile("es");
    expect(ireland?.notes).toMatch(/official versions remain the printed versions/i);
    expect(japan?.notes).toMatch(/reference materials only/i);
    expect(japan?.notes).toMatch(/original Japanese text has legal effect/i);
    expect(hongKong?.notes).toMatch(/verified PDF copies with legal status/i);
    expect(mexico?.notes).toMatch(/Diario Oficial de la Federación/i);
    expect(mexico?.notes).toMatch(/informational/i);
    expect(spain?.notes).toMatch(/informational rather than the official promulgated text/i);
  });

  it("does not imply that a source catalog proves legal applicability",()=>{
    for(const jurisdiction of JURISDICTIONS)expect(jurisdiction.notes.length).toBeGreaterThan(20);
  });
});
