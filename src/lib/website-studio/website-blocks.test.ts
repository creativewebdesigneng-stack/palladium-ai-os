import { describe, expect, it } from 'vitest';
import { appendWebsiteBlock, WEBSITE_BLOCKS } from './website-blocks';

describe('website blocks',()=>{
  it('has reusable starter blocks',()=>{expect(WEBSITE_BLOCKS.length).toBeGreaterThanOrEqual(6)});
  it('inserts a block before closing main',()=>{
    const html='<main><h1>Hello</h1></main>';
    const out=appendWebsiteBlock(html,'cta');
    expect(out).toContain('Ready to get started?');
    expect(out.indexOf('Ready to get started?')).toBeLessThan(out.indexOf('</main>'));
  });
});
