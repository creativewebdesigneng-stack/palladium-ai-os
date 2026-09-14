import {describe,expect,it} from 'vitest';import {applyWebsiteSectionContract,moveWebsiteSection,normalizeSections,reorderWebsiteSections,updateWebsiteSection,websiteSectionContractCss} from './website-sections';
describe('website sections',()=>{it('normalizes string sections',()=>{expect(normalizeSections(['Hero'])[0]).toMatchObject({type:'hero',label:'Hero'})});it('reorders sections',()=>{const s=normalizeSections(['Hero','CTA']);expect(moveWebsiteSection(s,1,-1).map(x=>x.label)).toEqual(['CTA','Hero'])});it('supports arbitrary drag reorder',()=>{const s=normalizeSections(['Hero','Features','CTA']);expect(reorderWebsiteSections(s,0,2).map(x=>x.label)).toEqual(['Features','CTA','Hero'])});});

describe('website visual section contracts',()=>{
  it('normalizes visual defaults',()=>{expect(normalizeSections(['Hero'])[0]).toMatchObject({type:'hero',theme:'inherit',width:'contained',padding:'normal',hidden:false})});
  it('updates and compiles visual metadata',()=>{const base=normalizeSections(['Hero','CTA']);const updated=updateWebsiteSection(base,base[0]!.id,{theme:'accent'});const html=applyWebsiteSectionContract('<main><section class="hero"></section><section></section></main>',updated);expect(html).toContain('data-ws-theme="accent"');expect(websiteSectionContractCss()).toContain('[data-ws-width="wide"]')});
});
