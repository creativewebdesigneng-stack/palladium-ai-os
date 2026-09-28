import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const legalScreen=readFileSync(new URL('../../../screens/LegalHub.jsx',import.meta.url),'utf8');
const legalWorld=readFileSync(new URL('../../../components/legal/LegalJurisdictionWorld.jsx',import.meta.url),'utf8');
const industryScreen=readFileSync(new URL('../../../screens/IndustryHub.jsx',import.meta.url),'utf8');
const industryWorld=readFileSync(new URL('../../../components/industry/IndustryCommandWorld.jsx',import.meta.url),'utf8');
const companyScreen=readFileSync(new URL('../../../screens/CompanyHub.jsx',import.meta.url),'utf8');
const companyWorld=readFileSync(new URL('../../../components/company/CompanyOperatingWorld.jsx',import.meta.url),'utf8');
const websiteScreen=readFileSync(new URL('../../../screens/WebsiteStudio.jsx',import.meta.url),'utf8');
const websiteWorld=readFileSync(new URL('../../../components/website-studio/WebsiteStudioWorld.jsx',import.meta.url),'utf8');
const marketplaceScreen=readFileSync(new URL('../../../screens/Marketplace.jsx',import.meta.url),'utf8');
const marketplaceWorld=readFileSync(new URL('../../../components/marketplace/MarketplaceWorld.jsx',import.meta.url),'utf8');

describe('Remaining Blackstar flagship visual worlds',()=>{
  it('keeps Legal grounded in the official-source catalog and advice boundary',()=>{
    expect(legalScreen).toContain('sources={OFFICIAL_LEGAL_SOURCES} topics={LEGAL_TOPICS}');
    expect(legalWorld).toContain('official-source topology');
    expect(legalWorld).toContain('not legal advice');
  });

  it('keeps Industry and Company as layers over existing Blackstar systems',()=>{
    expect(industryScreen).toContain('industries={industries} capabilities={capabilities}');
    expect(industryWorld).toContain('no duplicate execution runtime');
    expect(companyScreen).toContain('departments={departments} lifecycle={lifecycle} systems={systems}');
    expect(companyWorld).toContain('existing AI workforce remains authoritative');
  });

  it('uses saved Website Studio/editor state and does not fabricate deployment status',()=>{
    expect(websiteScreen).toContain('projects={projects} draft={draft} revisions={revisions} busy={busy}');
    expect(websiteWorld).toContain('deployment status is not fabricated');
  });

  it('keeps Marketplace listing truth in the existing live browser',()=>{
    expect(marketplaceScreen).toContain('<MarketplaceWorld />');
    expect(marketplaceScreen).toContain('<ListingBrowser />');
    expect(marketplaceWorld).toContain('listing availability comes from the live browser below');
  });

  it('respects reduced motion across the new worlds',()=>{
    for(const source of [legalWorld,industryWorld,companyWorld,websiteWorld,marketplaceWorld]) expect(source).toContain('useReducedMotion');
  });
});
