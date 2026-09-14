import { describe, expect, it } from 'vitest';
import {
  appendWebsiteBlock,
  createWebsiteBlockMarkup,
  deleteWebsiteBlock,
  duplicateWebsiteBlock,
  listWebsiteBlockInstances,
  moveWebsiteBlock,
  WEBSITE_BLOCKS,
} from './website-blocks';

describe('website blocks',()=>{
  it('has reusable starter blocks',()=>{expect(WEBSITE_BLOCKS.length).toBeGreaterThanOrEqual(6)});
  it('inserts a marked block before closing main',()=>{
    const html='<main><h1>Hello</h1></main>';
    const out=appendWebsiteBlock(html,'cta');
    expect(out).toContain('Ready to get started?');
    expect(out).toContain('BLACKSTAR_BLOCK_START');
    expect(out.indexOf('Ready to get started?')).toBeLessThan(out.indexOf('</main>'));
  });
  it('lists, duplicates, moves and deletes managed blocks while preserving custom html',()=>{
    const firstMarkup=createWebsiteBlockMarkup('features-3','features-one');
    const secondMarkup=createWebsiteBlockMarkup('cta','cta-one');
    const html=`<main>${firstMarkup}\n<p id="custom">hand-written content</p>\n${secondMarkup}</main>`;
    const blocks=listWebsiteBlockInstances(html);
    expect(blocks.map(block=>block.instanceId)).toEqual(['features-one','cta-one']);

    const duplicated=duplicateWebsiteBlock(html,'features-one');
    expect(listWebsiteBlockInstances(duplicated)).toHaveLength(3);
    expect(duplicated).toContain('hand-written content');

    const moved=moveWebsiteBlock(html,'features-one',1);
    expect(moved.indexOf('cta-one')).toBeLessThan(moved.indexOf('features-one'));
    expect(moved).toContain('<p id="custom">hand-written content</p>');

    const deleted=deleteWebsiteBlock(moved,'features-one');
    expect(listWebsiteBlockInstances(deleted).some(item=>item.instanceId==='features-one')).toBe(false);
    expect(deleted).toContain('hand-written content');
  });
});
