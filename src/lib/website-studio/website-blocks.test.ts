import { describe, expect, it } from 'vitest';
import { appendWebsiteBlock, WEBSITE_BLOCKS } from './website-blocks';

describe('website blocks',()=>{
  it('has reusable starter blocks',()=>{expect(WEBSITE_BLOCKS.length).toBeGreaterThanOrEqual(10)});
  it('includes declarative auth blocks wired to the generated runtime',()=>{
    const signIn=WEBSITE_BLOCKS.find(block=>block.id==='auth-sign-in');
    const social=WEBSITE_BLOCKS.find(block=>block.id==='auth-social');
    expect(signIn?.html).toContain('data-blackstar-auth="sign-in"');
    expect(social?.html).toContain('data-blackstar-auth="magic-link"');
    expect(social?.html).toContain('data-blackstar-auth-provider="google"');
  });
  it('inserts a block before closing main',()=>{
    const html='<main><h1>Hello</h1></main>';
    const out=appendWebsiteBlock(html,'cta');
    expect(out).toContain('Ready to get started?');
    expect(out.indexOf('Ready to get started?')).toBeLessThan(out.indexOf('</main>'));
  });
});
