import {describe,expect,it} from 'vitest';
import {addWebsitePage,ensureWebsiteHomePage,normalizePagePath,normalizeWebsitePageSet,removeWebsitePage,websitePagePathsAreUnique} from './website-pages';

describe('website pages',()=>{
  it('normalizes routes',()=>{
    expect(normalizePagePath(' About Us ')).toBe('/about-us');
    expect(normalizePagePath('/')).toBe('/');
  });
  it('adds unique routes and protects home',()=>{
    const pages=addWebsitePage([{name:'Home',path:'/'}],'About Us');
    expect(pages.map(p=>p.path)).toEqual(['/','/about-us']);
    expect(removeWebsitePage(pages,'/')).toEqual(pages);
  });
  it('restores a missing home route',()=>{
    expect(ensureWebsiteHomePage([{name:'About',path:'/about'}])[0]).toMatchObject({name:'Home',path:'/'});
  });
  it('detects duplicate normalized routes',()=>{
    expect(websitePagePathsAreUnique([{path:'/about'},{path:'about'}])).toBe(false);
    expect(websitePagePathsAreUnique([{path:'/'},{path:'/about'}])).toBe(true);
  });
  it('normalizes and deduplicates AI page sets',()=>{
    const pages=normalizeWebsitePageSet([{name:'About',path:'about'},{name:'Duplicate',path:'/about'}]);
    expect(pages.map(page=>page.path)).toEqual(['/','/about']);
  });
});
