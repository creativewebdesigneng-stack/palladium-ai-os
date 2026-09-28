import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const routesDir=fileURLToPath(new URL('../../routes/',import.meta.url));

function routeSources(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
    const path=join(dir,entry.name);
    if(entry.isDirectory())return routeSources(path);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name)?[path]:[];
  });
}

describe('Blackstar route metadata branding',()=>{
  it('does not expose the retired PalladiumAI product name in route metadata or copy',()=>{
    const hits=routeSources(routesDir)
      .filter((path)=>readFileSync(path,'utf8').includes('PalladiumAI'))
      .map((path)=>path.replace(routesDir,''));
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
