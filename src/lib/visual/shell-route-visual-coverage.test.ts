import {describe,expect,it} from 'vitest';
import {readdirSync} from 'node:fs';
import {blackstarHasExplicitVisualStyleForPath} from '../../components/blackstar/visualRooms';

const appRoutesDir=new URL('../../routes/_shell/_app/',import.meta.url);

function routeRootFromFile(name:string){
  return `/${name.replace(/\.tsx$/,'').split('.')[0]}`;
}

describe('Blackstar authenticated route visual coverage',()=>{
  it('assigns every authenticated app route root an explicit visual style',()=>{
    const routes=[...new Set(
      readdirSync(appRoutesDir,{withFileTypes:true})
        .filter((entry)=>entry.isFile() && entry.name.endsWith('.tsx'))
        .map((entry)=>routeRootFromFile(entry.name)),
    )];

    const uncovered=routes
      .filter((route)=>!blackstarHasExplicitVisualStyleForPath(route))
      .sort();

    expect(uncovered).toEqual([]);
  });
});
