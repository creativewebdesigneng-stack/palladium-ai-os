import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const routesDir=fileURLToPath(new URL('../../routes/',import.meta.url));
const screensDir=fileURLToPath(new URL('../../screens/',import.meta.url));
const siteDir=fileURLToPath(new URL('../../components/site/',import.meta.url));

function uiSources(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
    const path=join(dir,entry.name);
    if(entry.isDirectory())return uiSources(path);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name)?[path]:[];
  });
}

describe('Blackstar route metadata branding',()=>{
  it('does not expose the retired PalladiumAI product name in route metadata or copy',()=>{
    const hits=uiSources(routesDir)
      .filter((path)=>readFileSync(path,'utf8').includes('PalladiumAI'))
      .map((path)=>path.replace(routesDir,''));
    expect(hits).toEqual([]);
  });

  it('does not expose the retired product name in public or app screens',()=>{
    const hits=[...uiSources(screensDir),...uiSources(siteDir)]
      .filter((path)=>readFileSync(path,'utf8').includes('PalladiumAI'))
      .map((path)=>path.replace(fileURLToPath(new URL('../../',import.meta.url)),'/'));
    expect(hits).toEqual([]);
  });

  it('brands the primary auth and dashboard metadata as Blackstar',()=>{
    for(const path of [
      '_shell/_app/dashboard.tsx',
      'login.tsx',
      'register.tsx',
      'forgot-password.tsx',
      'reset-password.tsx',
    ]){
      const source=readFileSync(join(routesDir,path),'utf8');
      expect(source).toContain('Blackstar');
      expect(source).not.toContain('PalladiumAI');
    }
  });
});
