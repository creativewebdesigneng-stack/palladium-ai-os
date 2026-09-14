import { describe, expect, it } from 'vitest';
import { createWebsiteSeed, slugifyWebsiteName } from './website-seed';

describe('website seed',()=>{
  it('creates stable slugs',()=>{expect(slugifyWebsiteName('My Great Site!')).toBe('my-great-site')});
  it('creates a three-page starter and responsive HTML shell',()=>{
    const seed=createWebsiteSeed('Acme Studio','A premium design company');
    expect(seed.slug).toBe('acme-studio');
    expect(seed.pages).toHaveLength(3);
    expect(seed.html).toContain('Acme Studio');
    expect(seed.css).toContain('@media');
    expect(seed.javascript).toContain('scrollIntoView');
  });
});
