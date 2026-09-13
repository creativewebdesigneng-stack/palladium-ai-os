import{describe,expect,it}from"vitest";
import{JURISDICTIONS}from"./jurisdictions";
import{OFFICIAL_LEGAL_SOURCES}from"./global-legal-sources";

const expandedIds=["ie","fr","de","ch","mx","br","za","in","sg","hk","jp","kr","ae"];

describe("global legal jurisdiction coverage",()=>{
  it("keeps jurisdiction ids and source URLs unique",()=>{
    expect(new Set(JURISDICTIONS.map(item=>item.id)).size).toBe(JURISDICTIONS.length);
    expect(new Set(OFFICIAL_LEGAL_SOURCES.map(item=>item.url)).size).toBe(OFFICIAL_LEGAL_SOURCES.length);
  });

  it("covers the expanded major-jurisdiction set",()=>{
    expect(JURISDICTIONS.length).toBeGreaterThanOrEqual(21);
    for(const id of expandedIds)expect(JURISDICTIONS.some(item=>item.id===id)).toBe(true);
  });

  it("uses HTTPS primary research starting points",()=>{
    for(const jurisdiction of JURISDICTIONS){
      expect(jurisdiction.primary.length).toBeGreaterThan(0);
      for(const url of jurisdiction.primary)expect(url.startsWith("https://")).toBe(true);
    }
    for(const source of OFFICIAL_LEGAL_SOURCES)expect(source.url.startsWith("https://")).toBe(true);
  });

  it("preserves source-status cautions where legal effect could be misunderstood",()=>{
    const japan=JURISDICTIONS.find(item=>item.id==="jp");
    const hongKong=JURISDICTIONS.find(item=>item.id==="hk");
    const mexico=JURISDICTIONS.find(item=>item.id==="mx");
    expect(japan?.notes).toMatch(/reference materials only/i);
    expect(japan?.notes).toMatch(/original Japanese text has legal effect/i);
    expect(hongKong?.notes).toMatch(/verified PDF copies with legal status/i);
    expect(mexico?.notes).toMatch(/Diario Oficial de la Federación/i);
    expect(mexico?.notes).toMatch(/informational/i);
  });

  it("does not imply that a source catalog proves legal applicability",()=>{
    for(const jurisdiction of JURISDICTIONS)expect(jurisdiction.notes.length).toBeGreaterThan(20);
  });
});
