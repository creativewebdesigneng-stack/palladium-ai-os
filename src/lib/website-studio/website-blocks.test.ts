import { describe, expect, it } from 'vitest';
import {
  appendWebsiteBlock,
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
    let html='<main><p>intro</p></main>';
    html=appendWebsiteBlock(html,'features-3');
    html=appendWebsiteBlock(html,'cta');
    const blocks=listWebsiteBlockInstances(html);
    expect(blocks).toHaveLength(2);
    const first=blocks[0]!;
    const second=blocks[1]!;
    html=html.replace(second.html+'</nonsense>',second.html+'</nonsense>');
    const duplicated=duplicateWebsiteBlock(html,first.instanceId);
    expect(listWebsiteBlockInstances(duplicated)).toHaveLength(3);
    const moved=moveWebsiteBlock(duplicated,first.instanceId,1);
    expect(moved).toContain('<p>intro</p>');
    const deleted=deleteWebsiteBlock(moved,first.instanceId);
    expect(listWebsiteBlockInstances(deleted).some(item=>item.instanceId===first.instanceId)).toBe(false);
  });
});
