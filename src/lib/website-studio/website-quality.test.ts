import { describe,expect,it } from 'vitest';
import { assessWebsiteQuality } from './website-quality';

describe('assessWebsiteQuality',()=>{
  it('scores a well-structured responsive document',()=>{
    const html='<html lang="en"><head><title>Example Site</title><meta name="viewport" content="width=device-width"></head><body><main><h1>Hello</h1><img src="x" alt=""><button>Go</button></main></body></html>';
    const css='button:focus-visible{outline:2px solid} @media(max-width:600px){} @media(prefers-reduced-motion:reduce){}';
    expect(assessWebsiteQuality(html,css).score).toBe(100);
  });
  it('flags unnamed images and missing structure',()=>{
    const result=assessWebsiteQuality('<html><body><img src="x"><button></button></body></html>','');
    expect(result.score).toBeLessThan(50);
    expect(result.checks.find(x=>x.id==='alt')?.ok).toBe(false);
  });
});
