export type WebsitePage={name:string;path:string;title?:string;description?:string;sections?:string[];status?:'draft'|'ready'};
export function normalizePagePath(value:string):string{
  const raw=String(value||'').trim().toLowerCase();
  if(!raw||raw==='/')return '/';
  const cleaned=raw.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9/_-]+/g,'-').replace(/-+/g,'-');
  return '/'+cleaned;
}
export function addWebsitePage(pages:WebsitePage[],name:string,path?:string):WebsitePage[]{
  const pagePath=normalizePagePath(path||name);
  if(pages.some(p=>normalizePagePath(p.path)===pagePath))return pages;
  return [...pages,{name:name.trim()||'Untitled page',path:pagePath,title:name.trim()||'Untitled page',description:'',sections:[],status:'draft'}];
}
export function removeWebsitePage(pages:WebsitePage[],path:string):WebsitePage[]{
  const target=normalizePagePath(path);
  if(target==='/')return pages;
  return pages.filter(p=>normalizePagePath(p.path)!==target);
}


export function ensureWebsiteHomePage<T extends {path?:string;name?:string}>(pages:T[]):T[]{
  const safe=Array.isArray(pages)?pages:[];
  if(safe.some(page=>normalizePagePath(page.path||'/')==='/'))return safe;
  return [{name:'Home',path:'/'} as T,...safe];
}

export function websitePagePathsAreUnique(pages:Array<{path?:string}>):boolean{
  const normalized=(Array.isArray(pages)?pages:[]).map(page=>normalizePagePath(page.path||'/'));
  return new Set(normalized).size===normalized.length;
}


export function normalizeWebsitePageSet<T extends {path?:string;name?:string}>(pages:T[]):T[]{
  const withHome=ensureWebsiteHomePage(Array.isArray(pages)?pages:[]);
  const seen=new Set<string>();
  return withHome.filter(page=>{
    const path=normalizePagePath(page.path||'/');
    if(seen.has(path))return false;
    seen.add(path);
    page.path=path;
    return true;
  });
}
