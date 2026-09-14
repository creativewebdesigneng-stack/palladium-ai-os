import {describe,expect,it} from 'vitest';
import {buildWebsiteProjectManifest,websiteManifestTree} from './website-project';

describe('website project manifest',()=>{
  it('packages the core site into deterministic files',()=>{
    const m=buildWebsiteProjectManifest({name:'Acme',slug:'acme',framework:'html',html:'<main/>',css:'body{}',javascript:'',pages:[],designTokens:{theme:'dark'},brief:{goal:'sell'}});
    expect(m.files.find(f=>f.path==='index.html')?.content).toBe('<main/>');
    expect(websiteManifestTree(m)).toContain('site/design-tokens.json');
  });

  it('emits real files for non-home routes',()=>{
    const m=buildWebsiteProjectManifest({
      name:'Acme',
      slug:'acme',
      framework:'html',
      html:'<html><body>Home</body></html>',
      css:'body{}',
      javascript:'',
      pages:[
        {name:'Home',path:'/'},
        {name:'About',path:'/about',html:'<html><body>About page</body></html>'},
        {name:'Contact',path:'/contact'},
      ],
      designTokens:{},
      brief:{},
    });
    expect(m.files.find(f=>f.path==='about/index.html')?.content).toContain('About page');
    expect(m.files.find(f=>f.path==='contact/index.html')?.content).toContain('<h1>Contact</h1>');
  });
});
